import React from "react";
import Link from "next/link";
import { MoreHorizontal, AlertTriangle } from "lucide-react";
import { levelOf, LEVEL_META, type CheckResult, type Stats } from "@/lib/api";

interface ScoreCardProps {
  result: CheckResult | null;
  stats?: Stats | null;
}

export default function ScoreCard({ result, stats }: ScoreCardProps) {
  const b = result?.breakdown || {};
  const rows = [
    { label: "Letter analysis", value: b.letter_score, fill: "hatch-green" },
    { label: "Company & domain", value: b.company_score, fill: "hatch-bluebar" },
    { label: "Peer reports", value: b.reports_score, fill: "hatch-pink" },
  ];

  const level = result ? levelOf(result.score, result.level) : null;
  const meta = level ? LEVEL_META[level] : null;

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="card-title">Risk Score</h2>
        <Link href="/system" className="icon-btn" aria-label="How scoring works" title="How scoring works">
          <MoreHorizontal className="w-4 h-4" />
        </Link>
      </div>

      <div className="mt-5 flex items-end gap-3 flex-wrap">
        {result ? (
          <>
            <span className="big-num text-[68px]">{result.score}</span>
            <span className="text-[22px] text-[var(--faint)] mb-1.5 tracking-tight">/100</span>
            {meta && <span className={`pill ${meta.pill} mb-3`}>{result.badge_label || meta.label}</span>}
          </>
        ) : (
          <>
            <span className="big-num text-[68px] text-[var(--ink)]">{stats ? Math.round(stats.avg_risk_score) : "—"}</span>
            <span className="text-[22px] text-[var(--faint)] mb-1.5 tracking-tight">avg</span>
            <span className="pill pill-gray mb-3">{stats ? `${stats.total_checks} checks` : "No data"}</span>
          </>
        )}
      </div>
      <p className="eyebrow mt-2">
        {result ? meta?.title : "Average across every check so far. Run one to see its breakdown."}
      </p>

      <div className="mt-5 pt-5 border-t border-[var(--line)] space-y-5 flex-1">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-[13px] mb-2">
              <span className="text-[var(--ink-2)]">{r.label}</span>
              <span className="tnum font-medium">{r.value ?? "—"}</span>
            </div>
            <div className="h-2.5 rounded-full bg-[var(--track)] overflow-hidden">
              <div
                className={`h-full rounded-full bar-grow ${r.fill}`}
                style={{ width: `${r.value ? Math.max(r.value, 3) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {b.fees_demanded && (
        <div className="mt-5 flex items-start gap-2 rounded-[14px] bg-[var(--red-soft)] text-[var(--red-fg)] px-3 py-2.5 text-[12.5px] leading-snug">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          Upfront fee demand detected, so the score was raised to at least 75.
        </div>
      )}
    </div>
  );
}
