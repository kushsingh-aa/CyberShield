"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Building,
  Mail,
  Link2,
  Sparkles,
  Loader2,
  AlertCircle,
  FileCheck2,
  X
} from "lucide-react";

export default function UploadBox() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [offerText, setOfferText] = useState("");
  const [company, setCompany] = useState("");
  const [sender, setSender] = useState("");
  const [url, setUrl] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage("");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setActiveTab("file");
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedFile && !offerText.trim() && !company.trim() && !sender.trim() && !url.trim()) {
      setErrorMessage("Please upload an offer document or paste text / domain details to inspect.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append("document", selectedFile);
      }
      formData.append("text", offerText);
      formData.append("company", company);
      formData.append("sender", sender);
      formData.append("url", url);

      const apiUrl = process.env.NEXT_PUBLIC_API || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/api/check`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Verification request failed");
      }

      const result = await response.json();
      // Store in sessionStorage for fast client hydration
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`cybershield_result_${result.id}`, JSON.stringify(result));
      }
      router.push(`/result/${result.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to analyze offer letter. Check if backend is active.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemo = async (caseKey: string) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/api/demo/${caseKey}`);
      if (!response.ok) {
        throw new Error("Failed to load demo scenario");
      }
      const result = await response.json();
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`cybershield_result_${result.id}`, JSON.stringify(result));
      }
      router.push(`/result/${result.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Error loading demo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl shadow-2xl p-6 sm:p-8">
      {/* Preset Demo Case Bar */}
      <div className="mb-6 pb-6 border-b border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Interactive Demo Scenarios</span>
          </div>
          <span className="text-[11px] text-slate-500">1-Click Test Cases</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => loadDemo("deposit")}
            disabled={isLoading}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-900/30 text-rose-200 text-xs font-medium transition-all group cursor-pointer"
          >
            <div className="text-left">
              <p className="font-semibold text-rose-300">1. Deposit Demand</p>
              <p className="text-[10px] text-rose-400/80">₹2,999 training fee scam</p>
            </div>
            <span className="text-rose-400 group-hover:translate-x-0.5 transition-transform">→</span>
          </button>

          <button
            type="button"
            onClick={() => loadDemo("lookalike")}
            disabled={isLoading}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-900/30 text-amber-200 text-xs font-medium transition-all group cursor-pointer"
          >
            <div className="text-left">
              <p className="font-semibold text-amber-300">2. Lookalike Domain</p>
              <p className="text-[10px] text-amber-400/80">micros0ft-careers spoof</p>
            </div>
            <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform">→</span>
          </button>

          <button
            type="button"
            onClick={() => loadDemo("safer")}
            disabled={isLoading}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-200 text-xs font-medium transition-all group cursor-pointer"
          >
            <div className="text-left">
              <p className="font-semibold text-emerald-300">3. Lower-Risk Offer</p>
              <p className="text-[10px] text-emerald-400/80">Genuine interview process</p>
            </div>
            <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Toggle File / Text Tab */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("file")}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "file"
                ? "bg-slate-800 text-cyan-300 shadow-md border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document (PDF / TXT)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "text"
                ? "bg-slate-800 text-cyan-300 shadow-md border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Paste Offer Text</span>
          </button>
        </div>

        {/* Tab 1: File Drag & Drop */}
        {activeTab === "file" && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.txt,.png,.jpg,.jpeg"
              className="hidden"
            />
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-8 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition-all duration-200 group"
            >
              {selectedFile ? (
                <div className="flex items-center justify-center space-x-3">
                  <FileCheck2 className="w-8 h-8 text-cyan-400" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Click to change file
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-200">
                    Drag and drop your offer letter or <span className="text-cyan-400 underline underline-offset-2">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports PDF, TXT, or images up to 10 MB (PII is auto-redacted)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Textarea */}
        {activeTab === "text" && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Offer Letter / Email Body:
            </label>
            <textarea
              rows={6}
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
              placeholder="Paste the message, email contents, or offer letter description here..."
              className="w-full rounded-xl bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 p-3.5 text-xs sm:text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
            />
          </div>
        )}

        {/* Optional Metadata Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              <span>Company Name</span>
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Infosys, Microsoft"
              className="w-full rounded-lg bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sender Email</span>
            </label>
            <input
              type="email"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="e.g. hr@company-careers.com"
              className="w-full rounded-lg bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 px-3 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1.5">
              <Link2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Portal Link / URL</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://company-recruitment.example"
              className="w-full rounded-lg bg-slate-950/60 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 px-3 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-600 outline-none"
            />
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing Document & Cross-Checking Intelligence...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Run 3-Layer Fraud Intelligence Check</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
