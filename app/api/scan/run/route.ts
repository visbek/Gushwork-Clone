import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeDomain(input: string): string {
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .trim();
}

function detectBrand(
  responseText: string,
  companyName: string,
  domain: string
): boolean {
  const text = responseText.toLowerCase();
  const checks = new Set<string>();

  console.log(`  [DETECT] companyName="${companyName}" domain="${domain}" responseLength=${responseText.length}`);

  // Clean company name — remove common corporate suffixes
  const cleanName = companyName
    .toLowerCase()
    .replace(
      /\b(pvt|ltd|inc|llc|private|limited|lifestyle|technologies|tech|solutions|india|group)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  checks.add(cleanName);

  // Split on ANY non-alphanumeric character (dots, hyphens, spaces, etc.)
  // Fixes: "Lovable.dev" → ["lovable", "dev"], "my-app" → ["my", "app"]
  cleanName.split(/[^a-z0-9]+/).forEach((word) => {
    if (word.length >= 3) checks.add(word);
  });

  // Domain root without protocol/www/TLD
  const domainRoot = normalizeDomain(domain).split(".")[0].toLowerCase();
  checks.add(domainRoot);

  // Variations — handle hyphens, spaces, camelCase
  checks.add(domainRoot.replace(/-/g, ""));
  checks.add(cleanName.replace(/\s+/g, ""));
  checks.add(cleanName.replace(/\s+/g, "-"));

  // Filter out anything too short to be meaningful
  const validChecks = [...checks].filter((c) => c.length >= 3);

  console.log(`  [DETECT] Checking for: ${JSON.stringify(validChecks)}`);
  console.log(`  [DETECT] Text (first 500): "${text.slice(0, 500)}"`);

  const found = validChecks.find((check) => text.includes(check));
  if (found) {
    console.log(`  [DETECT] FOUND "${found}"`);
  } else {
    console.log(`  [DETECT] NOT FOUND in ${responseText.length} chars`);
  }

  return !!found;
}

type Category = "informational" | "discovery" | "commercial" | "transactional";

interface BusinessProfile {
  companyName: string;
  whatTheySell: string;
  industry: string;
  geography: string;
  businessModel: string;
}

interface FlatPrompt {
  text: string;
  category: Category;
}

type EngineResult = { appeared: boolean; snippet: string };

function extractSnippet(
  text: string,
  companyName: string,
  domain: string
): string {
  const lower = text.toLowerCase();
  const cleanName = companyName.toLowerCase().replace(/\b(pvt|ltd|inc|llc|private|limited|lifestyle|technologies|tech|solutions|india|group)\b/g, "").trim();
  const domainRoot = normalizeDomain(domain).split(".")[0];

  const searchTerms = [
    cleanName,
    domainRoot,
    cleanName.replace(/\s+/g, ""),
    companyName.toLowerCase(),
  ].filter((v) => v.length >= 3);

  let matchIndex = -1;
  for (const term of searchTerms) {
    const idx = lower.indexOf(term);
    if (idx !== -1) { matchIndex = idx; break; }
  }

  if (matchIndex === -1) return text.slice(0, 200) + (text.length > 200 ? "..." : "");
  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(text.length, matchIndex + 160);
  return (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
}

// ─── Engine query functions (single call, then detectBrand) ──────────────────

async function queryGeminiWithDetection(
  prompt: string,
  companyName: string,
  domain: string,
  apiKey: string
): Promise<EngineResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Gemini error: ${res.status} — ${JSON.stringify(data)}`);
  }
  const responseText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const appeared = detectBrand(responseText, companyName, domain);
  return { appeared, snippet: extractSnippet(responseText, companyName, domain) };
}

async function queryClaudeWithDetection(
  prompt: string,
  companyName: string,
  domain: string,
  apiKey: string
): Promise<EngineResult> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  const responseText =
    message.content[0]?.type === "text" ? message.content[0].text : "";
  const appeared = detectBrand(responseText, companyName, domain);
  return { appeared, snippet: extractSnippet(responseText, companyName, domain) };
}

async function queryOpenAIWithDetection(
  prompt: string,
  companyName: string,
  domain: string,
  apiKey: string
): Promise<EngineResult> {
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
  });
  const responseText = completion.choices[0]?.message?.content ?? "";
  const appeared = detectBrand(responseText, companyName, domain);
  return { appeared, snippet: extractSnippet(responseText, companyName, domain) };
}

async function queryPerplexityWithDetection(
  prompt: string,
  companyName: string,
  domain: string,
  apiKey: string
): Promise<EngineResult> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Perplexity error: ${res.status} — ${body}`);
  }
  const data = await res.json();
  const responseText: string = data.choices[0]?.message?.content ?? "";
  const appeared = detectBrand(responseText, companyName, domain);
  return { appeared, snippet: extractSnippet(responseText, companyName, domain) };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  console.log("[scan/run] Route hit");

  try {
    const body = await request.json();
    const {
      domain: rawDomain,
      businessProfile,
      prompts: promptsByCategory,
    }: {
      domain: string;
      businessProfile: BusinessProfile;
      prompts: Record<Category, string[]>;
    } = body;

    if (!rawDomain || typeof rawDomain !== "string") {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }
    if (!promptsByCategory || typeof promptsByCategory !== "object") {
      return NextResponse.json({ error: "prompts object is required" }, { status: 400 });
    }

    const domain = normalizeDomain(rawDomain);
    const companyName = businessProfile?.companyName?.trim() || domain.split(".")[0];

    console.log(`[scan/run] domain="${domain}" company="${companyName}"`);

    // Flatten prompts: informational → discovery → commercial → transactional
    const CATEGORIES: Category[] = ["informational", "discovery", "commercial", "transactional"];
    const flatPrompts: FlatPrompt[] = [];
    for (const cat of CATEGORIES) {
      const list = promptsByCategory[cat];
      if (Array.isArray(list)) {
        for (const text of list) flatPrompts.push({ text, category: cat });
      }
    }

    if (flatPrompts.length === 0) {
      return NextResponse.json({ error: "prompts must be a non-empty object" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY ?? "";
    const claudeKey = process.env.ANTHROPIC_API_KEY ?? "";
    const openAIKey = process.env.OPENAI_API_KEY ?? "";
    const perplexityKey = process.env.PERPLEXITY_API_KEY ?? "";

    const geminiAvailable = geminiKey.length > 0;
    const claudeAvailable = claudeKey.length > 0;
    const chatgptAvailable = openAIKey.length > 0;
    const perplexityAvailable = perplexityKey.length > 0;

    console.log(
      `[scan/run] Engines — gemini=${geminiAvailable} claude=${claudeAvailable} chatgpt=${chatgptAvailable} perplexity=${perplexityAvailable}`
    );
    console.log(`[scan/run] Running ${flatPrompts.length} prompts across engines in parallel...`);

    const runStaggered = (
      engineName: string,
      available: boolean,
      delayMs: number,
      detectFn: (fp: FlatPrompt) => Promise<EngineResult>
    ): Promise<EngineResult[]> => {
      if (!available) {
        return Promise.resolve(flatPrompts.map(() => ({ appeared: false, snippet: "" })));
      }
      return Promise.all(
        flatPrompts.map((fp: FlatPrompt, i: number) =>
          sleep(i * delayMs).then(async () => {
            console.log(`  [${engineName}] prompt ${i + 1}/${flatPrompts.length}: "${fp.text.slice(0, 60)}..."`);
            try {
              return await detectFn(fp);
            } catch (err) {
              console.error(
                `  [${engineName}] prompt ${i + 1} ERROR:`,
                err instanceof Error ? `${err.name}: ${err.message}` : err
              );
              return { appeared: false, snippet: "" };
            }
          })
        )
      );
    };

    const [geminiResults, claudeResults, chatgptResults, perplexityResults] =
      await Promise.all([
        runStaggered("gemini", geminiAvailable, 200, (fp) =>
          queryGeminiWithDetection(fp.text, companyName, domain, geminiKey)
        ),
        runStaggered("claude", claudeAvailable, 150, (fp) =>
          queryClaudeWithDetection(fp.text, companyName, domain, claudeKey)
        ),
        runStaggered("chatgpt", chatgptAvailable, 100, (fp) =>
          queryOpenAIWithDetection(fp.text, companyName, domain, openAIKey)
        ),
        runStaggered("perplexity", perplexityAvailable, 100, (fp) =>
          queryPerplexityWithDetection(fp.text, companyName, domain, perplexityKey)
        ),
      ]);

    const results = flatPrompts.map((fp: FlatPrompt, i: number) => ({
      prompt: fp.text,
      category: fp.category,
      gemini: geminiResults[i],
      claude: claudeResults[i],
      chatgpt: chatgptResults[i],
      perplexity: perplexityResults[i],
    }));

    const engineAppearances = { gemini: 0, claude: 0, chatgpt: 0, perplexity: 0 };
    for (const r of results) {
      if (r.gemini.appeared) engineAppearances.gemini++;
      if (r.claude.appeared) engineAppearances.claude++;
      if (r.chatgpt.appeared) engineAppearances.chatgpt++;
      if (r.perplexity.appeared) engineAppearances.perplexity++;
    }

    const availableEngineCount = [
      geminiAvailable, claudeAvailable, chatgptAvailable, perplexityAvailable,
    ].filter(Boolean).length;

    const categoryScores: Record<Category, { appeared: number; total: number }> = {
      informational: { appeared: 0, total: 0 },
      discovery: { appeared: 0, total: 0 },
      commercial: { appeared: 0, total: 0 },
      transactional: { appeared: 0, total: 0 },
    };

    for (const r of results) {
      const cat = r.category;
      categoryScores[cat].total += Math.max(availableEngineCount, 1);
      const appearances = (
        [
          [r.gemini, geminiAvailable],
          [r.claude, claudeAvailable],
          [r.chatgpt, chatgptAvailable],
          [r.perplexity, perplexityAvailable],
        ] as [EngineResult, boolean][]
      ).filter(([e, avail]) => avail && e.appeared).length;
      categoryScores[cat].appeared += appearances;
    }

    const total = flatPrompts.length;
    const totalAppearances =
      engineAppearances.gemini +
      engineAppearances.claude +
      engineAppearances.chatgpt +
      engineAppearances.perplexity;
    const maxPossible = total * Math.max(availableEngineCount, 1);
    const overallScore = Math.round((totalAppearances / maxPossible) * 100);

    const engineScore = (count: number) =>
      total > 0 ? Math.round((count / total) * 100) : 0;

    console.log(`[scan/run] Done. appearances=${JSON.stringify(engineAppearances)} overallScore=${overallScore}`);
    console.log(`[scan/run] Category scores: ${JSON.stringify(categoryScores)}`);

    return NextResponse.json({
      overallScore,
      engines: {
        gemini: { score: engineScore(engineAppearances.gemini), available: geminiAvailable },
        claude: { score: engineScore(engineAppearances.claude), available: claudeAvailable },
        chatgpt: { score: engineScore(engineAppearances.chatgpt), available: chatgptAvailable },
        perplexity: { score: engineScore(engineAppearances.perplexity), available: perplexityAvailable },
      },
      categoryScores,
      results,
    });
  } catch (error) {
    console.error(
      "[scan/run] Unexpected top-level error:",
      error instanceof Error ? `${error.name}: ${error.message}\n${error.stack}` : error
    );
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
