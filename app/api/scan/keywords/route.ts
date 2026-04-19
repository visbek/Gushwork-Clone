import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SERPER_KEY = process.env.SERPER_API_KEY;

async function serperSearch(query: string): Promise<{ organic: { title: string }[]; peopleAlsoAsk: { question: string }[] }> {
  if (!SERPER_KEY) return { organic: [], peopleAlsoAsk: [] };
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 10 }),
    });
    if (!res.ok) return { organic: [], peopleAlsoAsk: [] };
    const data = await res.json();
    return {
      organic: data.organic ?? [],
      peopleAlsoAsk: data.peopleAlsoAsk ?? [],
    };
  } catch {
    return { organic: [], peopleAlsoAsk: [] };
  }
}

async function redditSearch(industry: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(industry + " supplier")}&sort=relevance&limit=10`,
      { headers: { "User-Agent": "sparrwo/1.0" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.children ?? []).map(
      (c: { data: { title: string } }) => c.data.title
    );
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { domain, industry, companyName, whatTheySell, buyerLocation } =
      await request.json();

    if (!industry || !companyName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Run all 4 searches in parallel
    const [highIntent, comparison, reddit, alternatives] = await Promise.all([
      serperSearch(`${industry} supplier india`),
      serperSearch(`best ${industry} for comparison`),
      redditSearch(industry),
      serperSearch(`${companyName} alternatives ${industry}`),
    ]);

    const allSerperData = [
      "=== HIGH INTENT SEARCH ===",
      highIntent.organic.map((r) => r.title).join("\n"),
      highIntent.peopleAlsoAsk.map((r) => r.question).join("\n"),
      "=== COMPARISON SEARCH ===",
      comparison.organic.map((r) => r.title).join("\n"),
      comparison.peopleAlsoAsk.map((r) => r.question).join("\n"),
      "=== ALTERNATIVES SEARCH ===",
      alternatives.organic.map((r) => r.title).join("\n"),
      alternatives.peopleAlsoAsk.map((r) => r.question).join("\n"),
    ]
      .filter(Boolean)
      .join("\n");

    const redditTitles = reddit.join("\n") || "No Reddit data available";

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a keyword strategist for B2B companies.

Company: ${companyName}
What they sell: ${whatTheySell}
Industry: ${industry}
Target buyer location: ${buyerLocation}
Domain: ${domain}

Real search data from the internet:
${allSerperData}

Reddit buyer questions:
${redditTitles}

Based on this REAL data, generate keyword recommendations in 3 tiers.

IMPORTANT RULES:
- Tier 1 (HIGH INTENT): Must contain supplier/manufacturer/bulk/wholesale/commercial/vendor OR industry+location combination. These directly generate sales pipeline. Example: 'water saving aerator bulk supplier india'

- Tier 2 (MID INTENT): Comparison, ROI, alternatives, best-for queries. These get cited by LLMs and influence decisions. Example: 'best water saving devices for commercial buildings ROI'

- Tier 3 (AWARENESS): Informational, educational, how-to queries. These build authority and top-of-funnel traffic. Example: 'how to reduce water consumption in office building'

For each keyword also provide:
- searchVolume: 'High/Medium/Low' (estimate)
- llmPotential: 'High/Medium/Low' (likelihood of appearing in ChatGPT/Gemini)
- why: one sentence explaining why this keyword matters

Return ONLY valid JSON with no markdown, no code fences:
{
  "tier1": [{ "keyword": "", "searchVolume": "", "llmPotential": "", "why": "" }],
  "tier2": [{ "keyword": "", "searchVolume": "", "llmPotential": "", "why": "" }],
  "tier3": [{ "keyword": "", "searchVolume": "", "llmPotential": "", "why": "" }]
}

Generate 8 keywords per tier. Total 24 keywords. Make them SPECIFIC to this company, not generic.`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    const keywords = JSON.parse(cleaned);

    return NextResponse.json(keywords);
  } catch (err) {
    console.error("[keywords] error:", err);
    return NextResponse.json({ error: "Failed to generate keywords" }, { status: 500 });
  }
}
