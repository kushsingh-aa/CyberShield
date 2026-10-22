"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { EvidenceItem } from "@/lib/api";

function severity(points: number) {
  if (points >= 20) return { dot: "bg-[var(--red)]", pill: "pill-red" };
  if (points >= 10) return { dot: "bg-[var(--amber)]", pill: "pill-amber" };
  return { dot: "bg-[var(--green)]", pill: "pill-green" };
}

export default function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  if (!evidence || evidence.length === 0) {
    return (
      <div className="rounded-[16px] bg-[var(--field)] p-6 text-center text-[13px] text-[var(--muted)]">
        No configured red flags found in this sample.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--line)]">
      {evidence.map((item, idx) => {
        const s = severity(item.points);
        const isOpen = open === idx;
        return (
          <li key={idx}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : idx)}
              className="w-full flex items-center gap-3 py-3.5 text-left group"
              aria-expanded={isOpen}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-medium text-[var(--ink)] truncate">{item.title}</span>
                <span className="block text-[12px] text-[var(--muted)] truncate">{item.source}</span>
              </span>
              <span className={`pill ${s.pill} tnum`}>+{item.points}</span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="pl-5 pb-4 pr-2 space-y-2.5 fade-up">
                <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">{item.detail}</p>
                {item.matches && item.matches.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] text-[var(--muted)]">Found in text:</span>
                    {item.matches.map((m) => (
                      <span key={m} className="pill pill-gray !text-[11.5px] font-mono-code">
                        “{m}”
                      </span>
                    ))}
                  </div>
                )}
                {item.advice && (
                  <p className="text-[12.5px] leading-relaxed rounded-[12px] bg-[var(--blue-soft)] text-[var(--blue-fg)] px-3 py-2">
                    <span className="font-medium">Next step · </span>
                    {item.advice}
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
