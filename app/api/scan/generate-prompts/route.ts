import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { fetchResearchData } from "../research/route";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Domain normalization ────────────────────────────────────────────────────

function normalizeDomain(input: string): string {
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .trim();
}

// ─── IP rate limiting ─────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true; // allowed
  }
  if (entry.count >= RATE_LIMIT_MAX) return false; // blocked
  entry.count++;
  return true; // allowed
}

// ─── 24-hour in-memory prompt cache + pending request lock ──────────────────

interface CachedResult {
  data: unknown;
  timestamp: number;
}

const promptCache = new Map<string, CachedResult>();
const pendingRequests = new Map<string, Promise<unknown>>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cleanCompanyName(name: string): string {
  return name
    .replace(/\s+by\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/g, "")
    .replace(/\s*[-–]\s*.+$/, "")
    .trim();
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

// ─── Brand variation extraction ──────────────────────────────────────────────

function extractBrandVariations(html: string, domain: string): string[] {
  const sources = new Set<string>();

  // 1. og:site_name (most reliable — set explicitly by site owners)
  const ogSite =
    html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/i) ??
    html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:site_name"/i);
  if (ogSite) sources.add(ogSite[1]);

  // 2. og:title — take only the part before any separator
  const ogTitle =
    html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) ??
    html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:title"/i);
  if (ogTitle) sources.add(ogTitle[1].split(/[|\-–:]/)[0].trim());

  // 3. <title> tag — same trimming
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleTag) sources.add(titleTag[1].split(/[|\-–:]/)[0].trim());

  // 4. application-name meta
  const appName =
    html.match(/<meta[^>]*name="application-name"[^>]*content="([^"]+)"/i) ??
    html.match(/<meta[^>]*content="([^"]+)"[^>]*name="application-name"/i);
  if (appName) sources.add(appName[1]);

  // 5. twitter:site handle (strip leading @)
  const twitter =
    html.match(/<meta[^>]*name="twitter:site"[^>]*content="@?([^"]+)"/i) ??
    html.match(/<meta[^>]*content="@?([^"]+)"[^>]*name="twitter:site"/i);
  if (twitter) sources.add(twitter[1].replace("@", ""));

  // 6. Domain root — always included as final fallback
  const domainRoot = domain
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .split(".")[0];
  sources.add(domainRoot);

  // Expand each source into all its variations
  const allVariations = new Set<string>();

  sources.forEach((v) => {
    const clean = v.trim();
    if (!clean || clean.length < 2) return;

    // Full lowercased name: "clevertap", "boat lifestyle"
    allVariations.add(clean.toLowerCase());

    // Split camelCase: "CleverTap" → ["clever", "tap"]
    clean
      .replace(/([A-Z])/g, " $1")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .forEach((w) => allVariations.add(w));

    // Remove spaces: "Clever Tap" → "clevertap"
    allVariations.add(clean.toLowerCase().replace(/\s+/g, ""));

    // Replace spaces with hyphen: "clever-tap"
    allVariations.add(clean.toLowerCase().replace(/\s+/g, "-"));

    // Strip all non-alphanumeric: "bo@t" → "bot"
    allVariations.add(clean.toLowerCase().replace(/[^a-z0-9]/g, ""));
  });

  return [...allVariations].filter((v) => v.length >= 3);
}

interface WebsiteData {
  url: string;
  title: string;
  metaDescription: string;
  h1s: string[];
  bodyText: string;
  brandVariations: string[];
}

async function tryFetch(url: string): Promise<string | null> {
  try {
    console.log(`[generate-prompts] Trying: ${url}`);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) {
      console.log(`[generate-prompts] ${url} returned status ${response.status}`);
      return null;
    }
    const html = await response.text();
    console.log(`[generate-prompts] ${url} fetched OK, html length: ${html.length}`);
    return html;
  } catch (err) {
    console.log(
      `[generate-prompts] ${url} fetch failed:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

async function getWebsiteData(domain: string): Promise<WebsiteData | null> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const urlsToTry = [
    `https://${cleanDomain}`,
    `http://${cleanDomain}`,
    `https://www.${cleanDomain}`,
  ];

  let html: string | null = null;
  let successUrl = "";

  for (const url of urlsToTry) {
    html = await tryFetch(url);
    if (html) {
      successUrl = url;
      break;
    }
  }

  if (!html) {
    console.log(`[generate-prompts] All URL attempts failed for domain: ${domain}`);
    return null;
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  const metaMatch =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  const metaDescription = metaMatch ? metaMatch[1].trim() : "";

  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1s = h1Matches
    .map((m) => m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())
    .filter((h) => h.length > 0)
    .slice(0, 5);

  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);

  const brandVariations = extractBrandVariations(html, domain);

  console.log(`[generate-prompts] Extracted from ${successUrl}:`);
  console.log(`  title: "${title}"`);
  console.log(`  metaDescription: "${metaDescription.slice(0, 150)}"`);
  console.log(`  h1s: ${JSON.stringify(h1s)}`);
  console.log(`  brandVariations: ${JSON.stringify(brandVariations)}`);
  console.log(`  bodyText (first 200): "${bodyText.slice(0, 200)}"`);

  return { url: successUrl, title, metaDescription, h1s, bodyText, brandVariations };
}

// ─── Core generation logic (extracted for dedup lock) ────────────────────────

async function generatePromptsForDomain(domain: string): Promise<unknown> {
  console.log(`[generate-prompts] MISS for: ${domain}`);

  const websiteData = await getWebsiteData(domain);

  // Derive search terms from available website data (before Claude runs)
  const industryHint = websiteData
    ? (websiteData.title.split(/[|\-–]/).slice(1).join(" ").trim() ||
       websiteData.metaDescription.slice(0, 60))
    : domain;
  const companyHint = websiteData?.brandVariations[0] ?? domain.split(".")[0];

  // Fetch real internet data in parallel with no blocking on failure
  const researchData = await fetchResearchData(industryHint, companyHint);

  const hasResearch =
    researchData.redditTitles.length > 0 ||
    researchData.peopleAlsoAsk.length > 0 ||
    researchData.youtubeTitles.length > 0 ||
    researchData.quoraTitles.length > 0;

  const researchBlock = hasResearch
    ? `
REAL DATA from the internet about this industry:

Reddit discussions (real buyer questions):
${researchData.redditTitles.slice(0, 5).join("\n")}

Google People Also Ask (real searches):
${researchData.peopleAlsoAsk.slice(0, 5).join("\n")}

YouTube searches (real queries):
${researchData.youtubeTitles.slice(0, 5).join("\n")}

Quora questions (real buyer questions):
${researchData.quoraTitles.slice(0, 5).join("\n")}

Use the REAL DATA above as inspiration for how real buyers actually talk and search. Make the prompts sound exactly like real people — not marketing language.
`
    : "";

  let claudePrompt: string;
  if (websiteData) {
    claudePrompt = `You are generating search prompts for an AI visibility scanner.
${researchBlock}
Analyze this website and return a detailed JSON object. Read every field carefully — use the actual website content, not guesses.

Website title: ${websiteData.title || "(not found)"}
Meta description: ${websiteData.metaDescription || "(not found)"}
H1 tags: ${websiteData.h1s.length > 0 ? websiteData.h1s.join(" | ") : "(not found)"}
Content: ${websiteData.bodyText}
Domain: ${domain}

Return ONLY this JSON structure, no markdown, no explanation:

{
  "businessProfile": {
    "companyName": "exact company name from the website",
    "whatTheySell": "specific products/services in 1 sentence",
    "industry": "specific industry (not generic)",
    "geography": "where they operate or sell (city, country, or global)",
    "businessModel": "B2B or B2C or both"
  },
  "icp": {
    "primaryBuyer": "job title or type of person who buys this",
    "buyerLocation": "city/country/region where buyers are",
    "buyerCompanySize": "individual or SMB or enterprise",
    "buyerPainPoint": "the specific problem buyers are solving",
    "buyerContext": "what situation or trigger makes them search for this"
  },
  "prompts": {
    "informational": [
      "prompt 1",
      "prompt 2",
      "prompt 3",
      "prompt 4",
      "prompt 5",
      "prompt 6"
    ],
    "discovery": [
      "prompt 1",
      "prompt 2",
      "prompt 3",
      "prompt 4",
      "prompt 5",
      "prompt 6"
    ],
    "commercial": [
      "prompt 1",
      "prompt 2",
      "prompt 3",
      "prompt 4",
      "prompt 5",
      "prompt 6"
    ],
    "transactional": [
      "prompt 1",
      "prompt 2",
      "prompt 3",
      "prompt 4",
      "prompt 5",
      "prompt 6"
    ]
  }
}

Rules for prompts:
- informational: 6 prompts where the ICP is learning about the category/problem (not looking for vendors yet). Example: "What are the best ways to reduce water consumption in a large office building in Bangalore?"
- discovery: 6 prompts where the ICP is actively looking for solutions or vendors. Example: "Which companies in India provide certified compostable packaging for food brands?"
- commercial: 6 prompts where the ICP is comparing options before buying. Example: "Compare water saving aerators available in India - which brands are most reliable?"
- transactional: 6 prompts where the ICP is ready to buy right now. Example: "Where can I buy bulk compostable bags for my restaurant in Bangalore with fast delivery?"

For ALL prompts:
- Write them exactly how a real person types into ChatGPT or Gemini — long, conversational, specific
- Include geography when relevant to this business
- Include the buyer role or context when it makes the prompt more realistic
- Make every prompt specific to THIS business category, not generic filler
- Do NOT use the company name in any prompt (we test organic appearance)
- IMPORTANT: Do NOT include any year (2024, 2025, 2026) in the prompts. Write timeless prompts that work regardless of year. Instead of "best protein powder India 2024" write "best protein powder India right now" or just "best protein powder India"
- Each array must have exactly 6 prompts
- For DISCOVERY and TRANSACTIONAL prompts: at least 3 of the 6 must be hyper-specific to THIS company's exact products — specific enough that this brand would appear in the answer. Include 2-3 branded/navigational queries where someone is specifically searching for this brand by name, product line, or founder. Examples: "SuperYou protein wafers where to buy India", "Ranveer Singh protein snack brand review", "boAt wireless neckband under 2000 gym". These branded queries must NOT mention the company name in generic category framing — they should read like a real person who already knows the brand and is searching for it directly`;
  } else {
    console.log(`[generate-prompts] Website fetch failed — falling back to domain-only prompt`);
    claudePrompt = `You are generating search prompts for an AI visibility scanner.
${researchBlock}
Given the domain "${domain}", infer what this company does and return this JSON structure.

Return ONLY this JSON, no markdown, no explanation:

{
  "businessProfile": {
    "companyName": "likely company name from the domain",
    "whatTheySell": "inferred products/services",
    "industry": "inferred industry",
    "geography": "unknown",
    "businessModel": "B2B or B2C"
  },
  "icp": {
    "primaryBuyer": "likely buyer persona",
    "buyerLocation": "unknown",
    "buyerCompanySize": "unknown",
    "buyerPainPoint": "likely pain point",
    "buyerContext": "likely buying context"
  },
  "prompts": {
    "informational": ["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5", "prompt 6"],
    "discovery": ["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5", "prompt 6"],
    "commercial": ["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5", "prompt 6"],
    "transactional": ["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5", "prompt 6"]
  }
}

informational: buyer learning about the category. discovery: buyer looking for vendors. commercial: buyer comparing options. transactional: buyer ready to purchase.
Write all 24 prompts as long, conversational questions a real person would type into ChatGPT. Do NOT use the company name in generic category prompts, but DO include 2-3 branded/navigational queries in discovery and transactional where someone is searching for this brand specifically (by name or product).`;
  }

  console.log("[generate-prompts] Calling Claude for ICP analysis + 24 prompts...");

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 3000,
    messages: [{ role: "user", content: claudePrompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error(`Unexpected response type from Claude: ${content.type}`);
  }

  const rawText = content.text;
  console.log("[generate-prompts] Claude raw response (first 400 chars):", rawText.slice(0, 400));

  const cleaned = stripCodeFences(rawText);
  const parsed = JSON.parse(cleaned);

  // Clean companyName: strip "by [Person Name]" and "- tagline" patterns
  if (parsed?.businessProfile?.companyName) {
    const original = parsed.businessProfile.companyName;
    parsed.businessProfile.companyName = cleanCompanyName(original);
    if (parsed.businessProfile.companyName !== original) {
      console.log(`[generate-prompts] Cleaned companyName: "${original}" → "${parsed.businessProfile.companyName}"`);
    }
  }

  // Attach brand variations — from HTML extraction if available, else domain-only fallback
  parsed.brandVariations =
    websiteData?.brandVariations?.length
      ? websiteData.brandVariations
      : extractBrandVariations("", domain);

  console.log(`[generate-prompts] brandVariations: ${JSON.stringify(parsed.brandVariations)}`);
  console.log("[generate-prompts] Parsed OK");
  console.log("  businessProfile:", JSON.stringify(parsed.businessProfile));
  console.log("  icp:", JSON.stringify(parsed.icp));
  console.log("  informational prompts:", parsed.prompts?.informational?.length);
  console.log("  discovery prompts:", parsed.prompts?.discovery?.length);
  console.log("  commercial prompts:", parsed.prompts?.commercial?.length);
  console.log("  transactional prompts:", parsed.prompts?.transactional?.length);

  return parsed;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  console.log("[generate-prompts] Route hit");

  // ── IP rate limit check ──────────────────────────────────────────────────
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    console.log(`[generate-prompts] Rate limit exceeded for IP: ${ip}`);
    return NextResponse.json(
      {
        error: "rate_limit",
        message:
          "You have used your 3 free scans for today. Upgrade to scan unlimited domains.",
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { domain } = body;

    console.log(`[generate-prompts] Domain received: "${domain}"`);

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    const normalizedDomain = normalizeDomain(domain);
    console.log(`[generate-prompts] Normalized domain: "${normalizedDomain}"`);

    // Cache-bust if ?nocache=true
    const nocache = request.nextUrl.searchParams.get("nocache");
    if (nocache === "true") {
      promptCache.delete(normalizedDomain);
      console.log(`[generate-prompts] Cache cleared for "${normalizedDomain}" (nocache=true)`);
    }

    // Return cached result if exists and fresh
    const cached = promptCache.get(normalizedDomain);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      const ageMin = Math.round((Date.now() - cached.timestamp) / 60000);
      console.log(`[generate-prompts] Cache HIT for "${normalizedDomain}" (${ageMin}m old)`);
      return NextResponse.json(cached.data);
    }

    // If same domain already being fetched, wait for it (dedup lock)
    if (pendingRequests.has(normalizedDomain)) {
      console.log(`[generate-prompts] PENDING for: ${normalizedDomain}`);
      const result = await pendingRequests.get(normalizedDomain);
      return NextResponse.json(result);
    }

    // Start new fetch and register it as pending
    const fetchPromise = generatePromptsForDomain(normalizedDomain);
    pendingRequests.set(normalizedDomain, fetchPromise);

    try {
      const result = await fetchPromise;
      promptCache.set(normalizedDomain, { data: result, timestamp: Date.now() });
      console.log(`[generate-prompts] Cached result for "${normalizedDomain}" (valid for 24h)`);
      return NextResponse.json(result);
    } finally {
      pendingRequests.delete(normalizedDomain);
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("[generate-prompts] JSON.parse failed:", error.message);
      return NextResponse.json(
        { error: "Failed to parse Claude response as JSON" },
        { status: 500 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[generate-prompts] Anthropic API error — status=${error.status} message=${error.message}`);
      return NextResponse.json(
        { error: `Anthropic API error: ${error.message}` },
        { status: error.status ?? 500 }
      );
    }
    console.error("[generate-prompts] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
