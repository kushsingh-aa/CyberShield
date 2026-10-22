"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Link2, Loader2, AlertTriangle, FileText, Flag } from "lucide-react";
import PipelineChart from "@/components/PipelineChart";
import ScoreCard from "@/components/ScoreCard";
import EvidenceList from "@/components/EvidenceList";
import EvidenceChart from "@/components/EvidenceChart";
import HighlightedText from "@/components/HighlightedText";
import { API_URL, type CheckResult } from "@/lib/api";

function Loading() {
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading analysis…
      </div>
    </div>
  );
}

function ResultContent() {
  const params = useParams();
  const checkId = params?.id as string;

  const [data, setData] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!checkId) return;

    // 1. Try local session cache
    try {
      const cached = sessionStorage.getItem(`cybershield_result_${checkId}`);
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    // 2. Fetch from backend
    fetch(`${API_URL}/api/result/${checkId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Check result expired or not found");
        return res.json();
      })
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [checkId]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <Loading />;

  if (error || !data) {
    return (
      <div className="card max-w-lg mx-auto my-16 text-center !p-10">
        <span className="w-12 h-12 rounded-full bg-[var(--amber-soft)] text-[var(--amber)] grid place-items-center mx-auto">
          <AlertTriangle className="w-5 h-5" />
        </span>
        <h2 className="text-[22px] tracking-tight mt-4">Report not found</h2>
        <p className="eyebrow mt-2">This check may have expired or was run before the backend restarted.</p>
        <Link href="/" className="btn-dark mt-6">
          Run a new check
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--ink)]">
            <ArrowLeft className="w-3.5 h-3.5" /> Overview
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="page-title truncate max-w-[16ch] sm:max-w-none">{data.company || "Case report"}</h1>
            <button type="button" onClick={handleShare} className="icon-btn sm mt-2" aria-label="Copy link">
              {copied ? <Check className="w-3.5 h-3.5 text-[var(--green)]" /> : <Link2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip font-mono-code !text-[12px]">#{data.id}</span>
          <span className="chip">{new Date(data.timestamp).toLocaleString()}</span>
          <Link href="/report" className="chip dark">
            <Flag className="w-3.5 h-3.5" /> Report this offer
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <PipelineChart result={data} plotHeight={250} />
        </div>
        <div className="lg:col-span-4">
          <ScoreCard result={data} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="card lg:col-span-8">
          <div className="flex items-center justify-between mb-1">
            <h2 className="card-title">Evidence Log</h2>
            <span className="pill pill-gray tnum">{data.evidence_count ?? data.evidence?.length ?? 0} signals</span>
          </div>
          <EvidenceList evidence={data.evidence || []} />
        </div>

        <div className="lg:col-span-4 grid gap-4 content-start">
          <div className="card">
            <h2 className="card-title">Evidence Points</h2>
            <div className="mt-5">
              <EvidenceChart evidence={data.evidence || []} />
            </div>
          </div>

          {data.next_steps && data.next_steps.length > 0 && (
            <div className="card">
              <h2 className="card-title">Next Steps</h2>
              <ol className="mt-4 space-y-2.5">
                {data.next_steps.map((s, i) => (
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
        </div>
      </div>

      {data.sanitized_preview && (
        <div className="card">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="card-title flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--muted)]" /> Sanitized Document
            </h2>
            <div className="flex items-center gap-2">
              {data.evidence?.some((e) => e.matches?.length) && (
                <span className="eyebrow">Red flags highlighted</span>
              )}
              <span className="pill pill-green">PII redacted</span>
            </div>
          </div>
          <pre className="mt-4 font-mono-code text-[12.5px] leading-relaxed text-[var(--ink-2)] bg-[var(--field)] rounded-[16px] p-4 whitespace-pre-wrap max-h-72 overflow-y-auto">
            <HighlightedText text={data.sanitized_preview} evidence={data.evidence || []} />
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ResultContent />
    </Suspense>
  );
}
