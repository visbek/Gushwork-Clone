"use client";

import { useState, useEffect } from "react";
import { type ScanStatus, type EngineState } from "@/components/scanner/types";

const ENGINES = [
  { key: "gemini" as const, label: "Gemini", abbr: "G", color: "#4285f4" },
  { key: "claude" as const, label: "Claude", abbr: "C", color: "#d97706" },
  { key: "chatgpt" as const, label: "ChatGPT", abbr: "GPT", color: "#10a37f" },
  { key: "perplexity" as const, label: "Perplexity", abbr: "P", color: "#f97316" },
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

const LOG_LINES = [
  "Fetching website content...",
  "Extracting brand signals...",
  "Running ICP analysis...",
  "Querying Gemini 2.5 Flash...",
  "Brand detected in response #3...",
  "Querying Claude Sonnet...",
  "Running ChatGPT-4o queries...",
  "Querying Perplexity API...",
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

  const [promptCount, setPromptCount] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);

  // Counter: 0 → 24 at ~1 per 1.2s
  useEffect(() => {
    setPromptCount(0);
    let count = 0;
    const id = setInterval(() => {
      count++;
      setPromptCount(count);
      if (count >= 24) clearInterval(id);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  // Log feed: one new line every 2.2s, keep last 4
  useEffect(() => {
    setVisibleLogs([]);
    let idx = 0;
    const id = setInterval(() => {
      if (idx >= LOG_LINES.length) {
        clearInterval(id);
        return;
      }
      const line = LOG_LINES[idx++];
      setVisibleLogs((prev) => [...prev, line].slice(-4));
    }, 2200);
    return () => clearInterval(id);
  }, []);

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
            marginBottom: 32,
            flexShrink: 0,
          }}
        >
          <div
            className="sp-ring-spin"
            style={{
              position: "absolute",
              inset: 0,
              border: "2px dashed #f97316",
              borderRadius: "50%",
            }}
          />
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
              background: "#f97316",
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
            marginBottom: 40,
            textAlign: "center",
            minHeight: 20,
          }}
        >
          {SCAN_TEXTS[textIdx % SCAN_TEXTS.length]}
        </p>

        {/* Large prompt counter */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 72,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {String(promptCount).padStart(2, "0")}
          </div>
          <p
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              color: "#444444",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginTop: 10,
            }}
          >
            prompts running
          </p>
        </div>

        {/* Engine rows */}
        <div style={{ width: "100%", marginBottom: 40 }}>
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
                    background: "#f97316",
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

        {/* Terminal log feed */}
        <div
          style={{
            width: "100%",
            borderTop: "1px solid #1f1f1f",
            paddingTop: 24,
            minHeight: 96,
          }}
        >
          {visibleLogs.map((line, i) => {
            const fromEnd = visibleLogs.length - 1 - i;
            const opacity =
              fromEnd === 0 ? 1 : fromEnd === 1 ? 0.65 : fromEnd === 2 ? 0.35 : 0.15;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 8,
                  opacity,
                  transition: "opacity 0.4s ease",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 12,
                    color: "#444444",
                    flexShrink: 0,
                    userSelect: "none",
                  }}
                >
                  &gt;
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 12,
                    color: "#f97316",
                    letterSpacing: "0.02em",
                  }}
                >
                  {line}
                </span>
              </div>
            );
          })}
          {/* blinking cursor on last line */}
          {visibleLogs.length > 0 && (
            <div style={{ display: "flex", gap: 10 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  color: "#444444",
                  userSelect: "none",
                }}
              >
                &gt;
              </span>
              <span
                className="animate-blink-dot"
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 14,
                  background: "#f97316",
                  borderRadius: 1,
                  verticalAlign: "middle",
                  marginTop: 1,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
