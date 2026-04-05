"use client";

import { type ScanStatus, type EngineState } from "@/components/scanner/types";

const ENGINES = [
  { key: "gemini" as const, label: "Gemini", abbr: "G", color: "#4285f4" },
  { key: "claude" as const, label: "Claude", abbr: "C", color: "#d97706" },
  { key: "chatgpt" as const, label: "ChatGPT", abbr: "GPT", color: "#10a37f" },
  { key: "perplexity" as const, label: "Perplexity", abbr: "P", color: "#7c3aed" },
] as const;

const SCAN_TEXTS = [
  "Generating ICP profile...",
  "Running buyer intent queries...",
  "Checking AI citations...",
  "Calculating visibility score...",
];

const widths: Record<EngineState, string> = {
  idle: "0%",
  scanning: "72%",
  analyzing: "88%",
  done: "100%",
};
const durations: Record<EngineState, string> = {
  idle: "0s",
  scanning: "30s",
  analyzing: "1s",
  done: "0.4s",
};
const statusLabels: Record<EngineState, string> = {
  idle: "Queued",
  scanning: "Scanning...",
  analyzing: "Analyzing...",
  done: "Done ✓",
};
const statusColors: Record<EngineState, string> = {
  idle: "#333",
  scanning: "#00D4AA",
  analyzing: "#f59e0b",
  done: "#10b981",
};

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
    <section className="px-4 sm:px-6 py-10 sm:py-14">
      <div className="mx-auto max-w-md">
        {/* Spinner + cycling text */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-11 h-11 rounded-full mb-5 animate-spin"
            style={{
              border: "3px solid rgba(0,212,170,0.12)",
              borderTopColor: "#00D4AA",
              animationDuration: "1.1s",
            }}
          />
          <p
            className="text-sm font-medium mb-1"
            style={{ color: "#00D4AA", minHeight: 20 }}
          >
            {SCAN_TEXTS[textIdx % SCAN_TEXTS.length]}
          </p>
          <p className="text-xs" style={{ color: "#444" }}>
            {status === "generating"
              ? "Reading your website..."
              : "Running 24 prompts across 4 AI engines..."}
          </p>
        </div>

        {/* Engine rows */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: "#111", borderColor: "#222" }}
        >
          {ENGINES.map((eng, i) => {
            const state = (engineStates[eng.key] ?? "idle") as EngineState;
            return (
              <div
                key={eng.key}
                className="px-5 py-4"
                style={{
                  borderBottom:
                    i < ENGINES.length - 1 ? "1px solid #1a1a1a" : "none",
                }}
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold"
                    style={{
                      background: eng.color,
                      fontSize: 10,
                      boxShadow: `0 0 12px ${eng.color}35`,
                    }}
                  >
                    {eng.abbr}
                  </div>
                  <span className="text-sm font-medium text-gray-300 flex-1">
                    {eng.label}
                  </span>
                  <span
                    className="text-xs font-medium transition-colors"
                    style={{ color: statusColors[state] }}
                  >
                    {statusLabels[state]}
                  </span>
                </div>
                <div
                  className="h-[3px] rounded-full overflow-hidden"
                  style={{ background: "#1c1c1c" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: widths[state],
                      transition: `width ${durations[state]} ease-out`,
                      background:
                        state === "done"
                          ? "linear-gradient(90deg, #00D4AA, #10b981)"
                          : "linear-gradient(90deg, #00D4AA55, #00D4AA)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
