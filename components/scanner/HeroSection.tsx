"use client";

import { type ScanStatus } from "@/components/scanner/types";

interface HeroSectionProps {
  domain: string;
  status: ScanStatus;
  onDomainChange: (value: string) => void;
  onScan: (domain: string) => void;
}

export function HeroSection({ domain, status, onDomainChange, onScan }: HeroSectionProps) {
  const isLoading = status === "generating" || status === "scanning";
  const isIdle = status === "idle" || status === "error";

  return (
    <section
      style={{
        background: "#000000",
        borderBottom: isIdle ? "none" : "1px solid #1f1f1f",
      }}
      className={isIdle
        ? "flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-4 sm:px-6 py-16"
        : "px-4 sm:px-6 py-8 sm:py-10"
      }
    >
      <div className={`w-full mx-auto ${isIdle ? "max-w-2xl text-center" : "max-w-2xl"}`}>

        {/* Full hero — idle only */}
        {isIdle && (
          <>
            {/* Eyebrow */}
            <p
              className="animate-fade-in-up"
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                color: "#888888",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 24,
              }}
            >
              AI Search Intelligence
            </p>

            {/* Headline */}
            <h1
              className="animate-fade-in-up"
              style={{
                fontFamily: "var(--font-heading, system-ui)",
                fontWeight: 700,
                fontSize: "clamp(36px, 6vw, 64px)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "#ffffff",
                marginBottom: 24,
                animationDelay: "0.08s",
              }}
            >
              Know where your brand lives in AI search.
            </h1>

            {/* Subheadline */}
            <p
              className="animate-fade-in-up"
              style={{
                fontFamily: "var(--font-heading, system-ui)",
                fontSize: 18,
                color: "#888888",
                lineHeight: 1.6,
                marginBottom: 40,
                animationDelay: "0.16s",
              }}
            >
              sparrwo scans ChatGPT, Gemini, Claude &amp; Perplexity to show
              exactly where buyers find — or miss — your brand.
            </p>
          </>
        )}

        {/* Input row */}
        <div
          className="animate-fade-in-up"
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 8,
            animationDelay: isIdle ? "0.22s" : "0s",
          }}
        >
          <input
            type="text"
            value={domain}
            onChange={(e) => onDomainChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && onScan(domain)}
            placeholder="yourdomain.com"
            disabled={isLoading}
            style={{
              flex: 1,
              background: "#000000",
              border: "1px solid #1f1f1f",
              borderRadius: 8,
              padding: "11px 16px",
              fontSize: 14,
              color: "#ffffff",
              outline: "none",
              minWidth: 0,
              transition: "border-color 150ms ease",
              fontFamily: "var(--font-body, system-ui)",
              opacity: isLoading ? 0.5 : 1,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#333333")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#1f1f1f")}
          />
          <button
            onClick={() => onScan(domain)}
            disabled={isLoading || !domain.trim()}
            style={{
              background: isLoading ? "#141414" : "#f97316",
              color: isLoading ? "#444444" : "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "11px 20px",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--font-heading, system-ui)",
              cursor: isLoading || !domain.trim() ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "background 150ms ease",
              opacity: !domain.trim() && !isLoading ? 0.5 : 1,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isLoading && domain.trim()) e.currentTarget.style.background = "#ea6c00";
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.background = isLoading ? "#141414" : "#f97316";
            }}
          >
            {isLoading ? (
              <>
                <span
                  style={{
                    width: 14, height: 14,
                    borderRadius: "50%",
                    border: "2px solid #333",
                    borderTopColor: "#888",
                    display: "inline-block",
                    animation: "sp-ring-spin 0.8s linear infinite",
                    flexShrink: 0,
                  }}
                />
                {status === "generating" ? "Analyzing..." : "Scanning..."}
              </>
            ) : (
              "Check My Visibility"
            )}
          </button>
        </div>

        {status === "error" && (
          <p style={{ marginTop: 12, fontSize: 13, color: "#ef4444", textAlign: "center" }}>
            Something went wrong. Please try again.
          </p>
        )}

        {/* Feature pills — idle only */}
        {isIdle && (
          <div
            className="animate-fade-in-up"
            style={{
              marginTop: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              flexWrap: "wrap",
              animationDelay: "0.30s",
            }}
          >
            {["4 AI engines", "24 buyer prompts", "Free scan"].map((pill) => (
              <span
                key={pill}
                style={{
                  border: "1px solid #1f1f1f",
                  background: "#0c0c0c",
                  color: "#888888",
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 12,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {pill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Marketing sections — idle only */}
      {isIdle && (
        <div style={{ width: "100%", marginTop: 80 }}>

          {/* Social proof bar */}
          <div style={{ borderTop: "1px solid #1f1f1f", borderBottom: "1px solid #1f1f1f", padding: "24px 24px", background: "#000000" }}>
            <div className="mx-auto max-w-6xl flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <p style={{ fontSize: 13, color: "#444444", fontFamily: "var(--font-mono, monospace)" }}>
                Trusted by{" "}
                <span style={{ color: "#ffffff" }}>300+ B2B SaaS teams</span>
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                {["Acme Corp", "Streamline HQ", "LaunchPad"].map((name) => (
                  <span
                    key={name}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#333333",
                      fontFamily: "var(--font-mono, monospace)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Pain section */}
          <div style={{ padding: "80px 24px", maxWidth: 1152, margin: "0 auto" }}>
            <h2
              style={{
                fontFamily: "var(--font-heading, system-ui)",
                fontWeight: 700,
                fontSize: "clamp(22px, 3vw, 30px)",
                letterSpacing: "-0.02em",
                color: "#ffffff",
                textAlign: "center",
                marginBottom: 48,
              }}
            >
              The AI search problem no one is talking about
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Your competitor is in ChatGPT. You're not.",
                  body: "When a buyer asks ChatGPT to recommend tools in your category, your competitor's name comes up — yours doesn't.",
                },
                {
                  step: "02",
                  title: "Buyers research on AI before they Google anything.",
                  body: "Over 60% of B2B buyers now start product research on AI tools. If you're not there, you don't exist.",
                },
                {
                  step: "03",
                  title: "You're invisible where decisions are made.",
                  body: "Your SEO is fine. Your ads are running. But deals are being lost at the AI search layer — silently.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    background: "#0c0c0c",
                    border: "1px solid #1f1f1f",
                    borderRadius: 8,
                    padding: 24,
                    transition: "border-color 150ms ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#333333")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1f1f1f")}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 11,
                      color: "#f97316",
                      letterSpacing: "0.1em",
                      marginBottom: 16,
                    }}
                  >
                    {card.step}
                  </p>
                  <h3
                    style={{
                      fontFamily: "var(--font-heading, system-ui)",
                      fontWeight: 600,
                      fontSize: 15,
                      color: "#ffffff",
                      lineHeight: 1.4,
                      marginBottom: 12,
                    }}
                  >
                    {card.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "#888888", lineHeight: 1.65 }}>
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ borderTop: "1px solid #1f1f1f", padding: "80px 24px", background: "#000000" }}>
            <div style={{ maxWidth: 896, margin: "0 auto", textAlign: "center" }}>
              <h2
                style={{
                  fontFamily: "var(--font-heading, system-ui)",
                  fontWeight: 700,
                  fontSize: "clamp(22px, 3vw, 30px)",
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                  marginBottom: 12,
                }}
              >
                How it works
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  color: "#444444",
                  marginBottom: 56,
                }}
              >
                Three steps. Sixty seconds. Zero fluff.
              </p>
              <div className="grid gap-10 sm:grid-cols-3">
                {[
                  {
                    step: "01",
                    title: "Enter your domain",
                    body: "Type your company domain. No signup, no credit card, no friction.",
                  },
                  {
                    step: "02",
                    title: "We scan 4 AI engines",
                    body: "24 real buyer-intent prompts run across ChatGPT, Gemini, Claude & Perplexity — mapped to your specific ICP.",
                  },
                  {
                    step: "03",
                    title: "See your score",
                    body: "Get a visibility score by buyer intent stage — and exactly where to focus to fix the gaps.",
                  },
                ].map((item) => (
                  <div key={item.step} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        border: "1px solid rgba(249,115,22,0.3)",
                        background: "rgba(249,115,22,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 20,
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#f97316",
                      }}
                    >
                      {item.step}
                    </div>
                    <h3
                      style={{
                        fontFamily: "var(--font-heading, system-ui)",
                        fontWeight: 600,
                        fontSize: 15,
                        color: "#ffffff",
                        marginBottom: 10,
                      }}
                    >
                      {item.title}
                    </h3>
                    <p style={{ fontSize: 13, color: "#888888", lineHeight: 1.65 }}>
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div style={{ padding: "80px 24px", textAlign: "center" }}>
            <div style={{ maxWidth: 560, margin: "0 auto" }}>
              <h2
                style={{
                  fontFamily: "var(--font-heading, system-ui)",
                  fontWeight: 700,
                  fontSize: "clamp(22px, 3vw, 36px)",
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                  marginBottom: 12,
                }}
              >
                Ready to see where you stand?
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  color: "#444444",
                  marginBottom: 36,
                }}
              >
                Free scan. No account. Takes 60 seconds.
              </p>
              <div style={{ display: "flex", gap: 8, maxWidth: 480, margin: "0 auto" }}>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => onDomainChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onScan(domain)}
                  placeholder="yourdomain.com"
                  style={{
                    flex: 1,
                    background: "#000000",
                    border: "1px solid #1f1f1f",
                    borderRadius: 8,
                    padding: "11px 16px",
                    fontSize: 14,
                    color: "#ffffff",
                    outline: "none",
                    transition: "border-color 150ms ease",
                    fontFamily: "var(--font-body, system-ui)",
                    minWidth: 0,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#333333")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#1f1f1f")}
                />
                <button
                  onClick={() => onScan(domain)}
                  disabled={!domain.trim()}
                  style={{
                    background: "#f97316",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    padding: "11px 20px",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "var(--font-heading, system-ui)",
                    cursor: !domain.trim() ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    opacity: !domain.trim() ? 0.5 : 1,
                    transition: "background 150ms ease",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (domain.trim()) e.currentTarget.style.background = "#ea6c00";
                  }}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#f97316")}
                >
                  Check My Visibility
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
