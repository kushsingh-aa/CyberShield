"use client";

import React, { useState, useEffect } from "react";
import { RotateCw, ShieldAlert, ArrowUp, Globe } from "lucide-react";
import DotMatrix from "@/components/DotMatrix";
import { API_URL } from "@/lib/api";

interface StudentReport {
  id: number;
  company: string;
  domain: string;
  pattern: string;
  details: string;
  status: string;
  created_at: string;
}

const FALLBACK_PATTERNS = [
  "Upfront payment demand",
  "Suspicious link or lookalike domain",
  "Credential / sensitive data request",
  "Fake interview or guaranteed job",
  "Impersonation concern",
  "Other suspicious pattern",
];

export default function CommunityReportPage() {
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [patterns, setPatterns] = useState<string[]>(FALLBACK_PATTERNS);
  const [loading, setLoading] = useState(true);

  // Form
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState("");
  const [pattern, setPattern] = useState("");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/reports`);
      if (res.ok) setReports(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetch(`${API_URL}/api/patterns`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => Array.isArray(data) && data.length > 0 && setPatterns(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!company.trim() || !pattern.trim()) {
      setMessage({ ok: false, text: "Company name and pattern type are required." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, domain, pattern, details }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || (res.status === 429 ? "Too many reports. Try again later." : "Submission failed"));
      }

      setMessage({ ok: true, text: "Saved as UNVERIFIED. It is not treated as a proven allegation." });
      setCompany("");
      setDomain("");
      setPattern("");
      setDetails("");
      fetchReports();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Failed to submit report." });
    } finally {
      setSubmitting(false);
    }
  };

  const patternCounts = reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.pattern] = (acc[r.pattern] || 0) + 1;
    return acc;
  }, {});
  const topPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <h1 className="page-title">Reports</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--amber)]" />
            Community signals are unverified
          </span>
          <button type="button" onClick={fetchReports} className="chip">
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h2 className="card-title">Total Reports</h2>
          <div className="mt-4 flex items-end justify-between gap-3">
            <span className="big-num text-[52px]">{reports.length}</span>
            <DotMatrix count={reports.length} tone="blue" cols={11} rows={5} />
          </div>
        </div>
        <div className="card">
          <h2 className="card-title">Most Reported Pattern</h2>
          <div className="mt-4">
            <div className="text-[22px] tracking-tight leading-tight">{topPattern ? topPattern[0] : "—"}</div>
            <div className="eyebrow mt-2">{topPattern ? `${topPattern[1]} report${topPattern[1] > 1 ? "s" : ""}` : "No reports yet"}</div>
          </div>
        </div>
        <div className="card">
          <h2 className="card-title">Distinct Organisations</h2>
          <div className="mt-4 flex items-end justify-between gap-3">
            <span className="big-num text-[52px]">{new Set(reports.map((r) => r.company.toLowerCase())).size}</span>
            <DotMatrix count={new Set(reports.map((r) => r.company.toLowerCase())).size} tone="green" cols={11} rows={5} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <form onSubmit={handleSubmit} className="card lg:col-span-5 space-y-4">
          <div>
            <h2 className="card-title">Report a Suspicious Offer</h2>
            <p className="eyebrow mt-1">Share only what you are comfortable storing locally.</p>
          </div>

          <div>
            <label className="field-label">Company / project name *</label>
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Name shown in the offer"
              className="field"
            />
          </div>

          <div>
            <label className="field-label">Website / email domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com or hr@example.com"
              className="field"
            />
          </div>

          <div>
            <label className="field-label">Pattern type *</label>
            <div className="flex flex-wrap gap-1.5">
              {patterns.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPattern(p)}
                  className={`px-3 py-1.5 rounded-full text-[12.5px] border transition-colors ${
                    pattern === p
                      ? "bg-[var(--ink)] text-[var(--on-ink)] border-[var(--ink)]"
                      : "bg-[var(--field)] border-transparent text-[var(--ink-2)] hover:border-[var(--line-2)]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <label className="field-label">What happened?</label>
              <span className="text-[12px] text-[var(--muted)]">No personal data</span>
            </div>
            <textarea
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe the warning sign without private details."
              className="field resize-none leading-relaxed"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-dark w-full">
            {submitting ? "Saving…" : "Save report"}
            <ArrowUp className="w-4 h-4" />
          </button>

          {message && (
            <p
              className={`text-[12.5px] rounded-[12px] px-3 py-2 ${
                message.ok ? "bg-[var(--green-soft)] text-[var(--green-fg)]" : "bg-[var(--red-soft)] text-[var(--red-fg)]"
              }`}
            >
              {message.text}
            </p>
          )}
        </form>

        <div className="lg:col-span-7 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="card-title">Recent Reports</h2>
              <span className="eyebrow">Local records, not a verified blacklist</span>
            </div>

            <div className="mt-3 max-h-[520px] overflow-y-auto divide-y divide-[var(--line)]">
              {loading && reports.length === 0 ? (
                <p className="eyebrow py-6">Loading reports…</p>
              ) : reports.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[15px]">No community reports yet</p>
                  <p className="eyebrow mt-1">Be the first to flag a suspicious offer.</p>
                </div>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="py-4 flex gap-3">
                    <span className="w-9 h-9 rounded-full bg-[var(--field)] grid place-items-center text-[13px] font-medium shrink-0 uppercase">
                      {r.company.charAt(0)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-medium truncate">{r.company}</span>
                        <span className="pill pill-amber !text-[11px] uppercase">{r.status || "Unverified"}</span>
                      </div>
                      {r.domain && (
                        <span className="text-[12px] text-[var(--muted)] font-mono-code inline-flex items-center gap-1 mt-0.5">
                          <Globe className="w-3 h-3" />
                          {r.domain}
                        </span>
                      )}
                      {r.details && <p className="text-[13px] text-[var(--ink-2)] leading-snug mt-1.5">{r.details}</p>}
                      <span className="pill pill-gray !text-[11px] mt-2">{r.pattern}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[20px] bg-[var(--amber-soft)] px-5 py-4">
            <div className="text-[14px] font-medium text-[var(--amber-title)]">Responsible reporting matters</div>
            <p className="text-[12.5px] leading-relaxed text-[var(--amber-body)] mt-1">
              Reports are unverified and may be inaccurate. Do not upload identity documents, phone numbers, bank details,
              or private correspondence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
