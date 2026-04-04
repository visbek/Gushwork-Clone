"use client";

import { useState, useEffect, useRef } from "react";

const CIRC = 2 * Math.PI * 52;

function scoreColor(score: number) {
  if (score > 66) return "#10b981";
  if (score >= 33) return "#f59e0b";
  return "#ef4444";
}

function useCountUp(target: number, active: boolean, duration = 1500) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, active, duration]);

  return value;
}

export function ScoreCircle({
  score,
  active,
}: {
  score: number;
  active: boolean;
}) {
  const display = useCountUp(score, active);
  const [go, setGo] = useState(false);

  useEffect(() => {
    if (active) {
      const t = setTimeout(() => setGo(true), 80);
      return () => clearTimeout(t);
    }
    setGo(false);
  }, [active]);

  const offset = go ? CIRC * (1 - score / 100) : CIRC;
  const color = scoreColor(score);

  return (
    <div className="relative" style={{ width: 160, height: 160 }}>
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <circle cx="80" cy="80" r="52" fill="none" stroke="#1c1c1c" strokeWidth="8" />
        <circle
          cx="80"
          cy="80"
          r="52"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
          style={{
            transition:
              "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease",
            filter: `drop-shadow(0 0 10px ${color}55)`,
          }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        <span className="text-4xl font-extrabold" style={{ color }}>
          {display}
        </span>
        <span className="text-xs mt-0.5" style={{ color: "#555" }}>
          / 100
        </span>
      </div>
    </div>
  );
}
