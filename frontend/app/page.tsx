"use client";

import React, { useState, useEffect, useRef } from "react";
import RiskGauge from "@/components/RiskGauge";
import EvidenceList from "@/components/EvidenceList";

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats state
  const [stats, setStats] = useState({
    checks: 0,
    reports: 0,
    average: 0,
    high: 0
  });

  // Form state
  const [offerText, setOfferText] = useState("");
  const [company, setCompany] = useState("");
  const [sender, setSender] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cybershield_gemini_key") || "";
      if (saved) setApiKey(saved);
    }
  }, []);

  // Analysis result state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<any>(null);

  // Dynamic demo presets from API
  const [demoCases, setDemoCases] = useState<{ key: string; label: string }[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API || "http://127.0.0.1:8000";

  const fetchStats = () => {
    fetch(`${apiUrl}/api/stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setStats({
            checks: data.total_checks ?? 0,
            reports: data.community_reports ?? 0,
            average: data.avg_risk_score ?? 0,
            high: data.high_risk_flagged ?? 0
          });
        }
      })
      .catch(() => {});
  };

  const fetchDemoCases = () => {
    fetch(`${apiUrl}/api/demo-cases`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDemoCases(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStats();
    fetchDemoCases();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg("");
    }
  };

  const handleRunInvestigation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!offerText.trim() && !selectedFile && !company.trim() && !sender.trim() && !url.trim()) {
      setErrorMsg("Paste offer text, attach a document, or provide recruiter domain details.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (selectedFile) formData.append("document", selectedFile);
      formData.append("text", offerText);
      formData.append("company", company);
      formData.append("sender", sender);
      formData.append("url", url);
      if (apiKey.trim()) formData.append("api_key", apiKey.trim());

      const res = await fetch(`${apiUrl}/api/check`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Investigation request failed");
      }

      const data = await res.json();
      setResult(data);
      fetchStats();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to inspect offer.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = async (demoKey: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${apiUrl}/api/demo/${demoKey}`);
      if (!res.ok) throw new Error("Demo case load failed");
      const data = await res.json();
      setResult(data);
      setOfferText(data.sanitized_preview || "");
      setCompany(data.company || "");
      setSender(data.sender || "");
      setUrl(data.url || "");
      fetchStats();
    } catch (err: any) {
      setErrorMsg(err.message || "Error loading demo");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setResult(null);
    setOfferText("");
    setCompany("");
    setSender("");
    setUrl("");
    setSelectedFile(null);
    setErrorMsg("");
  };

  return (
    <div className="space-y-4">
      {/* Signature Previous Theme Hero Banner */}
      <section className="hero-container">
        <div className="p-7 sm:p-8 flex flex-col justify-center">
          <div className="kicker-label text-[#56ecc0] mb-1">
            STUDENT CYBER-SAFETY
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-extrabold leading-[1.16] tracking-[-1.5px] my-2 text-[#eef6f7]">
            Trust the offer.<br />
            <em className="text-[#56ecc0] not-italic">Verify the evidence.</em>
          </h1>
          <p className="text-[11px] leading-[1.8] text-[#9badb5] max-w-[480px] m-0">
            Investigate internship offers using explainable risk signals, domain age checks, brand lookalike detection, and student-reported patterns.
          </p>

          <div className="flex gap-2 flex-wrap mt-4">
            <span className="px-2.5 py-1.5 border border-[#30464a] rounded-[5px] bg-[#12252a] text-[#c2d4d8] text-[9.5px]">
              ✳ Evidence-led
            </span>
            <span className="px-2.5 py-1.5 border border-[#30464a] rounded-[5px] bg-[#12252a] text-[#c2d4d8] text-[9.5px]">
              ⌁ Domain signals
            </span>
            <span className="px-2.5 py-1.5 border border-[#30464a] rounded-[5px] bg-[#12252a] text-[#c2d4d8] text-[9.5px]">
              ◉ Community intelligence
            </span>
          </div>
        </div>

        {/* Decorative Art with Rings and Floating Badges */}
        <div className="hero-art hidden md:block">
          <div className="ring-outer" />
          <div className="ring-inner" />
          <div className="big-shield-icon">✓</div>

          <div className="float-badge right-[5%] top-[28px]">
            <span>✓</span>
            <div>
              <b className="block text-[9.5px] text-[#eef6f7]">Evidence explained</b>
              <small className="block text-[#8da0aa] text-[8px] mt-0.5">Every signal has a reason</small>
            </div>
          </div>

          <div className="float-badge left-[4%] bottom-[25px] !text-[#a3a3ff]">
            <span>⌁</span>
            <div>
              <b className="block text-[9.5px] text-[#eef6f7]">Pattern matching</b>
              <small className="block text-[#8da0aa] text-[8px] mt-0.5">Connect warning signs</small>
            </div>
          </div>
        </div>
      </section>



      {/* 2-Column Split: Investigation Form (Left) & Live Findings (Right) */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.06fr_0.94fr] gap-4 items-start">
        {/* Left Column: Form */}
        <div className="bg-[#111b25] border border-[#263640] rounded-[10px] p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <small className="font-mono-code text-[9px] tracking-[1.2px] text-[#718d98] block">
                01 / INVESTIGATION
              </small>
              <h2 className="text-[16px] font-bold text-[#eef6f7] mt-1 mb-0.5 tracking-tight">
                Inspect an offer
              </h2>
              <p className="text-[10px] text-[#879ba4] leading-[1.6] m-0">
                Paste a recruiter message or upload a text-based PDF/TXT.
              </p>
            </div>
            <span className="w-[38px] h-[38px] rounded-[8px] border border-[#31534b] bg-[#14302c] text-[#56ecc0] grid place-items-center text-[19px] shrink-0 font-bold">
              ⌕
            </span>
          </div>

          {/* Demos Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-[#0c151d] border border-[#283943] rounded-[8px] p-3 mb-4">
            <div>
              <b className="block text-[10.5px] text-[#eef6f7]">Try a live demo case</b>
              <small className="block text-[#8498a2] text-[9px] mt-0.5 leading-[1.4]">
                See the engine work with real-world scam patterns.
              </small>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {demoCases.length > 0 ? (
                demoCases.map((dc, idx) => {
                  const colorClass = dc.key.includes("deposit") || dc.key.includes("scam")
                    ? "demo-btn red"
                    : dc.key.includes("lookalike") || dc.key.includes("spoof")
                    ? "demo-btn yellow"
                    : dc.key.includes("safer") || dc.key.includes("clean")
                    ? "demo-btn green"
                    : ["demo-btn red", "demo-btn yellow", "demo-btn green"][idx % 3];

                  return (
                    <button
                      key={dc.key}
                      type="button"
                      onClick={() => handleLoadDemo(dc.key)}
                      className={colorClass}
                    >
                      {dc.label}
                    </button>
                  );
                })
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleLoadDemo("deposit")}
                    className="demo-btn red"
                  >
                    Deposit Demand Fraud
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadDemo("lookalike")}
                    className="demo-btn yellow"
                  >
                    Lookalike Brand Spoofing
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadDemo("safer")}
                    className="demo-btn green"
                  >
                    Lower-Risk Sample Offer
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleRunInvestigation} className="space-y-3.5">
            <div>
              <label className="flex justify-between items-center text-[10.5px] font-bold text-[#c9d7dc] mb-1.5">
                <span>Offer letter / recruiter message</span>
                <small className="font-mono-code text-[8px] text-[#70858f] tracking-[0.3px]">
                  PASTE TEXT
                </small>
              </label>
              <textarea
                rows={5}
                value={offerText}
                onChange={(e) => setOfferText(e.target.value)}
                placeholder="Paste the offer letter, recruiter email, or internship message..."
                className="w-full bg-[#0b141c] border border-[#2b3b45] rounded-[7px] p-3 text-[11px] text-[#eaf2f4] outline-none leading-[1.7] focus:border-[#56ecc088] focus:ring-1 focus:ring-[#56ecc033]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#c9d7dc] mb-1">
                  Company / organisation
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Microsoft, Infosys"
                  className="w-full bg-[#0b141c] border border-[#2b3b45] rounded-[7px] px-3 py-2.5 text-[11px] text-[#eaf2f4] outline-none focus:border-[#56ecc088]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#c9d7dc] mb-1">
                  Sender email
                </label>
                <input
                  type="email"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="hr@micros0ft-careers.com"
                  className="w-full bg-[#0b141c] border border-[#2b3b45] rounded-[7px] px-3 py-2.5 text-[11px] text-[#eaf2f4] outline-none focus:border-[#56ecc088]"
                />
              </div>
            </div>

            <div>
              <label className="flex justify-between items-center text-[10px] font-bold text-[#c9d7dc] mb-1">
                <span>Website or offer link</span>
                <small className="font-mono-code text-[8px] text-[#70858f]">OPTIONAL</small>
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://micros0ft-careers.com/apply"
                className="w-full bg-[#0b141c] border border-[#2b3b45] rounded-[7px] px-3 py-2.5 text-[11px] text-[#eaf2f4] outline-none focus:border-[#56ecc088]"
              />
            </div>

            {/* Upload Attachment Box */}
            <div className="flex items-center gap-2.5 flex-wrap p-2.5 border border-dashed border-[#354952] rounded-[8px] bg-[#0c151d]">
              <span className="w-[30px] h-[30px] grid place-items-center bg-[#1c3036] text-[#56ecc0] rounded-[6px] text-[16px]">
                ↥
              </span>
              <div className="flex-1 min-w-[120px]">
                <b className="block text-[10px] text-[#eef6f7]">Attach offer document</b>
                <small className="block text-[8px] text-[#7f939d] mt-0.5">
                  PDF or TXT · selectable text · auto PII redacted
                </small>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.txt"
                hidden
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 border border-[#394b54] rounded-[5px] text-[9.5px] text-[#c0d0d5] bg-transparent hover:bg-[#18252d]"
              >
                Choose file
              </button>
              <small className="text-[9px] text-[#8ea2ab] block w-full mt-1">
                {selectedFile ? selectedFile.name : "No file selected"}
              </small>
            </div>

            {/* Zero-Dataset AI Gemini API Key Input */}
            <div className="p-2.5 bg-[#0c151d] border border-[#283943] rounded-[8px]">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-bold text-[#c9d7dc] flex items-center gap-1.5">
                  <span className="text-[#56ecc0] font-bold">⚡ Zero-Dataset AI</span>
                  <small className="text-[#788e96] font-mono-code text-[8px]">GEMINI KEY (OPTIONAL)</small>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[9px] text-[#56ecc0] hover:underline"
                >
                  Get free key ↗
                </a>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("cybershield_gemini_key", e.target.value);
                  }
                }}
                placeholder="AIzaSy... (leave empty to use backend/.env)"
                className="w-full bg-[#0b141c] border border-[#2b3b45] rounded-[6px] px-2.5 py-1.5 text-[10px] font-mono text-[#eaf2f4] outline-none focus:border-[#56ecc088]"
              />
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="bg-[#41232b] text-[#ffb0b8] border border-[#70404a] rounded-[6px] p-2.5 text-[10px]">
                {errorMsg}
              </div>
            )}

            {/* Submit Bar */}
            <div className="flex items-center justify-between gap-2.5 pt-2">
              <small className="text-[9px] text-[#7f929b] leading-[1.6]">
                ◈ Local lab demo. PII is automatically sanitized.
              </small>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                <span>{loading ? "Analyzing..." : "Run investigation"}</span>
                <span>↗</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Findings */}
        <div className="bg-[#111b25] border border-[#263640] rounded-[10px] p-5 min-h-[480px]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <small className="font-mono-code text-[9px] tracking-[1.2px] text-[#718d98] block">
                02 / FINDINGS
              </small>
              <h2 className="text-[16px] font-bold text-[#eef6f7] mt-1 mb-0.5 tracking-tight">
                Investigation report
              </h2>
              <p className="text-[10px] text-[#879ba4] leading-[1.6] m-0">
                Evidence appears here after analysis.
              </p>
            </div>

            <span className="font-mono-code text-[8px] tracking-[0.6px] border border-[#344650] rounded-[4px] px-2 py-1 text-[#91a5ae] whitespace-nowrap">
              {loading ? "SCANNING..." : result ? "COMPLETED" : "AWAITING INPUT"}
            </span>
          </div>

          {!result ? (
            /* Empty State */
            <div className="text-center py-10 px-4">
              <div className="w-[85px] h-[85px] border border-[#30504b] rounded-[27px] bg-[#142c2a] text-[#56ecc0] text-[36px] grid place-items-center mx-auto mb-4 shadow-[0_0_32px_#56ecc010]">
                ⌕
              </div>
              <h3 className="text-[14px] font-bold text-[#eef6f7] mb-1.5">
                Ready to investigate
              </h3>
              <p className="text-[10px] text-[#879aa4] leading-[1.8] max-w-[285px] mx-auto mb-4">
                Run a demo or submit an offer to see risk signals, identity checks, and recommended next steps.
              </p>

              <div className="flex justify-center gap-4 text-[#6d838d] font-mono-code text-[9px]">
                <span>01 <b className="font-sans text-[#b7c7cc]">Parse</b></span>
                <span>02 <b className="font-sans text-[#b7c7cc]">Detect</b></span>
                <span>03 <b className="font-sans text-[#b7c7cc]">Explain</b></span>
              </div>
            </div>
          ) : (
            /* Active Findings State */
            <div className="space-y-4">
              <RiskGauge
                score={result.score}
                level={result.level}
                badgeLabel={result.badge_label}
                signalsCount={result.evidence_count}
                breakdown={result.breakdown}
              />

              {/* Evidence Breakdown */}
              <div>
                <div className="flex justify-between items-center my-3 text-[10px]">
                  <b className="text-[#eef6f7]">Evidence breakdown</b>
                  <small className="font-mono-code text-[8px] text-[#71858e]">
                    {result.evidence?.length ?? 0} items
                  </small>
                </div>
                <EvidenceList evidence={result.evidence || []} />
              </div>

              {/* Identity Signals Grid */}
              <div>
                <div className="flex justify-between items-center my-3 text-[10px]">
                  <b className="text-[#eef6f7]">Identity signals</b>
                  <small className="font-mono-code text-[8px] text-[#71858e]">
                    Target details
                  </small>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-[#0c161e] border border-[#2a3942] rounded-[6px]">
                    <small className="font-mono-code text-[8px] text-[#728791] uppercase block mb-1">
                      ORGANISATION
                    </small>
                    <b className="text-[10px] text-[#eef6f7] break-words block">
                      {result.company || "Not specified"}
                    </b>
                  </div>

                  <div className="p-2.5 bg-[#0c161e] border border-[#2a3942] rounded-[6px]">
                    <small className="font-mono-code text-[8px] text-[#728791] uppercase block mb-1">
                      SENDER / DOMAIN
                    </small>
                    <b className="text-[10px] text-[#eef6f7] break-words block">
                      {result.sender || result.url || "Not specified"}
                    </b>
                  </div>
                </div>
              </div>

              {/* Recommended Next Step Box from previous theme */}
              {result.next_steps && result.next_steps.length > 0 && (
                <div className="p-3 bg-[#112a26] border border-[#2a554a] rounded-[7px]">
                  <b className="text-[10.5px] text-[#8df2d2] block">
                    ✳ &nbsp;Recommended next step
                  </b>
                  <p className="text-[10px] text-[#c4d5d6] leading-[1.7] mt-1.5 mb-0">
                    {result.next_steps[0]}
                  </p>
                </div>
              )}

              <p className="text-[9px] text-[#778c96] leading-[1.6] my-2">
                Heuristic prototype, not a legal verdict. False positives and false negatives are possible.
              </p>

              <button
                type="button"
                onClick={handleClear}
                className="btn-secondary"
              >
                Clear report ↺
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
