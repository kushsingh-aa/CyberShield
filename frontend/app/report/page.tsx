"use client";

import React, { useState, useEffect } from "react";

interface StudentReport {
  id: number;
  company: string;
  domain: string;
  pattern: string;
  details: string;
  status: string;
  created_at: string;
}

export default function CommunityReportPage() {
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState("");
  const [pattern, setPattern] = useState("");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API || "http://127.0.0.1:8000";

  const fetchReports = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/reports`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchPatterns = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/patterns`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPatterns(data);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchReports();
    fetchPatterns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!company.trim() || !pattern.trim()) {
      setMessage("Company name and pattern type are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, domain, pattern, details, user_id: "student_verified" })
      });

      if (!res.ok) throw new Error("Submission failed");

      setMessage("Report saved locally as UNVERIFIED. It is not treated as a proven allegation.");
      setCompany("");
      setDomain("");
      setPattern("");
      setDetails("");
      fetchReports();
    } catch (err: any) {
      setMessage(err.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Section Hero */}
      <div className="py-4">
        <div className="kicker-label text-[#56ecc0] mb-1">
          03 / COMMUNITY INTELLIGENCE
        </div>
        <h1 className="text-[28px] sm:text-[32px] font-extrabold leading-[1.16] tracking-[-1.5px] my-2 text-[#eef6f7]">
          Patterns are stronger<br />
          <em className="text-[#56ecc0] not-italic">when we share signals.</em>
        </h1>
        <p className="text-[11px] leading-[1.8] text-[#9badb5] max-w-[680px] m-0">
          Submit a suspicious recruitment pattern to the local database. Reports are unverified and are not proof of wrongdoing.
        </p>
      </div>

      {/* 2-Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left Column: Submit */}
        <div className="bg-[#111b25] border border-[#263640] rounded-[10px] p-5">
          <div className="mb-4">
            <small className="font-mono-code text-[9px] tracking-[1.2px] text-[#718d98] block">
              SUBMIT A SIGNAL
            </small>
            <h2 className="text-[16px] font-bold text-[#eef6f7] mt-1 mb-0.5 tracking-tight">
              Report a suspicious offer
            </h2>
            <p className="text-[10px] text-[#879ba4] leading-[1.6] m-0">
              Share only information you are comfortable storing locally.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-[#c9d7dc] mb-1">
                Company / project name *
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Name shown in the offer"
                className="w-full bg-[#0b141c] border border-[#2b3b45] rounded-[7px] px-3 py-2 text-[11px] text-[#eaf2f4] outline-none focus:border-[#56ecc088]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#c9d7dc] mb-1">
                Website / email domain
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com or hr@example.com"
                className="w-full bg-[#0b141c] border border-[#2b3b45] rounded-[7px] px-3 py-2 text-[11px] text-[#eaf2f4] outline-none focus:border-[#56ecc088]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#c9d7dc] mb-1">
                Pattern type *
              </label>
              <select
                required
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="w-full bg-[#0b141c] border border-[#2b3b45] rounded-[7px] px-3 py-2 text-[11px] text-[#eaf2f4] outline-none focus:border-[#56ecc088]"
              >
                <option value="">Select a pattern</option>
                {patterns.length > 0 ? (
                  patterns.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Upfront payment demand">Upfront payment demand</option>
                    <option value="Suspicious link or lookalike domain">Suspicious link or lookalike domain</option>
                    <option value="Credential / sensitive data request">Credential / sensitive data request</option>
                    <option value="Fake interview or guaranteed job">Fake interview or guaranteed job</option>
                    <option value="Impersonation concern">Impersonation concern</option>
                    <option value="Other suspicious pattern">Other suspicious pattern</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="flex justify-between items-center text-[10px] font-bold text-[#c9d7dc] mb-1">
                <span>What happened?</span>
                <small className="font-mono-code text-[8px] text-[#70858f]">NO PERSONAL DATA</small>
              </label>
              <textarea
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe the warning sign without private details."
                className="w-full bg-[#0b141c] border border-[#2b3b45] rounded-[7px] p-3 text-[11px] text-[#eaf2f4] outline-none leading-[1.7] focus:border-[#56ecc088]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              <span>{submitting ? "Saving..." : "Save local report"}</span>
              <span>↗</span>
            </button>

            {message && (
              <p className="text-[10px] text-[#56ecc0] leading-[1.6] mt-2">
                {message}
              </p>
            )}
          </form>
        </div>

        {/* Right Column: Feed */}
        <div className="bg-[#111b25] border border-[#263640] rounded-[10px] p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <small className="font-mono-code text-[9px] tracking-[1.2px] text-[#718d98] block">
                COMMUNITY SIGNALS
              </small>
              <h2 className="text-[16px] font-bold text-[#eef6f7] mt-1 mb-0.5 tracking-tight">
                Recent reports
              </h2>
              <p className="text-[10px] text-[#879ba4] leading-[1.6] m-0">
                Local demo records, not a verified blacklist.
              </p>
            </div>
            <button
              onClick={fetchReports}
              className="btn-secondary text-[12px] px-2.5 py-1"
            >
              ↻
            </button>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-[10px] text-[#81949d]">Loading reports...</p>
            ) : reports.length === 0 ? (
              <p className="text-[10px] text-[#81949d]">No community reports recorded yet.</p>
            ) : (
              reports.map((r, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-[#2b3b44] bg-[#0e1820] rounded-[7px]"
                >
                  <div className="flex justify-between items-start gap-2">
                    <b className="text-[11px] text-[#eef6f7]">{r.company}</b>
                    <span className="font-mono-code text-[8px] text-[#f3c46c] border border-[#5a4a2e] rounded-[3px] px-1.5 py-0.5 whitespace-nowrap uppercase">
                      {r.status || "UNVERIFIED"}
                    </span>
                  </div>

                  {r.domain && (
                    <span className="font-mono-code text-[9px] text-[#8ea2ab] block mt-0.5">
                      {r.domain}
                    </span>
                  )}

                  <p className="text-[9.5px] text-[#91a2ab] leading-[1.6] my-2">
                    {r.details || `Pattern: ${r.pattern}`}
                  </p>

                  <small className="font-mono-code text-[8px] text-[#6f838d] block text-right">
                    Pattern: {r.pattern}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ethics Callout Box from previous theme */}
      <div className="mt-4 border border-[#51442c] bg-[#211d16] rounded-[8px] p-3.5">
        <b className="text-[10.5px] text-[#f0d08c] block">
          ⚑ &nbsp;Responsible reporting matters
        </b>
        <p className="text-[10px] leading-[1.7] text-[#baa982] mt-1 mb-0">
          Reports are unverified and may be inaccurate. Do not upload identity documents, phone numbers, bank details, or private correspondence.
        </p>
      </div>
    </div>
  );
}
