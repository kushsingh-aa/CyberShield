"use client";

import React, { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import type { CheckResult } from "@/lib/api";

interface Stage {
  label: string;
  value: number | null;
  tip: string;
}

// Placeholder bar heights shown before any check has run
const GHOST = [86, 68, 44, 74, 80];

function buildStages(result: CheckResult | null): Stage[] {
  if (!result) {
    return [
      { label: "Letter analysis", value: null, tip: "Weight 45%" },
      { label: "Company intel", value: null, tip: "Weight 35%" },
      { label: "Peer reports", value: null, tip: "Weight 20%" },
      { label: "Weighted blend", value: null, tip: "0.45 · L + 0.35 · C + 0.20 · R" },
      { label: "Final score", value: null, tip: "Overrides applied" },
    ];
  }
  const b = result.breakdown || {};
  const l = b.letter_score ?? 0;
  const c = b.company_score ?? 0;
  const r = b.reports_score ?? 0;
  const blend = Math.round(0.45 * l + 0.35 * c + 0.2 * r);
  const overridden = result.score > blend;
  return [
    { label: "Letter analysis", value: l, tip: `${l} raw · Weight 45% · Adds ${(0.45 * l).toFixed(1)}` },
    { label: "Company intel", value: c, tip: `${c} raw · Weight 35% · Adds ${(0.35 * c).toFixed(1)}` },
    { label: "Peer reports", value: r, tip: `${r} raw · Weight 20% · Adds ${(0.2 * r).toFixed(1)}` },
    { label: "Weighted blend", value: blend, tip: `Blend ${blend} of 100` },
    {
      label: "Final score",
      value: result.score,
      tip: overridden
        ? `${result.score} · Override +${result.score - blend}${b.fees_demanded ? " · Fee demand" : ""}`
        : `${result.score} · No override`,
    },
  ];
}

interface PipelineChartProps {
  result: CheckResult | null;
  /** Frosted overlay rendered over the lower part of the plot */
  overlay?: React.ReactNode;
  plotHeight?: number;
}

export default function PipelineChart({ result, overlay, plotHeight = 300 }: PipelineChartProps) {
  const stages = buildStages(result);
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? 4;
  const idle = !result;

  const heights = stages.map((s, i) => (s.value === null ? GHOST[i] : Math.max(s.value, 2)));

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="flex items-center justify-between px-[22px] pt-5 pb-3">
        <div className="flex items-center gap-3">
          <h2 className="card-title">Signal Pipeline</h2>
          {idle && <span className="pill pill-gray">Awaiting a check</span>}
        </div>
        <Link href="/system" className="icon-btn" aria-label="How scoring works" title="How scoring works">
          <MoreHorizontal className="w-4 h-4" />
        </Link>
      </div>

      <div className="relative">
        <div className="flex pl-[22px] pr-0 overflow-x-auto no-scrollbar">
          {/* Y axis */}
          <div className="relative w-9 shrink-0" style={{ marginTop: 74, height: plotHeight }}>
            {[100, 75, 50, 25].map((t) => (
              <span
                key={t}
                className="absolute left-0 -translate-y-1/2 text-[11px] text-[var(--muted)] tnum"
                style={{ top: `${100 - t}%` }}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="relative flex-1 min-w-[560px] grid grid-cols-5">
            {/* Funnel connectors */}
            <svg
              className="absolute left-0 right-0 pointer-events-none"
              style={{ top: 74, height: plotHeight, width: "100%" }}
              viewBox="0 0 500 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <linearGradient id="conn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: idle ? "var(--conn-idle-a)" : "var(--conn-a)" }} />
                  <stop offset="100%" style={{ stopColor: idle ? "var(--conn-idle-b)" : "var(--conn-b)" }} />
                </linearGradient>
              </defs>
              {heights.slice(0, -1).map((h, i) => {
                const x1 = i * 100 + 78;
                const x2 = (i + 1) * 100;
                const y1 = 100 - h;
                const y2 = 100 - heights[i + 1];
                return <polygon key={i} points={`${x1},${y1} ${x2},${y2} ${x2},100 ${x1},100`} fill="url(#conn)" />;
              })}
            </svg>

            {stages.map((s, i) => {
              const isActive = !idle && i === active;
              return (
                <div
                  key={s.label}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  className="relative border-l border-[var(--line)] first:border-l-0"
                  style={{
                    background: isActive
                      ? "linear-gradient(to bottom, var(--col-a) 0%, var(--col-b) 45%, var(--col-c) 100%)"
                      : undefined,
                  }}
                >
                  <div className="px-3 h-[74px]">
                    <div className={`text-[12px] ${isActive ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{s.label}</div>
                    <div
                      className={`big-num text-[26px] mt-1.5 ${
                        isActive ? "text-[var(--ink)]" : idle ? "text-[var(--faint)]" : "text-[var(--muted-num)]"
                      }`}
                    >
                      {s.value === null ? "—" : s.value}
                    </div>
                  </div>

                  <div className="relative" style={{ height: plotHeight }}>
                    <div
                      className={`absolute bottom-0 left-0 w-[78%] bar-grow ${
                        idle
                          ? "hatch-ghost"
                          : isActive
                          ? "solid-blue"
                          : "hatch-blue"
                      }`}
                      style={{ height: `${heights[i]}%` }}
                    >
                      {!idle && (
                        <span
                          className={`absolute left-1/2 -translate-x-1/2 -top-2.5 h-[5px] w-6 rounded-full ${
                            isActive ? "bg-[var(--marker-active)]" : "bg-[var(--marker)]"
                          }`}
                        />
                      )}
                    </div>

                    {isActive && (
                      <div
                        className="absolute z-10 left-[39%] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-[var(--tooltip-bg)] border border-[var(--line)] shadow-[0_8px_20px_-8px_rgba(15,15,18,.25)] px-3 py-1.5 text-[11.5px] text-[var(--ink-2)] tnum fade-up"
                        style={{ bottom: `calc(${heights[i]}% + 18px)` }}
                      >
                        {s.tip}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {overlay && <div className="absolute left-3 right-3 bottom-3 sm:left-4 sm:right-4 sm:bottom-4 z-20">{overlay}</div>}
      </div>
    </div>
  );
}
