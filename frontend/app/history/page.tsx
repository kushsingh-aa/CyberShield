"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, RotateCw, Search } from "lucide-react";
import { API_URL, LEVEL_META, levelOf, type HistoryItem, type Level } from "@/lib/api";

const FILTERS: { key: "all" | Level; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high", label: "High risk" },
  { key: "caution", label: "Caution" },
  { key: "low", label: "Lower risk" },
];

const BAR: Record<Level, string> = {
  high: "bg-[var(--red)]",
  caution: "bg-[var(--amber)]",
  low: "bg-[var(--green)]",
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | Level>("all");
  const [query, setQuery] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    fetch(`${API_URL}/api/history?limit=200`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Could not load history"))))
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (filter !== "all" && levelOf(it.score, it.level) !== filter) return false;
      if (!q) return true;
      return [it.company, it.sender, it.url, it.document_name].some((v) => v?.toLowerCase().includes(q));
    });
  }, [items, filter, query]);

  const counts = useMemo(() => {
    const c = { all: items.length, high: 0, caution: 0, low: 0 };
    for (const it of items) c[levelOf(it.score, it.level)]++;
    return c;
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <h1 className="page-title">History</h1>
        <div className="flex flex-wrap items-center gap-2">
          <label className="chip !pr-1.5 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company, sender, link"
              className="bg-transparent outline-none flex-1 min-w-0 text-[var(--ink)] placeholder:text-[var(--placeholder)]"
            />
          </label>
          <button type="button" onClick={load} className="chip">
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`nav-link ${filter === f.key ? "active" : ""}`}
          >
            {f.label}
            <span className="text-[11px] opacity-60 tnum">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="card !p-0 overflow-hidden">
        {error ? (
          <div className="p-10 text-center">
            <p className="text-[15px]">{error}</p>
            <p className="eyebrow mt-1">Check that the backend is running on {API_URL}.</p>
          </div>
        ) : loading && items.length === 0 ? (
          <p className="eyebrow p-8">Loading history…</p>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[15px]">{items.length === 0 ? "No checks yet" : "Nothing matches this filter"}</p>
            <p className="eyebrow mt-1">
              {items.length === 0 ? (
                <>
                  Run one from the{" "}
                  <Link href="/" className="text-[var(--blue)] hover:underline">
                    Overview
                  </Link>
                  . Demo runs are not listed.
                </>
              ) : (
                "Try a different filter or search."
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-[var(--muted)] border-b border-[var(--line)]">
                  <th className="font-normal py-3 pl-[22px] pr-3">Organisation</th>
                  <th className="font-normal py-3 px-3 w-[180px]">Score</th>
                  <th className="font-normal py-3 px-3">Level</th>
                  <th className="font-normal py-3 px-3 text-right">Signals</th>
                  <th className="font-normal py-3 px-3 text-right">Checked</th>
                  <th className="py-3 pr-[22px] w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {visible.map((it) => {
                  const lvl = levelOf(it.score, it.level);
                  return (
                    <tr key={it.id} className="group hover:bg-[var(--hover)] transition-colors">
                      <td className="py-3.5 pl-[22px] pr-3 max-w-[320px]">
                        <Link href={`/result/${it.id}`} className="block">
                          <span className="block font-medium truncate">{it.company || "Unspecified"}</span>
                          <span className="block text-[12px] text-[var(--muted)] truncate">
                            {it.sender || it.url || it.document_name || "Pasted text"}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <span className="tnum font-medium w-7">{it.score}</span>
                          <div className="w-24 h-1.5 rounded-full bg-[var(--track)] overflow-hidden">
                            <div className={`h-full rounded-full ${BAR[lvl]}`} style={{ width: `${Math.max(it.score, 3)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`pill ${LEVEL_META[lvl].pill}`}>{LEVEL_META[lvl].label}</span>
                      </td>
                      <td className="py-3.5 px-3 text-right tnum">{it.evidence_count}</td>
                      <td className="py-3.5 px-3 text-right text-[var(--muted)] whitespace-nowrap" title={new Date(it.created_at).toLocaleString()}>
                        {timeAgo(it.created_at)}
                      </td>
                      <td className="py-3.5 pr-[22px]">
                        <Link
                          href={`/result/${it.id}`}
                          className="icon-btn sm opacity-60 group-hover:opacity-100"
                          aria-label={`Open report for ${it.company || "check"}`}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
