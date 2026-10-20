"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import RiskGauge from "@/components/RiskGauge";
import EvidenceList from "@/components/EvidenceList";
import {
  ArrowLeft,
  Building,
  Mail,
  Link2,
  Calendar,
  CheckCircle,
  FileText,
  AlertTriangle,
  RotateCcw,
  Share2,
  Loader2
} from "lucide-react";

function ResultContent() {
  const params = useParams();
  const checkId = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!checkId) return;

    // 1. Try local session cache
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(`cybershield_result_${checkId}`);
      if (cached) {
        try {
          setData(JSON.parse(cached));
          setLoading(false);
          return;
        } catch {
          // ignore
        }
      }
    }

    // 2. Fetch from backend
    const apiUrl = process.env.NEXT_PUBLIC_API || "http://127.0.0.1:8000";
    fetch(`${apiUrl}/api/result/${checkId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Check result expired or not found");
        return res.json();
      })
      .then((resData) => {
        setData(resData);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [checkId]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading intelligence analysis...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto my-20 p-8 rounded-2xl border border-slate-800 bg-slate-900/60 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Report Not Found</h2>
        <p className="text-xs sm:text-sm text-slate-400">
          This check may have expired or was run in a previous session.
        </p>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Run New Scan</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar Navigation & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Scanner</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleShare}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? "Link Copied!" : "Share Report"}</span>
          </button>

          <Link
            href="/report"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium transition-all"
          >
            <span>Log Peer Report</span>
          </Link>
        </div>
      </div>

      {/* Target Entity Metadata Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {data.company || "Target Organization"}
            </h2>
            <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5 flex-wrap">
              {data.sender && (
                <span className="flex items-center space-x-1">
                  <Mail className="w-3 h-3 text-cyan-400" />
                  <span>{data.sender}</span>
                </span>
              )}
              {data.url && (
                <span className="flex items-center space-x-1">
                  <Link2 className="w-3 h-3 text-purple-400" />
                  <span className="truncate max-w-[200px]">{data.url}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>Checked: {new Date(data.timestamp).toLocaleString()}</span>
        </div>
      </div>

      {/* 2-Column Layout: Gauge & Next Steps (Left) + Evidence (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Risk Gauge + Next Steps */}
        <div className="lg:col-span-5 space-y-6">
          <RiskGauge
            score={data.score}
            level={data.level}
            badgeLabel={data.badge_label}
            badgeColor={data.badge_color}
            breakdown={data.breakdown}
          />

          {/* Actionable Next Steps Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-cyan-400" />
              <span>Recommended Next Steps</span>
            </h3>

            <ul className="space-y-2.5">
              {data.next_steps?.map((step: string, i: number) => (
                <li key={i} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-2" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Evidence Breakdown + Text Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Signal & Evidence Log ({data.evidence_count ?? data.evidence?.length ?? 0})
            </h3>
            <span className="text-xs text-slate-400">Weighted Heuristic Signals</span>
          </div>

          <EvidenceList evidence={data.evidence || []} />

          {/* Sanitized Text Preview */}
          {data.sanitized_preview && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sanitized Document Preview (PII Redacted)</span>
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Privacy Protected
                </span>
              </div>
              <pre className="text-xs font-mono text-slate-300 bg-slate-900/50 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {data.sanitized_preview}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading intelligence analysis...</p>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
