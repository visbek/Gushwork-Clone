"use client";

import { type ScanStatus } from "@/components/scanner/types";

interface HeroSectionProps {
  domain: string;
  status: ScanStatus;
  onDomainChange: (value: string) => void;
  onScan: (domain: string) => void;
}

export function HeroSection({
  domain,
  status,
  onDomainChange,
  onScan,
}: HeroSectionProps) {
  const isLoading = status === "generating" || status === "scanning";
  const isIdle = status === "idle" || status === "error";

  return (
    <section
      className={`overflow-hidden px-4 sm:px-6 transition-colors duration-300 ${
        isIdle
          ? "flex min-h-[calc(100vh-65px)] flex-col items-center justify-center py-16 sm:py-20"
          : "border-b py-8 sm:py-10"
      }`}
      style={{
        background: "var(--sp-bg)",
        borderColor: "var(--sp-border)",
      }}
    >
      <div
        className={`relative z-10 w-full mx-auto ${
          isIdle ? "max-w-2xl text-center" : "max-w-2xl"
        }`}
      >
        {/* Full hero content — idle only */}
        {isIdle && (
          <>
            {/* Eyebrow */}
            <p
              className="mb-6 text-xs font-bold uppercase tracking-widest animate-fade-in-up"
              style={{ color: "var(--sp-accent)", letterSpacing: "0.18em" }}
            >
              AI Search Intelligence
            </p>

            {/* Headline — Syne bold geometric */}
            <h1
              className="mb-6 font-bold text-[32px] sm:text-[48px] lg:text-[60px] animate-fade-in-up"
              style={{
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                fontFamily: "var(--font-heading)",
                color: "var(--sp-text)",
                animationDelay: "0.08s",
              }}
            >
              Know where your brand lives in AI search.
            </h1>

            {/* Subheadline */}
            <p
              className="mb-10 text-base sm:text-lg animate-fade-in-up"
              style={{
                color: "var(--sp-text-3)",
                lineHeight: 1.65,
                animationDelay: "0.16s",
                fontFamily: "var(--font-dm-sans, system-ui)",
              }}
            >
              sparrwo scans ChatGPT, Gemini, Claude &amp; Perplexity to show
              exactly where buyers find — or miss — your brand.
            </p>
          </>
        )}

        {/* Input row */}
        <div
          className="rounded-full px-2 py-2 flex flex-col sm:flex-row gap-2 animate-fade-in-up"
          style={{
            background: "var(--sp-input-bg)",
            border: "1px solid var(--sp-input-border)",
            animationDelay: isIdle ? "0.22s" : "0s",
          }}
        >
          <input
            type="text"
            value={domain}
            onChange={(e) => onDomainChange(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !isLoading && onScan(domain)
            }
            placeholder="yourdomain.com"
            disabled={isLoading}
            className="flex-1 bg-transparent px-4 py-2.5 placeholder-[#666] focus:outline-none text-sm disabled:opacity-50 min-w-0 w-full"
            style={{ color: "var(--sp-text)" }}
          />
          <button
            onClick={() => onScan(domain)}
            disabled={isLoading || !domain.trim()}
            className="flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all whitespace-nowrap disabled:cursor-not-allowed w-full sm:w-auto"
            style={
              isLoading
                ? { background: "var(--sp-card)", color: "var(--sp-text-4)" }
                : {
                    background: "var(--sp-accent)",
                    color: "#fff",
                    opacity: !domain.trim() ? 0.5 : 1,
                  }
            }
          >
            {isLoading ? (
              <>
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 border-[#444] border-t-[#888] animate-spin flex-shrink-0"
                  style={{ animationDuration: "0.8s" }}
                />
                {status === "generating" ? "Analyzing..." : "Scanning..."}
              </>
            ) : (
              "Check My Visibility"
            )}
          </button>
        </div>

        {status === "error" && (
          <p className="mt-3 text-sm text-red-400 text-center">
            Something went wrong. Please try again.
          </p>
        )}

        {/* Feature pills — idle only */}
        {isIdle && (
          <div
            className="mt-8 flex items-center justify-center gap-2 flex-wrap animate-fade-in-up"
            style={{ animationDelay: "0.30s" }}
          >
            {["4 AI engines", "24 buyer prompts", "Free scan"].map((pill) => (
              <span
                key={pill}
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: "var(--sp-card)",
                  color: "var(--sp-text-3)",
                  border: "1px solid var(--sp-border-card)",
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
        <div className="relative z-10 w-full mt-20">
          {/* Social proof bar */}
          <div
            className="border-y px-6 py-6 -mx-6"
            style={{
              borderColor: "var(--sp-border)",
              background: "var(--sp-bg-section)",
            }}
          >
            <div className="mx-auto max-w-6xl flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <p className="text-sm" style={{ color: "var(--sp-text-4)" }}>
                Trusted by{" "}
                <span className="font-semibold" style={{ color: "var(--sp-text)" }}>
                  300+ B2B SaaS teams
                </span>
              </p>
              <div className="flex items-center gap-8">
                {["Acme Corp", "Streamline HQ", "LaunchPad"].map((name) => (
                  <span
                    key={name}
                    className="text-sm font-semibold tracking-wide"
                    style={{ color: "var(--sp-border-card)" }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Pain section */}
          <div className="px-4 sm:px-6 py-16 sm:py-24 mx-auto max-w-6xl">
            <h2
              className="mb-12 text-center text-2xl font-bold sm:text-3xl"
              style={{
                fontFamily: "var(--font-heading)",
                letterSpacing: "-0.02em",
                color: "var(--sp-text)",
              }}
            >
              The AI search problem no one is talking about
            </h2>
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                {
                  icon: "⚠️",
                  title: "Your competitor is in ChatGPT. You're not.",
                  body: "When a buyer asks ChatGPT to recommend tools in your category, your competitor's name comes up — yours doesn't.",
                },
                {
                  icon: "🔍",
                  title: "Buyers research on AI before they Google anything.",
                  body: "Over 60% of B2B buyers now start product research on AI tools. If you're not there, you don't exist.",
                },
                {
                  icon: "📉",
                  title: "You're invisible where decisions are made.",
                  body: "Your SEO is fine. Your ads are running. But deals are being lost at the AI search layer — silently.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border p-6 transition-all hover:-translate-y-0.5"
                  style={{
                    background: "var(--sp-card)",
                    borderColor: "var(--sp-border-card)",
                  }}
                >
                  <div className="mb-4 text-3xl">{card.icon}</div>
                  <h3
                    className="mb-3 text-base font-semibold leading-snug"
                    style={{ color: "var(--sp-text)" }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--sp-text-3)" }}>
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div
            className="border-t px-6 py-24 -mx-6"
            style={{
              borderColor: "var(--sp-border)",
              background: "var(--sp-bg-section)",
            }}
          >
            <div className="mx-auto max-w-4xl text-center">
              <h2
                className="mb-4 text-2xl font-bold sm:text-3xl"
                style={{
                  fontFamily: "var(--font-heading)",
                  letterSpacing: "-0.02em",
                  color: "var(--sp-text)",
                }}
              >
                How it works
              </h2>
              <p className="mb-16 text-sm" style={{ color: "var(--sp-text-4)" }}>
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
                  <div key={item.step} className="flex flex-col items-center">
                    <div
                      className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-bold border"
                      style={{
                        borderColor: "var(--sp-accent-border)",
                        background: "var(--sp-accent-bg)",
                        color: "var(--sp-accent)",
                      }}
                    >
                      {item.step}
                    </div>
                    <h3
                      className="mb-3 text-base font-semibold"
                      style={{ color: "var(--sp-text)" }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--sp-text-3)" }}>
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="px-4 sm:px-6 py-16 sm:py-24 text-center">
            <div className="mx-auto max-w-2xl">
              <h2
                className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold"
                style={{
                  fontFamily: "var(--font-heading)",
                  letterSpacing: "-0.025em",
                  color: "var(--sp-text)",
                }}
              >
                Ready to see where you stand?
              </h2>
              <p className="mb-8 sm:mb-10 text-sm" style={{ color: "var(--sp-text-3)" }}>
                Free scan. No account. Takes 60 seconds.
              </p>
              <div
                className="rounded-full px-2 py-2"
                style={{
                  background: "var(--sp-input-bg)",
                  border: "1px solid var(--sp-input-border)",
                }}
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => onDomainChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onScan(domain)}
                    placeholder="yourdomain.com"
                    className="flex-1 bg-transparent px-4 py-2.5 placeholder-[#666] focus:outline-none text-sm min-w-0 w-full"
                    style={{ color: "var(--sp-text)" }}
                  />
                  <button
                    onClick={() => onScan(domain)}
                    disabled={!domain.trim()}
                    className="rounded-full px-6 py-2.5 text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                    style={{ background: "var(--sp-accent)", color: "#fff" }}
                  >
                    Check My AI Visibility
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
