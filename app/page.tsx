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
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [rateLimited, setRateLimited] = useState(false);
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

  // ── Auth state ───────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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

      // Auto-save scan to Supabase if user is logged in
      if (user) {
        supabase.from("scans").insert({
          user_id: user.id,
          domain: trimmed,
          score: data.overallScore ?? null,
          gemini_score: data.engineScores?.gemini ?? null,
          claude_score: data.engineScores?.claude ?? null,
          chatgpt_score: data.engineScores?.chatgpt ?? null,
          perplexity_score: data.engineScores?.perplexity ?? null,
          icp_data: icpData.icp ?? null,
          results: data.results ?? null,
        }).then(({ error }) => {
          if (error) console.error("[scan] Supabase save error:", error);
        });
      }
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
      className="min-h-screen overflow-x-hidden"
      style={{ background: "#ffffff", color: "#0a0a0a" }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 px-6 py-4"
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e5e5e0",
        }}
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          {/* Logo */}
          <span
            style={{
              fontFamily: "var(--font-sans, system-ui)",
              fontWeight: 700,
              fontSize: 16,
              color: "#0a0a0a",
              letterSpacing: "-0.02em",
            }}
          >
            sparrwo
          </span>

          {/* Nav CTA */}
          {user ? (
            <a
              href="/dashboard"
              style={{
                background: "#0a0a0a",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-sans, system-ui)",
                cursor: "pointer",
                transition: "background 150ms ease",
                textDecoration: "none",
                display: "inline-block",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f97316")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#0a0a0a")}
            >
              Dashboard
            </a>
          ) : (
            <a
              href="/login"
              style={{
                background: "#0a0a0a",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-sans, system-ui)",
                cursor: "pointer",
                transition: "background 150ms ease",
                textDecoration: "none",
                display: "inline-block",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f97316")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#0a0a0a")}
            >
              Sign In
            </a>
          )}
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
        <div style={{ padding: "24px", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              background: "#f7f7f5",
              border: "1px solid #e5e5e0",
              borderRadius: 8,
              padding: "20px 24px",
              maxWidth: 480,
              width: "100%",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-sans, system-ui)",
                fontSize: 14,
                color: "#555550",
                marginBottom: 16,
              }}
            >
              You&apos;ve used your 3 free scans today.{" "}
              <span style={{ color: "#0a0a0a", fontWeight: 600 }}>Upgrade for unlimited scans.</span>
            </p>
            <a
              href="/pricing"
              style={{
                display: "inline-block",
                background: "#f97316",
                color: "#ffffff",
                borderRadius: 6,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--font-sans, system-ui)",
                textDecoration: "none",
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#ea6c00")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f97316")}
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
        style={{
          background: "#0a0a0a",
          borderTop: "1px solid #1a1a1a",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              fontFamily: "var(--font-sans, system-ui)",
              fontWeight: 700,
              fontSize: 14,
              color: "#ffffff",
            }}
          >
            sparrwo
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <span
            suppressHydrationWarning
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              color: "#666660",
            }}
          >
            © 2026
          </span>
          <span style={{ color: "#2a2a2a", margin: "0 10px" }}>·</span>
          <a
            href="/privacy"
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              color: "#666660",
              textDecoration: "none",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666660")}
          >
            Privacy
          </a>
          <span style={{ color: "#2a2a2a", margin: "0 10px" }}>·</span>
          <a
            href="/terms"
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              color: "#666660",
              textDecoration: "none",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666660")}
          >
            Terms
          </a>
        </div>
      </footer>
    </main>
  );
}
