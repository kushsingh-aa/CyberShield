import React from "react";
import type { EvidenceItem } from "@/lib/api";

const W = 300;
const H = 150;
const TOP = 26;

function shortLabel(key: string) {
  const word = key.split(/[_\s-]/)[0] || key;
  const cap = word.charAt(0).toUpperCase() + word.slice(1);
  return cap.length > 9 ? cap.slice(0, 8) + "…" : cap;
}

export default function EvidenceChart({ evidence }: { evidence: EvidenceItem[] }) {
  const items = evidence.slice(0, 10);

  if (items.length === 0) {
    return (
      <div className="h-[190px] grid place-items-center text-center">
        <div>
          <svg viewBox="0 0 300 60" className="w-full h-[60px]" aria-hidden>
            <path d="M0 45 H60 V38 H120 V42 H180 V34 H240 V40 H300" fill="none" style={{ stroke: "var(--line)" }} strokeWidth="2" />
          </svg>
          <p className="eyebrow mt-3">Each flagged signal appears here with its points.</p>
        </div>
      </div>
    );
  }

  const max = Math.max(...items.map((e) => e.points), 10);
  const seg = W / items.length;
  const y = (p: number) => H - (p / max) * (H - TOP);
  const peakIdx = items.reduce((best, e, i) => (e.points > items[best].points ? i : best), 0);

  let path = "";
  items.forEach((e, i) => {
    const x0 = i * seg;
    const x1 = x0 + seg;
    const yy = y(e.points);
    path += i === 0 ? `M${x0} ${yy} H${x1}` : ` V${yy} H${x1}`;
  });

  const peakX = peakIdx * seg + seg / 2;
  const peakY = y(items[peakIdx].points);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" role="img" aria-label="Points per evidence signal">
        <defs>
          <pattern id="pinkHatch" width="5" height="5" patternUnits="userSpaceOnUse">
            <rect width="1.6" height="5" fill="#f28ab2" />
          </pattern>
          <linearGradient id="pinkFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--card)", stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: "var(--card)", stopOpacity: 0.85 }} />
          </linearGradient>
        </defs>
        {items.map((e, i) => {
          const yy = y(e.points);
          return (
            <g key={i}>
              <rect x={i * seg + 1} y={yy} width={seg - 2} height={H - yy} fill="url(#pinkHatch)" />
              <rect x={i * seg + 1} y={yy} width={seg - 2} height={H - yy} fill="url(#pinkFade)" />
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#ec4b8a" strokeWidth="2.2" strokeLinejoin="round" />
        <line x1={peakX} x2={peakX} y1={peakY} y2={H} stroke="#ec4b8a" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx={peakX} cy={peakY} r="3.5" fill="#ec4b8a" style={{ stroke: "var(--card)" }} strokeWidth="1.5" />
        <g transform={`translate(${Math.min(Math.max(peakX, 22), W - 22)} ${peakY - 16})`}>
          <rect x="-20" y="-11" width="40" height="20" rx="10" style={{ fill: "var(--card)", stroke: "var(--line)" }} />
          <text x="0" y="3" textAnchor="middle" fontSize="10.5" fontWeight="600" style={{ fill: "var(--ink)" }}>
            +{items[peakIdx].points}
          </text>
        </g>
      </svg>
      <div className="flex mt-2">
        {items.map((e, i) => (
          <span key={i} className="flex-1 text-center text-[10.5px] text-[var(--muted)] truncate" title={e.title}>
            {shortLabel(e.key)}
          </span>
        ))}
      </div>
    </div>
  );
}
