import React from "react";
import { Lightbulb } from "lucide-react";
import type { CheckResult, EvidenceItem, Stats } from "@/lib/api";

export default function InsightCard({ result, stats }: { result: CheckResult | null; stats: Stats | null }) {
  let big = "—";
  let headline = "Run a check to get an insight.";
  let body = "The biggest risk driver and your next step will appear here.";
  let progress = 0;

  if (result) {
    const ev = result.evidence || [];
    const total = ev.reduce((s, e) => s + e.points, 0);
    const top = ev.reduce<EvidenceItem | null>((best, e) => (!best || e.points > best.points ? e : best), null);
    if (top && total > 0) {
      const share = Math.round((top.points / total) * 100);
      big = `${share}%`;
      progress = share;
      headline = `of flagged risk comes from “${top.title}”.`;
    } else {
      big = `${result.score}`;
      progress = result.score;
      headline = "No red flags were triggered in this offer.";
    }
    body = result.next_steps?.[0] || body;
  } else if (stats && stats.total_checks > 0) {
    const rate = Math.round((stats.high_risk_flagged / stats.total_checks) * 100);
    big = `${rate}%`;
    progress = rate;
    headline = "of checks so far were flagged high risk.";
    body = `${stats.high_risk_flagged} of ${stats.total_checks} offers crossed the high-risk threshold, with an average score of ${Math.round(
      stats.avg_risk_score
    )}.`;
  }

  return (
    <div className="insight-card h-full min-h-[300px] p-5 flex flex-col">
      <div className="insight-glass" />
      <div className="relative">
        <span className="glass-chip">
          <Lightbulb className="w-3.5 h-3.5" />
          Insight
        </span>
      </div>
      <div className="relative mt-auto pt-10">
        <div className="big-num text-[64px] drop-shadow-[0_2px_12px_rgba(0,0,0,.12)]">{big}</div>
        <p className="mt-3 text-[16px] font-medium leading-snug max-w-[34ch]">{headline}</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/80 max-w-[42ch] line-clamp-3">{body}</p>
        <div className="mt-5 h-[3px] rounded-full bg-white/25 overflow-hidden">
          <div className="h-full bg-white rounded-full bar-grow" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
