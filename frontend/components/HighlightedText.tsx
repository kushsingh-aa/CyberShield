import React from "react";
import type { EvidenceItem } from "@/lib/api";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function markClass(points: number) {
  if (points >= 20) return "bg-[var(--red-soft)] text-[var(--red-fg)]";
  if (points >= 10) return "bg-[var(--amber-soft)] text-[var(--amber-fg)]";
  return "bg-[var(--green-soft)] text-[var(--green-fg)]";
}

/** Renders text with every phrase that triggered a rule highlighted, colored by severity. */
export default function HighlightedText({ text, evidence }: { text: string; evidence: EvidenceItem[] }) {
  const phrasePoints = new Map<string, { points: number; title: string }>();
  for (const e of evidence) {
    for (const m of e.matches || []) {
      const key = m.toLowerCase();
      const prev = phrasePoints.get(key);
      if (!prev || e.points > prev.points) phrasePoints.set(key, { points: e.points, title: e.title });
    }
  }

  if (phrasePoints.size === 0) return <>{text}</>;

  // Longest phrases first so overlapping matches prefer the more specific one
  const pattern = new RegExp(
    `(${[...phrasePoints.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})`,
    "gi"
  );

  return (
    <>
      {text.split(pattern).map((part, i) => {
        const hit = phrasePoints.get(part.toLowerCase());
        return hit ? (
          <mark key={i} title={hit.title} className={`rounded px-0.5 ${markClass(hit.points)}`}>
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        );
      })}
    </>
  );
}
