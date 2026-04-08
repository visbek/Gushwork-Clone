"use client";

import { useState, useEffect, useRef } from "react";
import { HeroSection } from "@/components/scanner/HeroSection";
import { ScanningAnimation } from "@/components/scanner/ScanningAnimation";
import { ResultsSection } from "@/components/scanner/ResultsSection";
import {
  type ScanData,
  type ScanStatus,
  type EngineState,
} from "@/components/scanner/types";

// ── Theme toggle icons ───────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Home() {
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [rateLimited, setRateLimited] = useState(false);
  const [scanData, setScanData] = useState<ScanData | null>(null);

  // Theme
  const [isDark, setIsDark] = useState(true);

  // Email wall state
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  // Scan animation state
  const [engineStates, setEngineStates] = useState<Record<string, EngineState>>({
    gemini: "idle",
    claude: "idle",
    chatgpt: "idle",
    perplexity: "idle",
  });
  const [scanTextIdx, setScanTextIdx] = useState(0);

  const resultsRef = useRef<HTMLDivElement | null>(null);

  // ── Theme init ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const dark = saved ? saved === "dark" : true;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle("dark", newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
  }

  // ── localStorage ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (localStorage.getItem("sparrwo_email")) setEmailCaptured(true);
  }, []);

  useEffect(() => {
    if (scanData && domain) {
      const nd = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
      if (localStorage.getItem(`sparrwo_scanned_${nd}`)) setEmailCaptured(true);
    }
  }, [scanData, domain]);

  // ── Cycling scan text ────────────────────────────────────────────────────────

  useEffect(() => {
    if (status !== "generating" && status !== "scanning") return;
    const id = setInterval(() => setScanTextIdx((i) => i + 1), 2000);
    return () => clearInterval(id);
  }, [status]);

  // ── Engine state machine ─────────────────────────────────────────────────────

  useEffect(() => {
    if (status === "done") {
      setEngineStates({ gemini: "done", claude: "done", chatgpt: "done", perplexity: "done" });
      return;
    }
    if (status !== "scanning") {
      setEngineStates({ gemini: "idle", claude: "idle", chatgpt: "idle", perplexity: "idle" });
      return;
    }
    const engines = ["gemini", "claude", "chatgpt", "perplexity"] as const;
    const timers: ReturnType<typeof setTimeout>[] = [];
    engines.forEach((eng, i) => {
      timers.push(setTimeout(() => setEngineStates((p) => ({ ...p, [eng]: "scanning" })), i * 300));
      timers.push(setTimeout(() => setEngineStates((p) => ({ ...p, [eng]: "analyzing" })), 28000 + i * 4000));
    });
    return () => timers.forEach(clearTimeout);
  }, [status]);

  // ── Scroll to results ────────────────────────────────────────────────────────

  useEffect(() => {
    if (status === "done") {
      setTimeout(
        () => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        300
      );
    }
  }, [status]);

  // ── Scan handler ─────────────────────────────────────────────────────────────

  async function handleScan(inputDomain: string) {
    const trimmed = inputDomain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!trimmed) return;
    setScanData(null);
    setRateLimited(false);
    setStatus("generating");
    setScanTextIdx(0);

    try {
      const r1 = await fetch("/api/scan/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: trimmed }),
      });
      if (r1.status === 429) {
        setRateLimited(true);
        setStatus("error");
        return;
      }
      if (!r1.ok) throw new Error("Failed to generate prompts");
      const icpData = await r1.json();
      setStatus("scanning");

      const r2 = await fetch("/api/scan/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: trimmed,
          businessProfile: icpData.businessProfile,
          icp: icpData.icp,
          prompts: icpData.prompts,
          brandVariations: icpData.brandVariations,
        }),
      });
      if (!r2.ok) throw new Error("Failed to run scan");
      const data = await r2.json();
      setScanData({ ...data, businessProfile: icpData.businessProfile, icp: icpData.icp });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  // ── Email handler ────────────────────────────────────────────────────────────

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setEmailSubmitting(true);
    try {
      const nd = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
      await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim(), domain: nd, score: scanData?.overallScore ?? 0 }),
      });
      localStorage.setItem("sparrwo_email", emailInput.trim());
      localStorage.setItem(`sparrwo_scanned_${nd}`, "true");
      setEmailCaptured(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch {
      localStorage.setItem("sparrwo_email", emailInput.trim());
      setEmailCaptured(true);
    } finally {
      setEmailSubmitting(false);
    }
  }

  const isLoading = status === "generating" || status === "scanning";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main
      className="min-h-screen overflow-x-hidden transition-colors duration-300"
      style={{
        background: "var(--sp-bg)",
        color: "var(--sp-text)",
      }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 border-b px-6 py-4"
        style={{
          borderColor: "#1f1f1f",
          background: "#000000",
        }}
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          {/* Logo */}
          <span
            style={{
              fontFamily: "var(--font-heading, system-ui)",
              fontWeight: 600,
              fontSize: 16,
              color: "#ffffff",
              letterSpacing: "-0.01em",
            }}
          >
            sparrwo
          </span>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{
                color: "#444444",
                transition: "color 150ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#888888")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
              aria-label="Toggle theme"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Try Free */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hidden sm:block px-4 py-1.5 text-xs font-bold rounded-lg"
              style={{
                background: "#7c3aed",
                color: "#ffffff",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#6d28d9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#7c3aed")}
            >
              Try Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero + marketing */}
      <HeroSection
        domain={domain}
        status={status}
        onDomainChange={setDomain}
        onScan={handleScan}
      />

      {/* Rate limit banner */}
      {rateLimited && (
        <div className="px-6 py-6 flex justify-center">
          <div
            className="rounded-2xl border px-6 py-5 max-w-lg w-full text-center"
            style={{
              background: "var(--sp-card)",
              borderColor: "var(--sp-accent-border)",
            }}
          >
            <p className="text-sm mb-4" style={{ color: "var(--sp-text-2)" }}>
              You&apos;ve used your 3 free scans today.{" "}
              <span style={{ color: "var(--sp-text)" }}>Upgrade for unlimited scans.</span>
            </p>
            <a
              href="/pricing"
              className="inline-block rounded-full px-6 py-2.5 text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "var(--sp-accent)", color: "#fff" }}
            >
              Upgrade for unlimited scans →
            </a>
          </div>
        </div>
      )}

      {/* Scanning animation */}
      {isLoading && (
        <ScanningAnimation
          status={status}
          engineStates={engineStates}
          textIdx={scanTextIdx}
        />
      )}

      {/* Results */}
      {status === "done" && scanData && (
        <ResultsSection
          scanData={scanData}
          emailCaptured={emailCaptured}
          emailInput={emailInput}
          emailFocused={emailFocused}
          emailSubmitting={emailSubmitting}
          showToast={showToast}
          onEmailChange={setEmailInput}
          onEmailFocus={setEmailFocused}
          onEmailSubmit={handleEmailSubmit}
          sectionRef={resultsRef}
        />
      )}

      {/* Footer */}
      <footer
        className="border-t px-6 py-8 text-center"
        style={{ borderColor: "#1f1f1f", background: "#000000" }}
      >
        <span
          suppressHydrationWarning
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 12,
            color: "#444444",
          }}
        >
          sparrwo © 2026
        </span>
        <span style={{ color: "#1f1f1f", margin: "0 12px" }}>·</span>
        <a
          href="/privacy"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 12,
            color: "#444444",
            textDecoration: "none",
            transition: "color 150ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#888888")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
        >
          Privacy
        </a>
        <span style={{ color: "#1f1f1f", margin: "0 12px" }}>·</span>
        <a
          href="/terms"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 12,
            color: "#444444",
            textDecoration: "none",
            transition: "color 150ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#888888")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
        >
          Terms
        </a>
      </footer>
    </main>
  );
}
