"use client";

import React from "react";

export default function SystemDesignPage() {
  return (
    <div className="space-y-5">
      {/* Section Hero */}
      <div className="py-4">
        <div className="kicker-label text-[#56ecc0] mb-1">
          04 / SYSTEM DESIGN
        </div>
        <h1 className="text-[28px] sm:text-[32px] font-extrabold leading-[1.16] tracking-[-1.5px] my-2 text-[#eef6f7]">
          Explainable by design.<br />
          <em className="text-[#56ecc0] not-italic">Built to be challenged.</em>
        </h1>
        <p className="text-[11px] leading-[1.8] text-[#9badb5] max-w-[680px] m-0">
          OfferGuard & CyberShield combine multi-layered transparent signals into a reviewable risk estimate. It does not claim to know intent or certify an employer.
        </p>
      </div>

      {/* 4 Pipeline Steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-[#111b25] border border-[#2a3a43] rounded-[8px] p-4 flex flex-col justify-between min-h-[175px]">
          <div>
            <small className="font-mono-code text-[9px] text-[#617781] block">01</small>
            <span className="block text-[22px] text-[#56ecc0] my-2.5">▤</span>
            <h3 className="text-[12px] font-bold text-[#eef6f7] mb-1">Input & Redact Layer</h3>
            <p className="text-[9.5px] text-[#8fa2ab] leading-[1.6] m-0">
              Selectable PDF/TXT parsed via pdfplumber; auto-masks Aadhaar, phone & bank details.
            </p>
          </div>
          <span className="font-mono-code text-[8px] text-[#8ce9cb] bg-[#132b27] border border-[#2d4c43] px-2 py-1 rounded inline-block mt-3 w-fit">
            PDF / OCR / Redaction
          </span>
        </div>

        <div className="bg-[#111b25] border border-[#2a3a43] rounded-[8px] p-4 flex flex-col justify-between min-h-[175px]">
          <div>
            <small className="font-mono-code text-[9px] text-[#617781] block">02</small>
            <span className="block text-[22px] text-[#56ecc0] my-2.5">⌁</span>
            <h3 className="text-[12px] font-bold text-[#eef6f7] mb-1">3-Engine Signal Checks</h3>
            <p className="text-[9.5px] text-[#8fa2ab] leading-[1.6] m-0">
              Regex rules, RDAP domain age, DNS MX/SPF verification, and RapidFuzz lookalike detectors.
            </p>
          </div>
          <span className="font-mono-code text-[8px] text-[#8ce9cb] bg-[#132b27] border border-[#2d4c43] px-2 py-1 rounded inline-block mt-3 w-fit">
            Parallel Checks
          </span>
        </div>

        <div className="bg-[#111b25] border border-[#2a3a43] rounded-[8px] p-4 flex flex-col justify-between min-h-[175px]">
          <div>
            <small className="font-mono-code text-[9px] text-[#617781] block">03</small>
            <span className="block text-[22px] text-[#56ecc0] my-2.5">◈</span>
            <h3 className="text-[12px] font-bold text-[#eef6f7] mb-1">Weighted Aggregation</h3>
            <p className="text-[9.5px] text-[#8fa2ab] leading-[1.6] m-0">
              Letter (45%) + Company (35%) + Reports (20%) with mandatory high-concern fee overrides.
            </p>
          </div>
          <span className="font-mono-code text-[8px] text-[#8ce9cb] bg-[#132b27] border border-[#2d4c43] px-2 py-1 rounded inline-block mt-3 w-fit">
            Scoring Engine
          </span>
        </div>

        <div className="bg-[#111b25] border border-[#2a3a43] rounded-[8px] p-4 flex flex-col justify-between min-h-[175px]">
          <div>
            <small className="font-mono-code text-[9px] text-[#617781] block">04</small>
            <span className="block text-[22px] text-[#56ecc0] my-2.5">✳</span>
            <h3 className="text-[12px] font-bold text-[#eef6f7] mb-1">Safe Action & Guidance</h3>
            <p className="text-[9.5px] text-[#8fa2ab] leading-[1.6] m-0">
              Actionable safety steps, rationales for each flag, and campus placement cell guidance.
            </p>
          </div>
          <span className="font-mono-code text-[8px] text-[#8ce9cb] bg-[#132b27] border border-[#2d4c43] px-2 py-1 rounded inline-block mt-3 w-fit">
            Human In The Loop
          </span>
        </div>
      </div>

      {/* 2-Columns: Scoring Model & Limitations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111b25] border border-[#263640] rounded-[10px] p-5">
          <small className="kicker-label text-[#56ecc0]">SCORING MODEL</small>
          <h2 className="text-[16px] font-bold text-[#eef6f7] mt-1 mb-2 tracking-tight">
            How the score works
          </h2>
          <div className="p-3.5 bg-[#0b151d] border border-[#2a3a43] rounded-[7px] text-[#56ecc0] font-mono-code text-[11px] my-3">
            Score = round(0.45 * Letter + 0.35 * Company + 0.20 * Reports)
          </div>
          <p className="text-[10px] text-[#81949d] leading-[1.8] mb-3">
            If an upfront fee is detected or 3+ independent student reports match, the final score automatically elevates to ≥ 75 (High Concern).
          </p>

          <div className="flex gap-1.5 flex-wrap font-mono-code text-[8px]">
            <span className="px-2 py-1 rounded bg-[#17362f] text-[#56ecc0]">
              0–29 · Lower signal
            </span>
            <span className="px-2 py-1 rounded bg-[#3b311d] text-[#f3c46c]">
              30–59 · Caution
            </span>
            <span className="px-2 py-1 rounded bg-[#41232a] text-[#ff8492]">
              60–100 · High concern
            </span>
          </div>
        </div>

        <div className="bg-[#111b25] border border-[#263640] rounded-[10px] p-5">
          <small className="kicker-label text-[#56ecc0]">LIMITATIONS</small>
          <h2 className="text-[16px] font-bold text-[#eef6f7] mt-1 mb-2 tracking-tight">
            Transparent Boundaries
          </h2>
          <ul className="pl-4 text-[10px] text-[#9badb5] leading-[2.1] list-disc marker:text-[#56ecc0] space-y-1">
            <li>It is an explainable heuristic prototype, not an infallible fraud classifier.</li>
            <li>It does not connect to private company intranets or live HR databases.</li>
            <li>A low score does not guarantee legitimacy; independent checks remain necessary.</li>
            <li>Scanned image PDFs may require local OCR configuration (Tesseract).</li>
            <li>Student peer threat reports are marked UNVERIFIED community signals.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
