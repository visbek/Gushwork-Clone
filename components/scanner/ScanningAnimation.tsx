"use client";

import { type ScanStatus, type EngineState } from "@/components/scanner/types";

const ENGINES = [
  { key: "gemini" as const, label: "Gemini", abbr: "G", color: "#4285f4" },
  { key: "claude" as const, label: "Claude", abbr: "C", color: "#d97706" },
  { key: "chatgpt" as const, label: "ChatGPT", abbr: "GPT", color: "#10a37f" },
  { key: "perplexity" as const, label: "Perplexity", abbr: "P", color: "#7c3aed" },
] as const;

const SCAN_TEXTS = [
  "Fetching website data...",
  "Analyzing ICP profile...",
  "Querying Gemini 2.5...",
  "Querying Claude Sonnet...",
  "Querying ChatGPT-4o...",
  "Querying Perplexity...",
  "Calculating visibility score...",
  "Building your report...",
];

interface ScanningAnimationProps {
  status: ScanStatus;
  engineStates: Record<string, EngineState>;
  textIdx: number;
}

export function ScanningAnimation({ status, engineStates, textIdx }: ScanningAnimationProps) {
  void status;
  void engineStates;

  return (
    <section
      style={{
        background: "#000000",
        padding: "72px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Rotating ring + pulsing dot */}
        <div
          style={{
            position: "relative",
            width: 72,
            height: 72,
            marginBottom: 40,
            flexShrink: 0,
          }}
        >
          {/* Dashed spinning ring */}
          <div
            className="sp-ring-spin"
            style={{
              position: "absolute",
              inset: 0,
              border: "2px dashed #7c3aed",
              borderRadius: "50%",
            }}
          />
          {/* Pulsing violet dot at center */}
          <div
            className="animate-sp-pulse"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#7c3aed",
            }}
          />
        </div>

        {/* Cycling status text */}
        <p
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 13,
            color: "#888888",
            letterSpacing: "0.05em",
            marginBottom: 56,
            textAlign: "center",
            minHeight: 20,
          }}
        >
          {SCAN_TEXTS[textIdx % SCAN_TEXTS.length]}
        </p>

        {/* Engine rows */}
        <div style={{ width: "100%" }}>
          {ENGINES.map((eng, i) => (
            <div
              key={eng.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {/* Engine icon */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: eng.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono, monospace)",
                  flexShrink: 0,
                }}
              >
                {eng.abbr}
              </div>

              {/* Engine name */}
              <span
                style={{
                  fontFamily: "var(--font-heading, system-ui)",
                  fontSize: 14,
                  color: "#ffffff",
                  width: 90,
                  flexShrink: 0,
                }}
              >
                {eng.label}
              </span>

              {/* Animated scan bar */}
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: "#1f1f1f",
                  borderRadius: 1,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  className="sp-scan-bar"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    background: "#7c3aed",
                    width: "0%",
                    animationDelay: `${i * 0.5}s`,
                    borderRadius: 1,
                  }}
                />
              </div>

              {/* Status label */}
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 11,
                  color: "#444444",
                  width: 72,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                Scanning...
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
