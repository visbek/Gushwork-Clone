import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResearchData {
  peopleAlsoAsk: string[];
  redditTitles: string[];
  youtubeTitles: string[];
  quoraTitles: string[];
}

// ─── Individual fetchers (each fails independently) ───────────────────────────

async function fetchPeopleAlsoAsk(industry: string): Promise<string[]> {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: `${industry} software`, gl: "us", num: 10 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`[research] PAA fetch failed: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    const questions: string[] = (data.peopleAlsoAsk ?? []).map(
      (item: { question?: string }) => item.question ?? ""
    );
    console.log(`[research] PAA: ${questions.length} questions`);
    return questions.filter(Boolean);
  } catch (err) {
    console.log("[research] PAA error:", err instanceof Error ? err.message : err);
    return [];
  }
}

async function fetchQuoraTitles(industry: string, companyName: string): Promise<string[]> {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `site:quora.com ${industry} ${companyName}`,
        gl: "us",
        num: 10,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`[research] Quora fetch failed: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    const titles: string[] = (data.organic ?? []).map((item: { title?: string }) =>
      (item.title ?? "")
        .replace(/\s*-\s*Quora$/i, "")
        .replace(/^Quora:\s*/i, "")
        .trim()
    );
    console.log(`[research] Quora: ${titles.length} titles`);
    return titles.filter(Boolean);
  } catch (err) {
    console.log("[research] Quora error:", err instanceof Error ? err.message : err);
    return [];
  }
}

async function fetchYoutubeTitles(industry: string): Promise<string[]> {
  try {
    const res = await fetch("https://google.serper.dev/videos", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: `${industry} review comparison` }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`[research] YouTube fetch failed: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    const titles: string[] = (data.videos ?? []).map(
      (item: { title?: string }) => item.title ?? ""
    );
    console.log(`[research] YouTube: ${titles.length} titles`);
    return titles.filter(Boolean);
  } catch (err) {
    console.log("[research] YouTube error:", err instanceof Error ? err.message : err);
    return [];
  }
}

async function fetchRedditTitles(industry: string): Promise<string[]> {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(industry)}&sort=relevance&limit=10`;
    const res = await fetch(url, {
      headers: { "User-Agent": "sparrwo/1.0 research tool" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`[research] Reddit fetch failed: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    const titles: string[] = (data?.data?.children ?? []).map(
      (child: { data?: { title?: string } }) => child.data?.title ?? ""
    );
    console.log(`[research] Reddit: ${titles.length} titles`);
    return titles.filter(Boolean);
  } catch (err) {
    console.log("[research] Reddit error:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ─── Core logic (exported for direct import) ─────────────────────────────────

export async function fetchResearchData(
  industry: string,
  companyName: string
): Promise<ResearchData> {
  console.log(`[research] Fetching for industry="${industry}" company="${companyName}"`);

  const [peopleAlsoAsk, quoraTitles, youtubeTitles, redditTitles] = await Promise.all([
    fetchPeopleAlsoAsk(industry),
    fetchQuoraTitles(industry, companyName),
    fetchYoutubeTitles(industry),
    fetchRedditTitles(industry),
  ]);

  return { peopleAlsoAsk, redditTitles, youtubeTitles, quoraTitles };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { industry, companyName } = body;

    if (!industry || typeof industry !== "string") {
      return NextResponse.json({ error: "industry is required" }, { status: 400 });
    }

    const result = await fetchResearchData(
      industry,
      typeof companyName === "string" ? companyName : ""
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[research] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
