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
  { key: "perplexity" as const, label: "Perplexity", color: "#7c3aed" },
] as const;

const CATEGORIES = [
  {
    key: "informational" as Category,
    label: "Informational",
    description: "Buyer learning about the problem",
    badgeStyle: {
      border: "1px solid #1d3a6e",
      color: "#3b82f6",
      background: "#0d1f3c",
    },
  },
  {
    key: "discovery" as Category,
    label: "Discovery",
    description: "Buyer looking for vendors",
    badgeStyle: {
      border: "1px solid #2d1f6e",
      color: "#7c3aed",
      background: "#170d3c",
    },
  },
  {
    key: "commercial" as Category,
    label: "Commercial",
    description: "Buyer comparing options",
    badgeStyle: {
      border: "1px solid #3a2d00",
      color: "#f59e0b",
      background: "#1f1800",
    },
  },
  {
    key: "transactional" as Category,
    label: "Transactional",
    description: "Buyer ready to purchase",
    badgeStyle: {
      border: "1px solid #0d3a1f",
      color: "#22c55e",
      background: "#0d2018",
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
  if (score > 66) return "#22c55e";
  if (score >= 33) return "#f59e0b";
  return "#ef4444";
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
        background: "#0c0c0c",
        border: "1px solid #1f1f1f",
        borderRadius: 8,
        padding: "20px 16px",
        textAlign: "center",
        transition: "border-color 150ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#333333")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1f1f1f")}
    >
      <p
        style={{
          fontFamily: "var(--font-heading, system-ui)",
          fontSize: 13,
          fontWeight: 500,
          color: "#888888",
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
            <span style={{ fontSize: 14, fontWeight: 400, color: "#444444" }}>%</span>
          </p>
          <p style={{ marginTop: 6, fontSize: 11, color: "#444444", fontFamily: "var(--font-mono, monospace)" }}>
            visibility
          </p>
        </>
      ) : (
        <>
          <p style={{ fontSize: 20, opacity: 0.3, marginBottom: 4 }}>🔒</p>
          <p style={{ fontSize: 11, color: "#444444", fontFamily: "var(--font-mono, monospace)" }}>
            Add API key
          </p>
        </>
      )}
    </div>
  );
}

// ── ResultsSection ────────────────────────────────────────────────────────────

interface ResultsSectionProps {
  scanData: ScanData;
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
      style={{ background: "#000000", padding: "32px 16px 80px" }}
    >
      {/* Toast */}
      {showToast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up"
          style={{
            border: "1px solid rgba(124,58,237,0.4)",
            background: "rgba(124,58,237,0.12)",
            color: "#7c3aed",
            borderRadius: 8,
            padding: "12px 20px",
            fontSize: 13,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          Report unlocked! We&apos;ll send you weekly AI updates for this domain.
        </div>
      )}

      <div style={{ maxWidth: 896, margin: "0 auto" }}>

        {/* Score circle */}
        <div style={{ padding: "40px 0 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <ScoreCircle score={scanData.overallScore} active={true} />
          <p
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11,
              color: "#444444",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            AI Visibility Score
          </p>
          <p
            style={{
              fontFamily: "var(--font-heading, system-ui)",
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
              background: "#0c0c0c",
              border: "1px solid #1f1f1f",
              borderRadius: 8,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                color: "#444444",
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
                    background: "#141414",
                    border: "1px solid #1f1f1f",
                    borderRadius: 6,
                    padding: "12px 16px",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 10,
                      color: "#444444",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-heading, system-ui)",
                      fontSize: 13,
                      color: "#ffffff",
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
            border: "1px solid #1f1f1f",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f1f1f", background: "#0c0c0c" }}>
                  <th
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontFamily: "var(--font-heading, system-ui)",
                      fontWeight: 600,
                      fontSize: 12,
                      color: "#888888",
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
                        fontFamily: "var(--font-heading, system-ui)",
                        fontWeight: 600,
                        fontSize: 12,
                        color: "#888888",
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
                      (r) => r.gemini?.appeared || r.claude?.appeared || r.chatgpt?.appeared || r.perplexity?.appeared
                    ).length;

                    if (emailCaptured || rowCount < FREE_ROWS) {
                      elements.push(
                        <tr key={`h-${catMeta.key}`}>
                          <td
                            colSpan={ENGINES.length + 1}
                            style={{ borderBottom: "1px solid #1f1f1f", background: "#000000" }}
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
                                    fontWeight: 700,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {catMeta.label}
                                </span>
                                <span
                                  className="hidden sm:inline"
                                  style={{ fontSize: 12, color: "#444444", fontFamily: "var(--font-mono, monospace)" }}
                                >
                                  {catMeta.description}
                                </span>
                              </div>
                              <span style={{ fontSize: 12, color: "#444444", fontFamily: "var(--font-mono, monospace)" }}>
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
                        const rowBg = rowCount % 2 === 0 ? "#000000" : "#0c0c0c";
                        elements.push(
                          <tr
                            key={`r-${catMeta.key}-${i}`}
                            style={{ borderBottom: "1px solid #0f0f0f", background: rowBg, transition: "background 150ms ease" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#141414")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
                          >
                            <td
                              style={{
                                padding: "16px 20px",
                                fontSize: 13,
                                color: "#888888",
                                lineHeight: 1.55,
                                fontFamily: "var(--font-body, system-ui)",
                              }}
                            >
                              {row.prompt}
                            </td>
                            {ENGINES.map(({ key, label }) => {
                              const eng = scanData.engines?.[key];
                              const res = row[
                                key as keyof Pick<PromptResult, "gemini" | "claude" | "chatgpt" | "perplexity">
                              ] as EngineResult | undefined;
                              return (
                                <td
                                  key={key}
                                  className="hidden sm:table-cell"
                                  style={{ padding: "16px", textAlign: "center", verticalAlign: "middle" }}
                                >
                                  {!eng?.available ? (
                                    <span style={{ color: "#333333", fontSize: 14 }}>🔒</span>
                                  ) : res?.appeared ? (
                                    <span
                                      title={res.snippet || "Appeared"}
                                      style={{
                                        display: "inline-block",
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: "#22c55e",
                                      }}
                                    />
                                  ) : (
                                    <span
                                      style={{
                                        display: "inline-block",
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: "#ef4444",
                                        opacity: 0.6,
                                      }}
                                    />
                                  )}
                                  {/* Mobile label */}
                                  <span
                                    className="sm:hidden block"
                                    style={{
                                      fontSize: 9,
                                      color: "#444444",
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
                                  padding: "40px 32px",
                                  textAlign: "center",
                                  background: "#000000",
                                  boxShadow: "0 0 0 1px #7c3aed, 0 0 30px rgba(124,58,237,0.1)",
                                }}
                              >
                                {/* Lock icon */}
                                <div
                                  style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 8,
                                    border: "1px solid rgba(124,58,237,0.3)",
                                    background: "rgba(124,58,237,0.08)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    margin: "0 auto 16px",
                                  }}
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                </div>

                                <p
                                  style={{
                                    fontFamily: "var(--font-mono, monospace)",
                                    fontSize: 11,
                                    color: "#7c3aed",
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                    marginBottom: 12,
                                  }}
                                >
                                  {hiddenCount} more prompts hidden
                                </p>
                                <h3
                                  style={{
                                    fontFamily: "var(--font-heading, system-ui)",
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
                                    fontSize: 13,
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
                                      onChange={(e) => { onEmailChange(e.target.value); if (emailError) setEmailError(""); }}
                                      onFocus={() => onEmailFocus(true)}
                                      onBlur={() => onEmailFocus(false)}
                                      placeholder=" "
                                      style={{
                                        width: "100%",
                                        background: "#0c0c0c",
                                        border: `1px solid ${emailFocused ? "#7c3aed" : "#1f1f1f"}`,
                                        borderRadius: 8,
                                        padding: emailInput || emailFocused ? "22px 16px 8px" : "14px 16px",
                                        fontSize: 14,
                                        color: "#ffffff",
                                        outline: "none",
                                        fontFamily: "var(--font-body, system-ui)",
                                        transition: "border-color 150ms ease, padding 150ms ease",
                                        boxSizing: "border-box",
                                      }}
                                    />
                                    <label
                                      style={{
                                        position: "absolute",
                                        left: 16,
                                        top: emailInput || emailFocused ? 7 : "50%",
                                        transform: emailInput || emailFocused ? "none" : "translateY(-50%)",
                                        fontSize: emailInput || emailFocused ? 10 : 14,
                                        color: emailFocused ? "#7c3aed" : "#444444",
                                        pointerEvents: "none",
                                        transition: "all 150ms ease",
                                        fontFamily: "var(--font-body, system-ui)",
                                      }}
                                    >
                                      Work email
                                    </label>
                                  </div>
                                  {emailError && (
                                    <p style={{ fontSize: 12, color: "#ef4444", textAlign: "left", marginBottom: 8 }}>
                                      {emailError}
                                    </p>
                                  )}
                                  <button
                                    type="submit"
                                    disabled={emailSubmitting}
                                    style={{
                                      width: "100%",
                                      background: "#7c3aed",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: 8,
                                      padding: "13px",
                                      fontSize: 14,
                                      fontWeight: 600,
                                      fontFamily: "var(--font-heading, system-ui)",
                                      cursor: emailSubmitting ? "not-allowed" : "pointer",
                                      transition: "background 150ms ease",
                                      opacity: emailSubmitting ? 0.6 : 1,
                                    }}
                                    onMouseEnter={(e) => { if (!emailSubmitting) e.currentTarget.style.background = "#6d28d9"; }}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "#7c3aed")}
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
              background: "#0c0c0c",
              border: "1px solid #1f1f1f",
              borderRadius: 8,
              padding: 24,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 10,
                color: "#444444",
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
                  background: "#141414",
                  border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: 6,
                  padding: 16,
                }}
              >
                <p style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, color: "#444444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  Strongest intent
                </p>
                <p style={{ fontFamily: "var(--font-heading, system-ui)", fontWeight: 600, color: "#22c55e", marginBottom: 4 }}>
                  {insights.strongest.label}
                </p>
                <p style={{ fontSize: 12, color: "#888888", fontFamily: "var(--font-mono, monospace)" }}>
                  {insights.strongest.p}% visibility
                </p>
              </div>
              <div
                style={{
                  background: "#141414",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 6,
                  padding: 16,
                }}
              >
                <p style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, color: "#444444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  Biggest gap
                </p>
                <p style={{ fontFamily: "var(--font-heading, system-ui)", fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>
                  {insights.weakest.label}
                </p>
                <p style={{ fontSize: 12, color: "#888888", fontFamily: "var(--font-mono, monospace)" }}>
                  {insights.weakest.p}% — buyers can&apos;t find you
                </p>
              </div>
              <div
                style={{
                  background: "#141414",
                  border: "1px solid #1f1f1f",
                  borderRadius: 6,
                  padding: 16,
                }}
              >
                <p style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, color: "#444444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  Recommendation
                </p>
                <p style={{ fontSize: 12, color: "#888888", lineHeight: 1.6 }}>
                  {RECOMMENDATIONS[insights.weakest.key]}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div
          style={{
            marginTop: 24,
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 8,
            padding: "40px 32px",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-heading, system-ui)",
              fontWeight: 700,
              fontSize: 20,
              color: "#ffffff",
              marginBottom: 8,
            }}
          >
            Want to monitor this daily?
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "#888888",
              maxWidth: 480,
              margin: "0 auto 28px",
              lineHeight: 1.65,
            }}
          >
            Get weekly AI visibility reports, track competitors, and know when your brand disappears
            from AI search — before it costs you pipeline.
          </p>
          <button
            style={{
              background: "#7c3aed",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "13px 32px",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--font-heading, system-ui)",
              cursor: "pointer",
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#6d28d9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#7c3aed")}
          >
            Get Weekly Reports — $49/mo
          </button>
          <p
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "#444444",
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
