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

// ── Constants ──────────────────────────────────────────────────────────────────

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
    badge: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    headerBg: "#1a2030",
    headerBorder: "border-b border-blue-500/15",
  },
  {
    key: "discovery" as Category,
    label: "Discovery",
    description: "Buyer looking for vendors",
    badge: "bg-violet-500/15 text-violet-400 border border-violet-500/25",
    headerBg: "#1e1a30",
    headerBorder: "border-b border-violet-500/15",
  },
  {
    key: "commercial" as Category,
    label: "Commercial",
    description: "Buyer comparing options",
    badge: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    headerBg: "#201e10",
    headerBorder: "border-b border-amber-500/15",
  },
  {
    key: "transactional" as Category,
    label: "Transactional",
    description: "Buyer ready to purchase",
    badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    headerBg: "#0f201a",
    headerBorder: "border-b border-emerald-500/15",
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

// ── Utils ──────────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score > 66) return "#10b981";
  if (score >= 33) return "#f59e0b";
  return "#ef4444";
}

function scoreTextClass(score: number) {
  if (score > 66) return "text-emerald-400";
  if (score >= 33) return "text-amber-400";
  return "text-red-400";
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

// ── useCountUp ─────────────────────────────────────────────────────────────────

function useCountUp(target: number, active: boolean, duration = 1500) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
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

// ── EngineCard ─────────────────────────────────────────────────────────────────

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
      className="rounded-2xl border p-5 text-center transition-all hover:border-[#2a2a2a] hover:-translate-y-0.5"
      style={{ background: "#111", borderColor: "#222" }}
    >
      <p className="text-sm font-semibold text-gray-300 mb-3">{label}</p>
      {engine?.available ? (
        <>
          <p
            className="text-3xl font-extrabold"
            style={{
              color: scoreColor(engine.score),
              fontFamily: "var(--font-geist-sans)",
            }}
          >
            {display}
            <span className="text-base font-normal" style={{ color: "#444" }}>
              %
            </span>
          </p>
          <p className="mt-1 text-xs" style={{ color: "#555" }}>
            visibility
          </p>
        </>
      ) : (
        <>
          <p
            className="text-2xl mb-1"
            style={{ filter: "grayscale(1)", opacity: 0.4 }}
          >
            🔒
          </p>
          <p className="text-xs" style={{ color: "#555" }}>
            Add API key
          </p>
        </>
      )}
    </div>
  );
}

// ── ResultsSection ─────────────────────────────────────────────────────────────

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

function isValidEmail(email: string): boolean {
  const atIdx = email.indexOf("@");
  if (email.length < 5) return false;
  if (atIdx < 1) return false;
  const afterAt = email.slice(atIdx + 1);
  return afterAt.includes(".");
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
  const scoreActive = true;
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
      className="px-6 pb-24 pt-8 animate-fade-in-up"
    >
      {/* Toast */}
      {showToast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl border px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-md animate-fade-in-up"
          style={{
            borderColor: "#00D4AA35",
            background: "rgba(0,212,170,0.08)",
            color: "#00D4AA",
            boxShadow: "0 0 40px rgba(0,212,170,0.15)",
          }}
        >
          Report unlocked! We&apos;ll send you weekly AI updates for this domain.
        </div>
      )}

      <div className="mx-auto max-w-4xl">
        {/* Score */}
        <div className="py-12 flex flex-col items-center gap-3">
          <ScoreCircle score={scanData.overallScore} active={scoreActive} />
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#555", letterSpacing: "0.14em" }}
          >
            AI Visibility Score
          </p>
          <p
            className={`text-lg font-semibold ${scoreTextClass(scanData.overallScore)}`}
          >
            {scoreMessage(scanData.overallScore)}
          </p>
        </div>

        {/* ICP card */}
        {scanData.businessProfile && (
          <div
            className="mb-8 rounded-2xl border p-6"
            style={{ background: "#111", borderColor: "#222" }}
          >
            <p
              className="mb-4 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "#555" }}
            >
              ICP Profile Detected
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Company", val: scanData.businessProfile.companyName },
                {
                  label: "What they sell",
                  val: scanData.businessProfile.whatTheySell,
                },
                {
                  label: "Primary buyer",
                  val: `${scanData.icp?.primaryBuyer ?? ""}${
                    scanData.icp?.buyerLocation &&
                    scanData.icp.buyerLocation !== "unknown"
                      ? ` · ${scanData.icp.buyerLocation}`
                      : ""
                  }`,
                },
                { label: "Their pain", val: scanData.icp?.buyerPainPoint ?? "" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl p-4"
                  style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}
                >
                  <p
                    className="text-[10px] mb-1.5 font-semibold uppercase tracking-wider"
                    style={{ color: "#555" }}
                  >
                    {item.label}
                  </p>
                  <p className="text-sm text-gray-200">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engine cards */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {ENGINES.map(({ key, label }) => (
            <EngineCard
              key={key}
              label={label}
              engine={scanData.engines?.[key]}
              active={scoreActive}
            />
          ))}
        </div>

        {/* Results table */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#222" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #222", background: "#0f0f0f" }}>
                  <th className="px-5 py-3.5 text-left font-semibold text-gray-300 w-full">
                    Buyer Prompt
                  </th>
                  {ENGINES.map(({ key, label }) => (
                    <th
                      key={key}
                      className="px-4 py-3.5 text-center font-semibold text-gray-300 whitespace-nowrap"
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
                    const catResults = allResults.filter(
                      (r) => r.category === catMeta.key
                    );
                    if (catResults.length === 0) continue;

                    const cs =
                      scanData.categoryScores?.[catMeta.key] ?? {
                        appeared: 0,
                        total: 0,
                      };
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
                        <tr
                          key={`h-${catMeta.key}`}
                          style={{ background: catMeta.headerBg }}
                        >
                          <td
                            colSpan={ENGINES.length + 1}
                            className={`px-5 py-3 ${catMeta.headerBorder}`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${catMeta.badge}`}
                                >
                                  {catMeta.label.toUpperCase()}
                                </span>
                                <span
                                  className="text-xs hidden sm:inline"
                                  style={{ color: "#666" }}
                                >
                                  {catMeta.description}
                                </span>
                              </div>
                              <span className="text-xs" style={{ color: "#666" }}>
                                {appearedCount}/{catResults.length} appeared
                                <span
                                  className={`ml-2 font-semibold ${scoreTextClass(catPct)}`}
                                >
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
                      const rowBg = rowCount % 2 === 0 ? "#0d0d0d" : "#111111";

                      if (visible) {
                        elements.push(
                          <tr
                            key={`r-${catMeta.key}-${i}`}
                            style={{
                              background: rowBg,
                              borderBottom: "1px solid #1a1a1a",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#161616")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = rowBg)
                            }
                          >
                            <td className="px-5 py-4 text-gray-300 text-sm leading-relaxed">
                              {row.prompt}
                            </td>
                            {ENGINES.map(({ key }) => {
                              const eng = scanData.engines?.[key];
                              const res = row[
                                key as keyof Pick<
                                  PromptResult,
                                  "gemini" | "claude" | "chatgpt" | "perplexity"
                                >
                              ] as EngineResult | undefined;
                              return (
                                <td key={key} className="px-4 py-4 text-center">
                                  {!eng?.available ? (
                                    <span
                                      style={{
                                        filter: "grayscale(1)",
                                        opacity: 0.25,
                                        fontSize: 16,
                                      }}
                                    >
                                      🔒
                                    </span>
                                  ) : res?.appeared ? (
                                    <span
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                                      title={res.snippet || "Appeared"}
                                      style={{
                                        background: "rgba(0,212,170,0.12)",
                                        color: "#00D4AA",
                                        border: "1px solid rgba(0,212,170,0.25)",
                                      }}
                                    >
                                      ✓
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                                      style={{
                                        background: "rgba(239,68,68,0.1)",
                                        color: "#ef4444",
                                        border: "1px solid rgba(239,68,68,0.2)",
                                      }}
                                    >
                                      ✗
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      }

                      rowCount++;

                      // Insert email wall after 4th row
                      if (rowCount === FREE_ROWS && !emailCaptured && hiddenCount > 0) {
                        elements.push(
                          <tr key="wall">
                            <td colSpan={ENGINES.length + 1} className="p-0">
                              <div
                                className="mx-5 my-6 rounded-2xl p-8 text-center"
                                style={{
                                  background: "rgba(0,212,170,0.03)",
                                  border: "1px solid rgba(0,212,170,0.25)",
                                  boxShadow:
                                    "0 0 60px rgba(0,212,170,0.06), inset 0 0 60px rgba(0,212,170,0.04)",
                                }}
                              >
                                {/* Lock icon */}
                                <div
                                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                  style={{
                                    background: "rgba(0,212,170,0.08)",
                                    border: "1px solid rgba(0,212,170,0.2)",
                                  }}
                                >
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#00D4AA"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect
                                      x="3"
                                      y="11"
                                      width="18"
                                      height="11"
                                      rx="2"
                                      ry="2"
                                    />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                </div>

                                <p
                                  className="text-[11px] font-bold uppercase tracking-widest mb-3"
                                  style={{ color: "#00D4AA" }}
                                >
                                  🔒 {hiddenCount} more prompts hidden
                                </p>
                                <h3
                                  className="text-xl font-bold text-white mb-2"
                                  style={{ fontFamily: "var(--font-geist-sans)" }}
                                >
                                  Your full AI visibility report is ready
                                </h3>
                                <p
                                  className="text-sm mb-6 mx-auto"
                                  style={{ color: "#777", maxWidth: 400 }}
                                >
                                  See all 24 prompts, intent breakdown, and your
                                  biggest gaps — free.
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
                                  className="mx-auto space-y-3"
                                  style={{ maxWidth: 360 }}
                                >
                                  {/* Floating label email input */}
                                  <div className="relative">
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
                                      className="w-full rounded-xl px-4 text-white text-sm focus:outline-none transition-colors"
                                      style={{
                                        background: "#0d0d0d",
                                        border: `1px solid ${
                                          emailFocused ? "#00D4AA" : "#2a2a2a"
                                        }`,
                                        paddingTop:
                                          emailInput || emailFocused ? "22px" : "13px",
                                        paddingBottom:
                                          emailInput || emailFocused ? "7px" : "13px",
                                      }}
                                    />
                                    <label
                                      className="absolute left-4 pointer-events-none transition-all"
                                      style={{
                                        top:
                                          emailInput || emailFocused ? "7px" : "50%",
                                        transform:
                                          emailInput || emailFocused
                                            ? "none"
                                            : "translateY(-50%)",
                                        fontSize:
                                          emailInput || emailFocused ? 10 : 14,
                                        color: emailFocused ? "#00D4AA" : "#555",
                                      }}
                                    >
                                      Work email
                                    </label>
                                  </div>
                                  {emailError && (
                                    <p className="text-xs text-red-400 text-left -mt-1">
                                      {emailError}
                                    </p>
                                  )}
                                  <button
                                    type="submit"
                                    disabled={emailSubmitting}
                                    className="w-full rounded-xl py-3 text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #00D4AA, #00b894)",
                                      color: "#0a0a0a",
                                    }}
                                  >
                                    {emailSubmitting
                                      ? "Unlocking..."
                                      : "Get My Full Report →"}
                                  </button>
                                </form>
                                <p
                                  className="mt-3 text-xs"
                                  style={{ color: "#444" }}
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
            className="mt-8 rounded-2xl border p-6"
            style={{ background: "#111", borderColor: "#222" }}
          >
            <p
              className="mb-5 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "#555" }}
            >
              Insights
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div
                className="rounded-xl p-4"
                style={{
                  background: "#0d0d0d",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: "#555" }}
                >
                  Strongest intent
                </p>
                <p className="font-semibold text-emerald-400">
                  {insights.strongest.label}
                </p>
                <p className="text-xs mt-1" style={{ color: "#666" }}>
                  {insights.strongest.p}% visibility
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{
                  background: "#0d0d0d",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: "#555" }}
                >
                  Biggest gap
                </p>
                <p className="font-semibold text-red-400">
                  {insights.weakest.label}
                </p>
                <p className="text-xs mt-1" style={{ color: "#666" }}>
                  {insights.weakest.p}% visibility — buyers can&apos;t find you
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: "#555" }}
                >
                  Recommendation
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#aaa" }}>
                  {RECOMMENDATIONS[insights.weakest.key]}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div
          className="mt-8 rounded-2xl p-8 text-center"
          style={{
            background: "rgba(0,212,170,0.04)",
            border: "1px solid rgba(0,212,170,0.18)",
          }}
        >
          <h3
            className="mb-2 text-xl font-bold text-white"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            Want to monitor this daily?
          </h3>
          <p
            className="mb-6 text-sm mx-auto"
            style={{ color: "#777", maxWidth: 480 }}
          >
            Get weekly AI visibility reports, track competitors, and know when
            your brand disappears from AI search — before it costs you pipeline.
          </p>
          <button
            className="rounded-xl px-8 py-3.5 font-bold text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #00D4AA, #6366f1)",
              color: "#fff",
            }}
          >
            Get Weekly Reports — $49/mo
          </button>
          <p className="mt-3 text-xs" style={{ color: "#444" }}>
            Cancel anytime. 7-day free trial included.
          </p>
        </div>
      </div>
    </section>
  );
}
