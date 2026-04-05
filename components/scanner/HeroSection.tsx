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
      className={`grain-overlay overflow-hidden px-4 sm:px-6 ${
        isIdle
          ? "flex min-h-[calc(100vh-65px)] flex-col items-center justify-center py-16 sm:py-20"
          : "border-b py-8 sm:py-10"
      }`}
      style={{ borderColor: "#1a1a1a" }}
    >
      {/* Gradient orbs — full hero only */}
      {isIdle && (
        <>
          <div
            className="animate-orb-1 pointer-events-none absolute"
            style={{
              top: "-8%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 700,
              height: 700,
              borderRadius: "50%",
              background: "radial-gradient(circle, #00D4AA, transparent 65%)",
              opacity: 0.11,
              filter: "blur(60px)",
            }}
          />
          <div
            className="animate-orb-2 pointer-events-none absolute"
            style={{
              top: "25%",
              right: "-8%",
              width: 520,
              height: 520,
              borderRadius: "50%",
              background: "radial-gradient(circle, #6366f1, transparent 65%)",
              opacity: 0.09,
              filter: "blur(60px)",
            }}
          />
        </>
      )}

      <div
        className={`relative z-10 w-full mx-auto ${
          isIdle ? "max-w-3xl text-center" : "max-w-2xl"
        }`}
      >
        {/* Full hero content — idle only */}
        {isIdle && (
          <>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm mb-8 animate-fade-in-up"
              style={{
                borderColor: "#00D4AA30",
                background: "#00D4AA08",
                color: "#00D4AA",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-blink-dot"
                style={{ background: "#00D4AA" }}
              />
              AI Search Visibility
            </div>

            {/* Headline */}
            <h1
              className="mb-6 font-extrabold text-white animate-fade-in-up text-[36px] sm:text-[52px] lg:text-[72px]"
              style={{
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                fontFamily: "var(--font-geist-sans)",
                animationDelay: "0.08s",
              }}
            >
              Find Out If Your Brand
              <br className="hidden sm:block" />
              {" "}Shows Up in{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #00D4AA 0%, #6366f1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                AI Search
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="mb-8 sm:mb-10 text-base sm:text-[18px] animate-fade-in-up"
              style={{
                color: "#888",
                lineHeight: 1.65,
                animationDelay: "0.16s",
              }}
            >
              See if buyers find you on ChatGPT, Gemini, Claude &amp; Perplexity —
              <br className="hidden sm:block" />
              {" "}in 60 seconds. Free.
            </p>
          </>
        )}

        {/* Glass input card */}
        <div
          className="rounded-2xl p-2"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={domain}
              onChange={(e) => onDomainChange(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !isLoading && onScan(domain)
              }
              placeholder="yourdomain.com"
              disabled={isLoading}
              className="flex-1 bg-transparent px-4 py-3 text-white placeholder-[#444] focus:outline-none text-sm disabled:opacity-50 min-w-0 w-full"
            />
            <button
              onClick={() => onScan(domain)}
              disabled={isLoading || !domain.trim()}
              className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all whitespace-nowrap disabled:cursor-not-allowed w-full sm:w-auto ${
                isLoading
                  ? "bg-[#1a1a1a] text-[#555]"
                  : "bg-[#00D4AA] text-[#0a0a0a] hover:bg-[#00e4bb] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              }`}
            >
              {isLoading ? (
                <>
                  <span
                    className="w-3.5 h-3.5 rounded-full border-2 border-[#333] border-t-[#666] animate-spin flex-shrink-0"
                    style={{ animationDuration: "0.8s" }}
                  />
                  {status === "generating" ? "Analyzing..." : "Scanning..."}
                </>
              ) : (
                "Check My Visibility →"
              )}
            </button>
          </div>
        </div>

        {status === "error" && (
          <p className="mt-3 text-sm text-red-400 text-center">
            Something went wrong. Please try again.
          </p>
        )}

        {/* Trust bar — idle only */}
        {isIdle && (
          <div
            className="mt-10 flex flex-col items-center gap-6 animate-fade-in-up"
            style={{ animationDelay: "0.28s" }}
          >
            <p className="text-sm" style={{ color: "#555" }}>
              Trusted by{" "}
              <span className="text-white font-semibold">300+ B2B teams</span>
            </p>
            <div className="flex items-center gap-10">
              {[
                { n: "4", l: "AI engines" },
                { n: "24", l: "prompts" },
                { n: "60s", l: "results" },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <div
                    className="text-xl font-bold"
                    style={{
                      color: "#00D4AA",
                      fontFamily: "var(--font-geist-sans)",
                    }}
                  >
                    {s.n}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#555" }}>
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Marketing sections — idle only */}
      {isIdle && (
        <div className="relative z-10 w-full">
          {/* Social proof bar */}
          <div
            className="mt-20 border-y px-6 py-6 -mx-6"
            style={{ borderColor: "#1a1a1a", background: "#0d0d0d" }}
          >
            <div className="mx-auto max-w-6xl flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <p className="text-sm" style={{ color: "#555" }}>
                Trusted by{" "}
                <span className="font-semibold text-white">
                  300+ B2B SaaS teams
                </span>
              </p>
              <div className="flex items-center gap-8">
                {["Acme Corp", "Streamline HQ", "LaunchPad"].map((name) => (
                  <span
                    key={name}
                    className="text-sm font-semibold tracking-wide"
                    style={{ color: "#2e2e2e" }}
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
              className="mb-12 text-center text-2xl font-bold text-white sm:text-3xl"
              style={{
                fontFamily: "var(--font-geist-sans)",
                letterSpacing: "-0.02em",
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
                  className="rounded-2xl border p-6 transition-all hover:border-[#2a2a2a] hover:-translate-y-0.5"
                  style={{ background: "#111", borderColor: "#222" }}
                >
                  <div className="mb-4 text-3xl">{card.icon}</div>
                  <h3 className="mb-3 text-base font-semibold text-white leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#777" }}>
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div
            className="border-t px-6 py-24 -mx-6"
            style={{ borderColor: "#1a1a1a", background: "#0d0d0d" }}
          >
            <div className="mx-auto max-w-4xl text-center">
              <h2
                className="mb-4 text-2xl font-bold text-white sm:text-3xl"
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  letterSpacing: "-0.02em",
                }}
              >
                How it works
              </h2>
              <p className="mb-16 text-sm" style={{ color: "#666" }}>
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
                        borderColor: "rgba(0,212,170,0.25)",
                        background: "rgba(0,212,170,0.06)",
                        color: "#00D4AA",
                      }}
                    >
                      {item.step}
                    </div>
                    <h3 className="mb-3 text-base font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#666" }}>
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
                className="mb-4 text-2xl sm:text-3xl lg:text-4xl font-bold text-white"
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  letterSpacing: "-0.025em",
                }}
              >
                Ready to see where you stand?
              </h2>
              <p className="mb-8 sm:mb-10 text-sm" style={{ color: "#666" }}>
                Free scan. No account. Takes 60 seconds.
              </p>
              <div
                className="rounded-2xl p-2"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => onDomainChange(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && onScan(domain)
                    }
                    placeholder="yourdomain.com"
                    className="flex-1 bg-transparent px-4 py-3 text-white placeholder-[#444] focus:outline-none text-sm min-w-0 w-full"
                  />
                  <button
                    onClick={() => onScan(domain)}
                    disabled={!domain.trim()}
                    className="rounded-xl px-5 py-3 text-sm font-bold transition-all bg-[#00D4AA] text-[#0a0a0a] hover:bg-[#00e4bb] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
                  >
                    Check My AI Visibility →
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
