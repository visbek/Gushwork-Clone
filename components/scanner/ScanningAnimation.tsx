"use client";

import { type ScanStatus, type EngineState } from "@/components/scanner/types";

const ENGINES = [
  { key: "gemini" as const, label: "Gemini", abbr: "G", color: "#4285f4" },
  { key: "claude" as const, label: "Claude", abbr: "C", color: "#d97706" },
  { key: "chatgpt" as const, label: "ChatGPT", abbr: "GPT", color: "#10a37f" },
  { key: "perplexity" as const, label: "Perplexity", abbr: "P", color: "#7c3aed" },
] as const;

const SCAN_TEXTS = [
  "Analyzing your brand's AI presence...",
  "Running buyer intent queries...",
  "Calculating visibility score...",
  "Checking AI citations...",
];

const statusLabels: Record<EngineState, string> = {
  idle: "Queued",
  scanning: "Scanning",
  analyzing: "Analyzing",
  done: "Done ✓",
};

function PulsingDot({ state }: { state: EngineState }) {
  if (state === "idle") {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: "var(--sp-border-card)" }}
      />
    );
  }
  if (state === "done") {
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
        style={{
          background: "rgba(16,185,129,0.12)",
          color: "#10b981",
          border: "1px solid rgba(16,185,129,0.25)",
        }}
      >
        ✓
      </span>
    );
  }
  // scanning or analyzing
  const color = state === "analyzing" ? "#f59e0b" : "var(--sp-accent)";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full animate-sp-pulse"
      style={{ background: color }}
    />
  );
}

interface ScanningAnimationProps {
  status: ScanStatus;
  engineStates: Record<string, EngineState>;
  textIdx: number;
}

export function ScanningAnimation({
  status,
  engineStates,
  textIdx,
}: ScanningAnimationProps) {
  return (
    <section
      className="px-4 sm:px-6 py-10 sm:py-14 transition-colors duration-300"
      style={{ background: "var(--sp-bg)" }}
    >
      <div className="mx-auto max-w-md">
        {/* Cycling text */}
        <div className="flex flex-col items-center mb-8">
          <p
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--sp-accent)", minHeight: 20 }}
          >
            {SCAN_TEXTS[textIdx % SCAN_TEXTS.length]}
          </p>
          <p className="text-xs" style={{ color: "var(--sp-text-4)" }}>
            {status === "generating"
              ? "Reading your website..."
              : "Running 24 prompts across 4 AI engines..."}
          </p>
        </div>

        {/* Engine rows */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: "var(--sp-card)",
            borderColor: "var(--sp-border-card)",
          }}
        >
          {ENGINES.map((eng, i) => {
            const state = (engineStates[eng.key] ?? "idle") as EngineState;
            const stateColor =
              state === "done"
                ? "#10b981"
                : state === "analyzing"
                ? "#f59e0b"
                : state === "scanning"
                ? "var(--sp-accent)"
                : "var(--sp-text-4)";

            return (
              <div
                key={eng.key}
                className="px-5 py-4 flex items-center gap-4"
                style={{
                  borderBottom:
                    i < ENGINES.length - 1
                      ? `1px solid var(--sp-border)`
                      : "none",
                }}
              >
                {/* Engine badge */}
                <div
                  className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold"
                  style={{
                    background: eng.color,
                    fontSize: 10,
                    boxShadow: `0 0 10px ${eng.color}30`,
                  }}
                >
                  {eng.abbr}
                </div>

                {/* Label */}
                <span
                  className="text-sm font-medium flex-1"
                  style={{ color: "var(--sp-text-2)" }}
                >
                  {eng.label}
                </span>

                {/* Status label */}
                <span
                  className="text-xs font-medium transition-colors mr-3"
                  style={{ color: stateColor, minWidth: 64, textAlign: "right" }}
                >
                  {statusLabels[state]}
                </span>

                {/* Pulsing dot */}
                <PulsingDot state={state} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
