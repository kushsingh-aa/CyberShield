"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  ArrowUpRight,
  Building2,
  ChevronDown,
  KeyRound,
  Link2,
  Loader2,
  Mail,
  Paperclip,
  Plus,
  Sparkles,
  X,
  Check,
} from "lucide-react";
import PipelineChart from "@/components/PipelineChart";
import ScoreCard from "@/components/ScoreCard";
import EvidenceChart from "@/components/EvidenceChart";
import EvidenceList from "@/components/EvidenceList";
import DotMatrix from "@/components/DotMatrix";
import InsightCard from "@/components/InsightCard";
import { API_URL, cacheResult, type CheckResult, type Stats } from "@/lib/api";

const FALLBACK_DEMOS = [
  { key: "deposit", label: "Deposit Demand Fraud" },
  { key: "lookalike", label: "Lookalike Brand Spoofing" },
  { key: "safer", label: "Lower-Risk Sample Offer" },
];

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const [stats, setStats] = useState<Stats | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null | undefined>(undefined);
  const [demoCases, setDemoCases] = useState<{ key: string; label: string }[]>(FALLBACK_DEMOS);

  // Form state
  const [offerText, setOfferText] = useState("");
  const [company, setCompany] = useState("");
  const [sender, setSender] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Analysis state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStats = () => {
    fetch(`${API_URL}/api/stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => {});
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cybershield_gemini_key") || "";
      if (saved) setApiKey(saved);
    } catch {
      // storage unavailable
    }

    fetchStats();

    fetch(`${API_URL}/api/demo-cases`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => Array.isArray(data) && data.length > 0 && setDemoCases(data))
      .catch(() => {});

    fetch(`${API_URL}/api/ai-status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAiProvider(data?.ai_available ? data.provider : null))
      .catch(() => setAiProvider(null));
  }, []);

  const handleRunInvestigation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!offerText.trim() && !selectedFile && !company.trim() && !sender.trim() && !url.trim()) {
      setErrorMsg("Paste offer text, attach a document, or add recruiter details.");
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

      const res = await fetch(`${API_URL}/api/check`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Investigation request failed");
      }

      const data: CheckResult = await res.json();
      cacheResult(data);
      setResult(data);
      fetchStats();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to inspect offer. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = async (demoKey: string) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_URL}/api/demo/${demoKey}`);
      if (!res.ok) throw new Error("Demo case load failed");
      const data: CheckResult = await res.json();
      cacheResult(data);
      setResult(data);
      setOfferText(data.sanitized_preview || "");
      setCompany(data.company || "");
      setSender(data.sender || "");
      setUrl(data.url || "");
      fetchStats();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error loading demo");
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
    setCollapsed(false);
    setTimeout(() => textRef.current?.focus(), 0);
  };

  const handleCopyLink = () => {
    const link = result ? `${window.location.origin}/result/${result.id}` : window.location.href;
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRunInvestigation();
  };

  const promptBar = (
    <form onSubmit={handleRunInvestigation} className="prompt-bar p-2.5 sm:p-3">
      <div className="flex items-center justify-between gap-3 px-1.5 pb-2">
        <div className="flex items-center gap-2 text-[13px] text-[var(--ink-2)]">
          <Sparkles className="w-4 h-4 text-[var(--blue)]" />
          What would you like to inspect?
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11.5px] text-[var(--muted)]">⌘/Ctrl + Enter to run</span>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="icon-btn sm !bg-transparent !border-transparent"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-2 fade-up">
          <div className="prompt-input p-2.5">
            <textarea
              ref={textRef}
              rows={2}
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Paste the recruiter message or offer letter…"
              className="w-full resize-none bg-transparent outline-none text-[14px] leading-relaxed text-[var(--ink)] placeholder:text-[var(--placeholder)] px-1"
            />
            <div className="flex items-center justify-between gap-2 mt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0">
                {selectedFile ? (
                  <span className="pill pill-blue max-w-[220px]">
                    <Paperclip className="w-3 h-3 shrink-0" />
                    <span className="truncate">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      aria-label="Remove file"
                      className="ml-0.5 hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : (
                  <>
                    <span className="text-[11.5px] text-[var(--muted)] shrink-0 pr-0.5">Try</span>
                    {demoCases.map((dc) => (
                      <button
                        key={dc.key}
                        type="button"
                        title={dc.label}
                        disabled={loading}
                        onClick={() => handleLoadDemo(dc.key)}
                        className="slash-chip"
                      >
                        /{dc.key}
                      </button>
                    ))}
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedFile(e.target.files[0]);
                      setErrorMsg("");
                    }
                    e.target.value = "";
                  }}
                  accept=".pdf,.txt,.docx,.png,.jpg,.jpeg"
                  hidden
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="icon-btn sm"
                  aria-label="Attach document"
                  title="Attach PDF, TXT, DOCX or image"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className={`icon-btn sm ${showKey || apiKey ? "!text-[var(--blue)] !border-[var(--focus-border)]" : ""}`}
                  aria-label="AI API key"
                  title="Optional AI key (Gemini, OpenRouter or Anthropic)"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-[30px] h-[30px] rounded-full grid place-items-center bg-[var(--ink)] text-[var(--on-ink)] hover:bg-[var(--ink-hover)] disabled:opacity-60"
                  aria-label="Run investigation"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="field-pill">
              <Building2 className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" />
            </label>
            <label className="field-pill">
              <Mail className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
              <input
                type="email"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="Sender email"
              />
            </label>
            <label className="field-pill">
              <Link2 className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Offer link" />
            </label>
          </div>

          {showKey && (
            <div className="flex items-center gap-2 fade-up">
              <label className="field-pill flex-1">
                <KeyRound className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    try {
                      localStorage.setItem("cybershield_gemini_key", e.target.value);
                    } catch {
                      // storage unavailable
                    }
                  }}
                  placeholder="AIza… (Gemini), sk-or-v1-… (OpenRouter) or sk-ant-… (Anthropic). Optional"
                  className="font-mono-code text-[12px]"
                />
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-[var(--blue)] hover:underline whitespace-nowrap"
              >
                Free Gemini key ↗
              </a>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-[12px] bg-[var(--red-soft)] text-[var(--red-fg)] px-3 py-2 text-[12.5px]">{errorMsg}</div>
          )}
        </div>
      )}
    </form>
  );

  const levelHigh = stats?.high_risk_flagged ?? 0;

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Overview</h1>
          <button
            type="button"
            onClick={handleCopyLink}
            className="icon-btn sm mt-2"
            aria-label="Copy link"
            title={result ? "Copy link to this report" : "Copy page link"}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--green)]" /> : <Link2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="chip" title="Semantic analysis provider">
            <Sparkles className="w-3.5 h-3.5 text-[var(--blue)]" />
            {aiProvider === undefined ? "Checking AI…" : aiProvider ? aiProvider : "Rules only"}
          </span>
          {result && (
            <Link href={`/result/${result.id}`} className="chip">
              Full report
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <button type="button" onClick={handleClear} className="chip dark">
            New check
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <PipelineChart result={result} overlay={promptBar} plotHeight={collapsed ? 240 : 330} />
        </div>
        <div className="lg:col-span-4">
          <ScoreCard result={result} stats={stats} />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        <div className="card lg:col-span-3 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Evidence Points</h2>
            <span className="pill pill-gray tnum">{result?.evidence?.length ?? 0} signals</span>
          </div>
          <div className="mt-auto pt-6">
            <EvidenceChart evidence={result?.evidence || []} />
          </div>
        </div>

        <div className="lg:col-span-5 grid gap-4">
          <div className="card">
            <h2 className="card-title">Checks Run</h2>
            <div className="mt-4 flex items-end justify-between gap-4 flex-wrap">
              <span className="big-num text-[52px]">{stats?.total_checks ?? "—"}</span>
              <div className="flex flex-col items-center gap-1.5">
                <span className="pill pill-gray !text-[11px]">High risk: {levelHigh}</span>
                <DotMatrix count={stats?.total_checks ?? 0} tone="green" />
              </div>
              <div className="text-right">
                <div className="eyebrow">avg score</div>
                <div className="text-[20px] font-medium tnum mt-1">{stats ? Math.round(stats.avg_risk_score) : "—"}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="card-title">Community Reports</h2>
            <div className="mt-4 flex items-end justify-between gap-4 flex-wrap">
              <span className="big-num text-[52px]">{stats?.community_reports ?? "—"}</span>
              <div className="flex flex-col items-center gap-1.5">
                <span className="pill pill-gray !text-[11px]">Unverified</span>
                <DotMatrix count={stats?.community_reports ?? 0} tone="blue" />
              </div>
              <Link href="/report" className="text-right group">
                <div className="eyebrow">seen a scam?</div>
                <div className="text-[15px] font-medium mt-1 inline-flex items-center gap-1 group-hover:text-[var(--blue)]">
                  Report it <ArrowUpRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-4">
          <InsightCard result={result} stats={stats} />
        </div>
      </div>

      {/* Row 3: findings */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 fade-up">
          <div className="card lg:col-span-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="card-title">Evidence Log</h2>
              <span className="eyebrow">Click a signal for the recommended next step</span>
            </div>
            <EvidenceList evidence={result.evidence || []} />
          </div>

          <div className="card lg:col-span-4 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="card-title">Case File</h2>
              <span className="font-mono-code text-[11.5px] text-[var(--muted)]">#{result.id}</span>
            </div>
            <dl className="mt-4 space-y-3 text-[13px]">
              {[
                ["Organisation", result.company],
                ["Sender", result.sender],
                ["Link", result.url],
                ["Document", result.document_name],
                ["Checked", new Date(result.timestamp).toLocaleString()],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-[var(--muted)] shrink-0">{k}</dt>
                    <dd className="text-right truncate" title={v as string}>
                      {v}
                    </dd>
                  </div>
                ))}
            </dl>

            {result.next_steps && result.next_steps.length > 0 && (
              <div className="mt-5 pt-5 border-t border-[var(--line)]">
                <div className="eyebrow mb-2.5">Next steps</div>
                <ol className="space-y-2">
                  {result.next_steps.map((s, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-[var(--ink-2)]">
                      <span className="w-5 h-5 rounded-full bg-[var(--field)] text-[11px] grid place-items-center shrink-0 tnum">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-auto pt-5 flex gap-2">
              <Link href={`/result/${result.id}`} className="btn-dark flex-1">
                Full report <ArrowUpRight className="w-4 h-4" />
              </Link>
              <button type="button" onClick={handleClear} className="chip !h-10">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
