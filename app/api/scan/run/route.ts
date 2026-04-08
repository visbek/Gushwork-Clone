import Anthropic from "@anthropic-ai/sdk";
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

function detectBrand(responseText: string, brandVariations: string[]): boolean {
  // Normalize response: strip everything except letters and numbers
  const normalizedResponse = responseText.toLowerCase().replace(/[^a-z0-9]/g, "");

  const found = brandVariations.find((variation) => {
    if (!variation || variation.length < 3) return false;
    const normalizedVariation = variation.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedVariation.length < 3) return false;
    return normalizedResponse.includes(normalizedVariation);
  });

  console.log("[DETECT]", found ? `FOUND: ${found}` : `NOT FOUND. Checked: ${brandVariations.join(", ")}`);

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

function extractSnippet(text: string, brandVariations: string[]): string {
  // Find match position by mapping stripped index back to original text
  const rawLower = text.toLowerCase();
  const stripped = rawLower.replace(/[^a-z0-9]/g, "");

  let matchIndex = -1;
  for (const v of brandVariations) {
    const normalizedVariation = v.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedVariation.length < 3) continue;
    const strippedIdx = stripped.indexOf(normalizedVariation);
    if (strippedIdx === -1) continue;
    // Map stripped index back to original text position
    let count = 0;
    for (let i = 0; i < rawLower.length; i++) {
      if (/[a-z0-9]/.test(rawLower[i])) count++;
      if (count > strippedIdx) { matchIndex = i; break; }
    }
    break;
  }

  if (matchIndex === -1) return text.slice(0, 200) + (text.length > 200 ? "..." : "");
  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(text.length, matchIndex + 160);
  return (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
}

// ─── Engine query functions (single call, then detectBrand) ──────────────────

async function queryGeminiWithDetection(
  prompt: string,
  brandVariations: string[],
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
  return { appeared: detectBrand(responseText, brandVariations), snippet: extractSnippet(responseText, brandVariations) };
}

async function queryClaudeWithDetection(
  prompt: string,
  brandVariations: string[],
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
  return { appeared: detectBrand(responseText, brandVariations), snippet: extractSnippet(responseText, brandVariations) };
}

async function queryOpenAIWithDetection(
  prompt: string,
  brandVariations: string[],
  apiKey: string
): Promise<EngineResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI error: ${res.status} — ${body}`);
  }
  const data = await res.json();
  const responseText: string = data.choices?.[0]?.message?.content ?? "";
  return { appeared: detectBrand(responseText, brandVariations), snippet: extractSnippet(responseText, brandVariations) };
}

async function queryPerplexityWithDetection(
  prompt: string,
  brandVariations: string[],
  apiKey: string
): Promise<EngineResult> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Perplexity error: ${res.status} — ${body}`);
  }
  const data = await res.json();
  const responseText: string = data.choices[0]?.message?.content ?? "";
  return { appeared: detectBrand(responseText, brandVariations), snippet: extractSnippet(responseText, brandVariations) };
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
      brandVariations: rawBrandVariations,
    }: {
      domain: string;
      businessProfile: BusinessProfile;
      prompts: Record<Category, string[]>;
      brandVariations?: string[];
    } = body;

    if (!rawDomain || typeof rawDomain !== "string") {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }
    if (!promptsByCategory || typeof promptsByCategory !== "object") {
      return NextResponse.json({ error: "prompts object is required" }, { status: 400 });
    }

    const domain = normalizeDomain(rawDomain);
    const companyName = businessProfile?.companyName?.trim() || domain.split(".")[0];

    // Use brand variations from generate-prompts; fallback to domain root if missing
    const domainRoot = domain.split(".")[0];
    const brandVariations: string[] =
      Array.isArray(rawBrandVariations) && rawBrandVariations.length > 0
        ? rawBrandVariations
        : [
            domainRoot,
            domainRoot.replace(/-/g, ""),
            companyName.toLowerCase(),
            companyName.toLowerCase().replace(/\s+/g, ""),
          ].filter((v) => v.length >= 3);

    console.log(`[scan/run] domain="${domain}" company="${companyName}"`);
    console.log(`[scan/run] brandVariations: ${JSON.stringify(brandVariations)}`);

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

    const runParallel = (
      engineName: string,
      available: boolean,
      detectFn: (fp: FlatPrompt) => Promise<EngineResult>,
      staggerMs = 50
    ): Promise<EngineResult[]> => {
      if (!available) {
        return Promise.resolve(flatPrompts.map(() => ({ appeared: false, snippet: "" })));
      }
      return Promise.allSettled(
        flatPrompts.map((fp: FlatPrompt, i: number) =>
          sleep(i * staggerMs).then(() => {
            console.log(`  [${engineName}] prompt ${i + 1}/${flatPrompts.length}: "${fp.text.slice(0, 60)}..."`);
            return detectFn(fp);
          })
        )
      ).then((settled) =>
        settled.map((r, i) => {
          if (r.status === "fulfilled") return r.value;
          console.error(
            `  [${engineName}] prompt ${i + 1} ERROR:`,
            r.reason instanceof Error ? `${r.reason.name}: ${r.reason.message}` : r.reason
          );
          return { appeared: false, snippet: "" };
        })
      );
    };

    const [geminiResults, claudeResults, chatgptResults, perplexityResults] =
      await Promise.all([
        runParallel("gemini", geminiAvailable, (fp) =>
          queryGeminiWithDetection(fp.text, brandVariations, geminiKey)
        ),
        runParallel("claude", claudeAvailable, (fp) =>
          queryClaudeWithDetection(fp.text, brandVariations, claudeKey),
          300
        ),
        runParallel("chatgpt", chatgptAvailable, (fp) =>
          queryOpenAIWithDetection(fp.text, brandVariations, openAIKey)
        ),
        runParallel("perplexity", perplexityAvailable, (fp) =>
          queryPerplexityWithDetection(fp.text, brandVariations, perplexityKey)
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
