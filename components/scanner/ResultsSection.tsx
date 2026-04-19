"use client";

import React, { useState, useEffect, useRef } from "react";
import { ScoreCircle } from "@/components/scanner/ScoreCircle";
import {
  type ScanData,
  type Category,
  type EngineResult,
  type PromptResult,
  type CategoryScore,
} from "@/components/scanner/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const ENGINES = [
  { key: "gemini" as const, label: "Gemini", color: "#4285f4" },
  { key: "claude" as const, label: "Claude", color: "#d97706" },
  { key: "chatgpt" as const, label: "ChatGPT", color: "#10a37f" },
  { key: "perplexity" as const, label: "Perplexity", color: "#f97316" },
] as const;

const CATEGORIES = [
  {
    key: "informational" as Category,
    label: "Informational",
    description: "Buyer learning about the problem",
    badgeStyle: {
      border: "1px solid #bfdbfe",
      color: "#2563eb",
      background: "#eff6ff",
    },
  },
  {
    key: "discovery" as Category,
    label: "Discovery",
    description: "Buyer looking for vendors",
    badgeStyle: {
      border: "1px solid #e9d5ff",
      color: "#7c3aed",
      background: "#faf5ff",
    },
  },
  {
    key: "commercial" as Category,
    label: "Commercial",
    description: "Buyer comparing options",
    badgeStyle: {
      border: "1px solid #fed7aa",
      color: "#f97316",
      background: "#fff7ed",
    },
  },
  {
    key: "transactional" as Category,
    label: "Transactional",
    description: "Buyer ready to purchase",
    badgeStyle: {
      border: "1px solid #bbf7d0",
      color: "#16a34a",
      background: "#f0fdf4",
    },
  },
];

const RECOMMENDATIONS: Record<Category, string> = {
  informational:
    "Create educational content — blog posts, guides, and FAQs that answer how buyers learn about this problem space.",
  discovery:
    "Get listed on product directories, review sites, and comparison pages where buyers first discover vendors.",
  commercial:
    "Build comparison pages and case studies that surface when buyers evaluate options side-by-side.",
  transactional:
    "Optimize your pricing page and product listings for high-intent searches.",
};

// ── Utils ─────────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score > 66) return "#16a34a";
  if (score >= 33) return "#f97316";
  return "#dc2626";
}

function scoreMessage(score: number) {
  if (score > 66) return "Strong AI visibility";
  if (score >= 33) return "Partial AI visibility";
  return "Nearly invisible in AI search";
}

function pct(cs: CategoryScore) {
  if (!cs || cs.total === 0) return 0;
  return Math.round((cs.appeared / cs.total) * 100);
}

function isValidEmail(email: string): boolean {
  const atIdx = email.indexOf("@");
  if (email.length < 5 || atIdx < 1) return false;
  return email.slice(atIdx + 1).includes(".");
}

// ── useCountUp ────────────────────────────────────────────────────────────────

function useCountUp(target: number, active: boolean, duration = 1500) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (!active) { setValue(0); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, active, duration]);

  return value;
}

// ── EngineCard ────────────────────────────────────────────────────────────────

function EngineCard({
  label,
  engine,
  active,
}: {
  label: string;
  engine: { score: number; available: boolean } | undefined;
  active: boolean;
}) {
  const display = useCountUp(engine?.score ?? 0, active && !!engine?.available);
  return (
    <div
      style={{
        background: "#f7f7f5",
        border: "1px solid #e5e5e0",
        borderRadius: 6,
        padding: "20px 16px",
        textAlign: "center",
        transition: "border-color 150ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#d0d0c8")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e5e5e0")}
    >
      <p
        style={{
          fontFamily: "var(--font-sans, system-ui)",
          fontSize: 13,
          fontWeight: 500,
          color: "#555550",
          marginBottom: 12,
        }}
      >
        {label}
      </p>
      {engine?.available ? (
        <>
          <p
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 30,
              fontWeight: 700,
              color: scoreColor(engine.score),
              lineHeight: 1,
            }}
          >
            {display}
            <span style={{ fontSize: 14, fontWeight: 400, color: "#999990" }}>%</span>
          </p>
          <p
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "#999990",
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            visibility
          </p>
        </>
      ) : (
        <>
          <p style={{ fontSize: 20, opacity: 0.4, marginBottom: 4 }}>🔒</p>
          <p
            style={{
              fontSize: 11,
              color: "#999990",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            Add API key
          </p>
        </>
      )}
    </div>
  );
}

// ── Keyword types ─────────────────────────────────────────────────────────────

export interface KeywordItem {
  keyword: string;
  searchVolume: "High" | "Medium" | "Low";
  llmPotential: "High" | "Medium" | "Low";
  why: string;
}

export interface KeywordsData {
  tier1: KeywordItem[];
  tier2: KeywordItem[];
  tier3: KeywordItem[];
}

// ── KeywordCard ───────────────────────────────────────────────────────────────

function KeywordCard({ item, borderColor }: { item: KeywordItem; borderColor: string }) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(item.keyword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const potentialColor =
    item.llmPotential === "High"
      ? { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a" }
      : item.llmPotential === "Medium"
      ? { bg: "#fffbeb", border: "#fde68a", text: "#d97706" }
      : { bg: "#f7f7f5", border: "#e5e5e0", text: "#999990" };

  const volColor =
    item.searchVolume === "High"
      ? { bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb" }
      : item.searchVolume === "Medium"
      ? { bg: "#faf5ff", border: "#e9d5ff", text: "#7c3aed" }
      : { bg: "#f7f7f5", border: "#e5e5e0", text: "#999990" };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#ffffff",
        border: "1px solid #e5e5e0",
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 6,
        padding: "14px 16px",
        transition: "border-color 150ms ease",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <p
          style={{
            fontFamily: "var(--font-sans, system-ui)",
            fontWeight: 600,
            fontSize: 14,
            color: "#0a0a0a",
            lineHeight: 1.4,
            flex: 1,
          }}
        >
          {item.keyword}
        </p>
        {hovered && (
          <button
            onClick={handleCopy}
            style={{
              background: copied ? "#f0fdf4" : "#f7f7f5",
              border: `1px solid ${copied ? "#bbf7d0" : "#e5e5e0"}`,
              borderRadius: 4,
              padding: "3px 10px",
              fontSize: 11,
              fontFamily: "var(--font-mono, monospace)",
              color: copied ? "#16a34a" : "#555550",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono, monospace)",
            letterSpacing: "0.06em",
            padding: "2px 7px",
            borderRadius: 3,
            background: potentialColor.bg,
            border: `1px solid ${potentialColor.border}`,
            color: potentialColor.text,
          }}
        >
          LLM: {item.llmPotential}
        </span>
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-mono, monospace)",
            letterSpacing: "0.06em",
            padding: "2px 7px",
            borderRadius: 3,
            background: volColor.bg,
            border: `1px solid ${volColor.border}`,
            color: volColor.text,
          }}
        >
          Vol: {item.searchVolume}
        </span>
      </div>

      <p
        style={{
          marginTop: 8,
          fontFamily: "var(--font-sans, system-ui)",
          fontSize: 12,
          color: "#999990",
          lineHeight: 1.55,
        }}
      >
        {item.why}
      </p>
    </div>
  );
}

// ── KeywordsSection ───────────────────────────────────────────────────────────

function KeywordsSection({ keywordsData, keywordsLoading }: { keywordsData: KeywordsData | null; keywordsLoading: boolean }) {
  const [activeTab, setActiveTab] = useState<"tier1" | "tier2" | "tier3">("tier1");

  const tabs = [
    { key: "tier1" as const, label: "High Intent", borderColor: "#f97316" },
    { key: "tier2" as const, label: "Mid Intent", borderColor: "#d97706" },
    { key: "tier3" as const, label: "Awareness", borderColor: "#d0d0c8" },
  ];

  const activeItems = keywordsData?.[activeTab] ?? [];
  const activeBorder = tabs.find((t) => t.key === activeTab)!.borderColor;

  return (
    <div style={{ marginTop: 48 }}>
      {/* Section header */}
      <div style={{ marginBottom: 20 }}>
        <p
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            color: "#999990",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Keywords
        </p>
        <h2
          style={{
            fontFamily: "var(--font-sans, system-ui)",
            fontWeight: 700,
            fontSize: 20,
            color: "#0a0a0a",
            letterSpacing: "-0.02em",
            marginBottom: 4,
          }}
        >
          Keywords to Target
        </h2>
        <p style={{ fontFamily: "var(--font-sans, system-ui)", fontSize: 13, color: "#555550" }}>
          Based on real buyer searches — ranked by revenue potential
        </p>
      </div>

      {/* Loading state */}
      {keywordsLoading && (
        <div
          style={{
            background: "#f7f7f5",
            border: "1px solid #e5e5e0",
            borderRadius: 8,
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "2px solid #e5e5e0",
                borderTopColor: "#f97316",
                display: "inline-block",
                animation: "sp-ring-spin 0.8s linear infinite",
              }}
            />
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13, color: "#999990" }}>
              Generating keyword recommendations...
            </span>
          </div>
        </div>
      )}

      {/* Tabs + content */}
      {!keywordsLoading && keywordsData && (
        <>
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 16,
              borderBottom: "1px solid #e5e5e0",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  fontFamily: "var(--font-sans, system-ui)",
                  color: activeTab === tab.key ? "#0a0a0a" : "#999990",
                  cursor: "pointer",
                  borderBottom: activeTab === tab.key ? `2px solid ${tab.borderColor}` : "2px solid transparent",
                  marginBottom: -1,
                  transition: "color 150ms ease",
                }}
              >
                {tab.label}
                <span
                  style={{
                    marginLeft: 6,
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11,
                    color: activeTab === tab.key ? tab.borderColor : "#d0d0c8",
                  }}
                >
                  {keywordsData[tab.key]?.length ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Keyword cards */}
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr" }}>
            {activeItems.map((item, i) => (
              <KeywordCard key={i} item={item} borderColor={activeBorder} />
            ))}
          </div>

          {/* Footer note */}
          <p
            style={{
              marginTop: 20,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11,
              color: "#999990",
              lineHeight: 1.7,
              textAlign: "center",
              padding: "16px 24px",
              background: "#f7f7f5",
              border: "1px solid #e5e5e0",
              borderRadius: 6,
            }}
          >
            Appearing for these keywords in ChatGPT, Gemini &amp; Perplexity drives inbound pipeline.{" "}
            <span style={{ color: "#f97316" }}>sparrwo</span> tracks your visibility for each.
          </p>
        </>
      )}
    </div>
  );
}

// ── ResultsSection ────────────────────────────────────────────────────────────

interface ResultsSectionProps {
  scanData: ScanData;
  keywordsData: KeywordsData | null;
  keywordsLoading: boolean;
  emailCaptured: boolean;
  emailInput: string;
  emailFocused: boolean;
  emailSubmitting: boolean;
  showToast: boolean;
  onEmailChange: (val: string) => void;
  onEmailFocus: (focused: boolean) => void;
  onEmailSubmit: (e: React.FormEvent) => void;
  sectionRef: React.RefObject<HTMLDivElement | null>;
}

export function ResultsSection({
  scanData,
  keywordsData,
  keywordsLoading,
  emailCaptured,
  emailInput,
  emailFocused,
  emailSubmitting,
  showToast,
  onEmailChange,
  onEmailFocus,
  onEmailSubmit,
  sectionRef,
}: ResultsSectionProps) {
  const [emailError, setEmailError] = useState("");

  const insights = scanData.categoryScores
    ? (() => {
        const cats = CATEGORIES.map((c) => ({
          ...c,
          p: pct(scanData.categoryScores?.[c.key] ?? { appeared: 0, total: 0 }),
        }));
        const strongest = cats.reduce((a, b) => (a.p >= b.p ? a : b));
        const weakest = cats.reduce((a, b) => (a.p <= b.p ? a : b));
        return { strongest, weakest };
      })()
    : null;

  return (
    <section
      ref={sectionRef}
      className="animate-fade-in-up"
      style={{
        background: "#ffffff",
        borderTop: "1px solid #e5e5e0",
        padding: "48px 16px 80px",
      }}
    >
      {/* Toast */}
      {showToast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up"
          style={{
            border: "1px solid #fed7aa",
            background: "#fff7ed",
            color: "#f97316",
            borderRadius: 6,
            padding: "12px 20px",
            fontSize: 13,
            fontFamily: "var(--font-mono, monospace)",
            whiteSpace: "nowrap",
          }}
        >
          Report unlocked! We&apos;ll send you weekly AI updates for this domain.
        </div>
      )}

      <div style={{ maxWidth: 896, margin: "0 auto" }}>

        {/* Score circle */}
        <div
          style={{
            padding: "48px 0 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <ScoreCircle score={scanData.overallScore} active={true} />
          <p
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              color: "#999990",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            AI Visibility Score
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans, system-ui)",
              fontSize: 16,
              fontWeight: 600,
              color: scoreColor(scanData.overallScore),
            }}
          >
            {scoreMessage(scanData.overallScore)}
          </p>
        </div>

        {/* ICP card */}
        {scanData.businessProfile && (
          <div
            style={{
              background: "#f7f7f5",
              border: "1px solid #e5e5e0",
              borderRadius: 6,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                color: "#999990",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              ICP Profile Detected
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Company", val: scanData.businessProfile.companyName },
                { label: "What they sell", val: scanData.businessProfile.whatTheySell },
                {
                  label: "Primary buyer",
                  val: `${scanData.icp?.primaryBuyer ?? ""}${
                    scanData.icp?.buyerLocation && scanData.icp.buyerLocation !== "unknown"
                      ? ` · ${scanData.icp.buyerLocation}`
                      : ""
                  }`,
                },
                { label: "Their pain", val: scanData.icp?.buyerPainPoint ?? "" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e5e0",
                    borderRadius: 6,
                    padding: "12px 16px",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 10,
                      color: "#999990",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-sans, system-ui)",
                      fontSize: 13,
                      color: "#0a0a0a",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.val}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engine cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" style={{ marginBottom: 32 }}>
          {ENGINES.map(({ key, label }) => (
            <EngineCard key={key} label={label} engine={scanData.engines?.[key]} active={true} />
          ))}
        </div>

        {/* Results table */}
        <div
          style={{
            border: "1px solid #e5e5e0",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 480,
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #e5e5e0",
                    background: "#f7f7f5",
                  }}
                >
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontFamily: "var(--font-mono, monospace)",
                      fontWeight: 500,
                      fontSize: 10,
                      color: "#999990",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Buyer Prompt
                  </th>
                  {ENGINES.map(({ key, label }) => (
                    <th
                      key={key}
                      className="hidden sm:table-cell"
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        fontFamily: "var(--font-mono, monospace)",
                        fontWeight: 500,
                        fontSize: 10,
                        color: "#999990",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const FREE_ROWS = 4;
                  let rowCount = 0;
                  const allResults = scanData?.results ?? [];
                  const hiddenCount = Math.max(0, allResults.length - FREE_ROWS);
                  const elements: React.ReactNode[] = [];

                  for (const catMeta of CATEGORIES) {
                    const catResults = allResults.filter((r) => r.category === catMeta.key);
                    if (catResults.length === 0) continue;

                    const cs = scanData.categoryScores?.[catMeta.key] ?? { appeared: 0, total: 0 };
                    const catPct = pct(cs);
                    const appearedCount = catResults.filter(
                      (r) =>
                        r.gemini?.appeared ||
                        r.claude?.appeared ||
                        r.chatgpt?.appeared ||
                        r.perplexity?.appeared
                    ).length;

                    if (emailCaptured || rowCount < FREE_ROWS) {
                      elements.push(
                        <tr key={`h-${catMeta.key}`}>
                          <td
                            colSpan={ENGINES.length + 1}
                            style={{
                              borderBottom: "1px solid #e5e5e0",
                              background: "#ffffff",
                            }}
                          >
                            <div
                              style={{
                                padding: "10px 20px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span
                                  style={{
                                    ...catMeta.badgeStyle,
                                    borderRadius: 4,
                                    padding: "2px 8px",
                                    fontSize: 10,
                                    fontFamily: "var(--font-mono, monospace)",
                                    fontWeight: 600,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {catMeta.label}
                                </span>
                                <span
                                  className="hidden sm:inline"
                                  style={{
                                    fontSize: 12,
                                    color: "#999990",
                                    fontFamily: "var(--font-sans, system-ui)",
                                  }}
                                >
                                  {catMeta.description}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "#999990",
                                  fontFamily: "var(--font-mono, monospace)",
                                }}
                              >
                                {appearedCount}/{catResults.length} appeared{" "}
                                <span style={{ color: scoreColor(catPct), fontWeight: 600 }}>
                                  ({catPct}%)
                                </span>
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    for (let i = 0; i < catResults.length; i++) {
                      const row = catResults[i];
                      const visible = emailCaptured || rowCount < FREE_ROWS;

                      if (visible) {
                        const rowBg = rowCount % 2 === 0 ? "#ffffff" : "#f7f7f5";
                        elements.push(
                          <tr
                            key={`r-${catMeta.key}-${i}`}
                            style={{
                              borderBottom: "1px solid #e5e5e0",
                              background: rowBg,
                              transition: "background 150ms ease",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#f0f0ed")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = rowBg)
                            }
                          >
                            <td
                              style={{
                                padding: "16px 20px",
                                fontSize: 13,
                                color: "#555550",
                                lineHeight: 1.55,
                                fontFamily: "var(--font-sans, system-ui)",
                              }}
                            >
                              {row.prompt}
                            </td>
                            {ENGINES.map(({ key, label }) => {
                              const eng = scanData.engines?.[key];
                              const res = row[
                                key as keyof Pick<
                                  PromptResult,
                                  "gemini" | "claude" | "chatgpt" | "perplexity"
                                >
                              ] as EngineResult | undefined;
                              return (
                                <td
                                  key={key}
                                  className="hidden sm:table-cell"
                                  style={{
                                    padding: "16px",
                                    textAlign: "center",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {!eng?.available ? (
                                    <span style={{ color: "#d0d0c8", fontSize: 14 }}>🔒</span>
                                  ) : res?.appeared ? (
                                    <span
                                      title={res.snippet || "Appeared"}
                                      style={{
                                        display: "inline-block",
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: "#16a34a",
                                      }}
                                    />
                                  ) : (
                                    <span
                                      style={{
                                        display: "inline-block",
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: "#dc2626",
                                        opacity: 0.5,
                                      }}
                                    />
                                  )}
                                  <span
                                    className="sm:hidden block"
                                    style={{
                                      fontSize: 9,
                                      color: "#999990",
                                      fontFamily: "var(--font-mono, monospace)",
                                      textTransform: "uppercase",
                                      marginTop: 4,
                                    }}
                                  >
                                    {label}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      }

                      rowCount++;

                      // Email wall after row 4
                      if (rowCount === FREE_ROWS && !emailCaptured && hiddenCount > 0) {
                        elements.push(
                          <tr key="wall">
                            <td colSpan={ENGINES.length + 1} style={{ padding: 0 }}>
                              <div
                                style={{
                                  margin: "20px",
                                  borderRadius: 8,
                                  padding: "48px 32px",
                                  textAlign: "center",
                                  background: "#0a0a0a",
                                }}
                              >
                                {/* Lock icon */}
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 8,
                                    border: "1px solid rgba(249,115,22,0.3)",
                                    background: "rgba(249,115,22,0.08)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    margin: "0 auto 16px",
                                  }}
                                >
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#f97316"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                </div>

                                <p
                                  style={{
                                    fontFamily: "var(--font-mono, monospace)",
                                    fontSize: 11,
                                    color: "#f97316",
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                    marginBottom: 12,
                                  }}
                                >
                                  {hiddenCount} more prompts hidden
                                </p>
                                <h3
                                  style={{
                                    fontFamily: "var(--font-sans, system-ui)",
                                    fontWeight: 700,
                                    fontSize: 20,
                                    color: "#ffffff",
                                    marginBottom: 8,
                                  }}
                                >
                                  Your full AI visibility report is ready
                                </h3>
                                <p
                                  style={{
                                    fontFamily: "var(--font-sans, system-ui)",
                                    fontSize: 14,
                                    color: "#888888",
                                    marginBottom: 28,
                                    maxWidth: 400,
                                    margin: "0 auto 28px",
                                    lineHeight: 1.6,
                                  }}
                                >
                                  See all 24 prompts, intent breakdown, and your biggest gaps — free.
                                </p>

                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!isValidEmail(emailInput.trim())) {
                                      setEmailError("Please enter a valid email address");
                                      return;
                                    }
                                    setEmailError("");
                                    onEmailSubmit(e);
                                  }}
                                  style={{ maxWidth: 360, margin: "0 auto" }}
                                >
                                  <div style={{ position: "relative", marginBottom: 8 }}>
                                    <input
                                      type="email"
                                      required
                                      value={emailInput}
                                      onChange={(e) => {
                                        onEmailChange(e.target.value);
                                        if (emailError) setEmailError("");
                                      }}
                                      onFocus={() => onEmailFocus(true)}
                                      onBlur={() => onEmailFocus(false)}
                                      placeholder=" "
                                      style={{
                                        width: "100%",
                                        background: "#1a1a1a",
                                        border: `1px solid ${emailFocused ? "#f97316" : "#2a2a2a"}`,
                                        borderRadius: 6,
                                        padding:
                                          emailInput || emailFocused
                                            ? "22px 16px 8px"
                                            : "14px 16px",
                                        fontSize: 14,
                                        color: "#ffffff",
                                        outline: "none",
                                        fontFamily: "var(--font-sans, system-ui)",
                                        transition:
                                          "border-color 150ms ease, padding 150ms ease",
                                        boxSizing: "border-box",
                                      }}
                                    />
                                    <label
                                      style={{
                                        position: "absolute",
                                        left: 16,
                                        top:
                                          emailInput || emailFocused ? 7 : "50%",
                                        transform:
                                          emailInput || emailFocused
                                            ? "none"
                                            : "translateY(-50%)",
                                        fontSize:
                                          emailInput || emailFocused ? 10 : 14,
                                        color: emailFocused ? "#f97316" : "#666660",
                                        pointerEvents: "none",
                                        transition: "all 150ms ease",
                                        fontFamily: "var(--font-sans, system-ui)",
                                      }}
                                    >
                                      Work email
                                    </label>
                                  </div>
                                  {emailError && (
                                    <p
                                      style={{
                                        fontSize: 12,
                                        color: "#dc2626",
                                        textAlign: "left",
                                        marginBottom: 8,
                                      }}
                                    >
                                      {emailError}
                                    </p>
                                  )}
                                  <button
                                    type="submit"
                                    disabled={emailSubmitting}
                                    style={{
                                      width: "100%",
                                      background: "#f97316",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: 6,
                                      padding: "13px",
                                      fontSize: 14,
                                      fontWeight: 600,
                                      fontFamily: "var(--font-sans, system-ui)",
                                      cursor: emailSubmitting ? "not-allowed" : "pointer",
                                      transition: "background 150ms ease",
                                      opacity: emailSubmitting ? 0.6 : 1,
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!emailSubmitting)
                                        e.currentTarget.style.background = "#ea6c00";
                                    }}
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.background = "#f97316")
                                    }
                                  >
                                    {emailSubmitting ? "Unlocking..." : "Get My Full Report →"}
                                  </button>
                                </form>
                                <p
                                  style={{
                                    marginTop: 12,
                                    fontSize: 11,
                                    color: "#444444",
                                    fontFamily: "var(--font-mono, monospace)",
                                  }}
                                >
                                  No spam. Unsubscribe anytime.
                                </p>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    }
                  }

                  return elements;
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights */}
        {insights && (
          <div
            style={{
              marginTop: 24,
              background: "#f7f7f5",
              border: "1px solid #e5e5e0",
              borderRadius: 6,
              padding: 24,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                color: "#999990",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Insights
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e5e0",
                  borderRadius: 6,
                  padding: 16,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10,
                    color: "#999990",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 6,
                  }}
                >
                  Strongest intent
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-sans, system-ui)",
                    fontWeight: 600,
                    color: "#16a34a",
                    marginBottom: 4,
                  }}
                >
                  {insights.strongest.label}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "#999990",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {insights.strongest.p}% visibility
                </p>
              </div>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e5e0",
                  borderRadius: 6,
                  padding: 16,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10,
                    color: "#999990",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 6,
                  }}
                >
                  Biggest gap
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-sans, system-ui)",
                    fontWeight: 600,
                    color: "#dc2626",
                    marginBottom: 4,
                  }}
                >
                  {insights.weakest.label}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "#999990",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {insights.weakest.p}% — buyers can&apos;t find you
                </p>
              </div>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e5e0",
                  borderRadius: 6,
                  padding: 16,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10,
                    color: "#999990",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 6,
                  }}
                >
                  Recommendation
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-sans, system-ui)",
                    fontSize: 13,
                    color: "#555550",
                    lineHeight: 1.6,
                  }}
                >
                  {RECOMMENDATIONS[insights.weakest.key]}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Keywords section */}
        <KeywordsSection keywordsData={keywordsData} keywordsLoading={keywordsLoading} />

        {/* Bottom CTA */}
        <div
          style={{
            marginTop: 24,
            background: "#f7f7f5",
            border: "1px solid #e5e5e0",
            borderRadius: 6,
            padding: "40px 32px",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-sans, system-ui)",
              fontWeight: 700,
              fontSize: 20,
              color: "#0a0a0a",
              marginBottom: 8,
            }}
          >
            Want to monitor this daily?
          </h3>
          <p
            style={{
              fontFamily: "var(--font-sans, system-ui)",
              fontSize: 14,
              color: "#555550",
              maxWidth: 480,
              margin: "0 auto 28px",
              lineHeight: 1.65,
            }}
          >
            Get weekly AI visibility reports, track competitors, and know when your brand
            disappears from AI search — before it costs you pipeline.
          </p>
          <button
            style={{
              background: "#f97316",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              padding: "13px 32px",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--font-sans, system-ui)",
              cursor: "pointer",
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#ea6c00")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f97316")}
          >
            Get Weekly Reports — $49/mo
          </button>
          <p
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "#999990",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            Cancel anytime. 7-day free trial included.
          </p>
        </div>
      </div>
    </section>
  );
}
