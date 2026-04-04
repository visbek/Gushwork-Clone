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

export default function Home() {
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [scanData, setScanData] = useState<ScanData | null>(null);

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

  // ── localStorage ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (localStorage.getItem("visibilityai_email")) setEmailCaptured(true);
  }, []);

  useEffect(() => {
    if (scanData && domain) {
      const nd = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
      if (localStorage.getItem(`visibilityai_scanned_${nd}`)) setEmailCaptured(true);
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
    setStatus("generating");
    setScanTextIdx(0);

    try {
      const r1 = await fetch("/api/scan/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: trimmed }),
      });
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
      localStorage.setItem("visibilityai_email", emailInput.trim());
      localStorage.setItem(`visibilityai_scanned_${nd}`, "true");
      setEmailCaptured(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch {
      localStorage.setItem("visibilityai_email", emailInput.trim());
      setEmailCaptured(true);
    } finally {
      setEmailSubmitting(false);
    }
  }

  const isLoading = status === "generating" || status === "scanning";

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main
      className="min-h-screen text-white"
      style={{
        background: "#0a0a0a",
        fontFamily: "var(--font-inter, var(--font-geist-sans))",
      }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 border-b px-6 py-4 backdrop-blur-md"
        style={{ borderColor: "#1a1a1a", background: "rgba(10,10,10,0.88)" }}
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            Visibility<span style={{ color: "#00D4AA" }}>AI</span>
          </span>
          <span className="text-sm hidden sm:block" style={{ color: "#555" }}>
            Free scan · No account needed
          </span>
        </div>
      </nav>

      {/* Hero + marketing (collapses when results load) */}
      <HeroSection
        domain={domain}
        status={status}
        onDomainChange={setDomain}
        onScan={handleScan}
      />

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
        className="border-t px-6 py-8 text-center text-sm"
        style={{ borderColor: "#1a1a1a", color: "#444" }}
      >
        <span suppressHydrationWarning>
          © {new Date().getFullYear()} VisibilityAI. Built for growth-stage B2B SaaS teams.
        </span>
      </footer>
    </main>
  );
}
