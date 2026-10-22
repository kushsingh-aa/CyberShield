import React from "react";
import { FileScan, Radar, Scale, LifeBuoy } from "lucide-react";

const STEPS = [
  {
    icon: FileScan,
    title: "Input & Redact",
    body: "PDF, TXT, DOCX or image parsed via pdfplumber, pypdf and OCR. Aadhaar, phone and bank details are masked automatically.",
    tag: "PDF · OCR · Redaction",
  },
  {
    icon: Radar,
    title: "3-Engine Checks",
    body: "Letter rules, RDAP domain age, DNS MX/SPF records and RapidFuzz lookalike detection run in parallel.",
    tag: "Parallel checks",
  },
  {
    icon: Scale,
    title: "Weighted Blend",
    body: "Letter 45% + Company 35% + Reports 20%, with mandatory overrides for fee demands.",
    tag: "Scoring engine",
  },
  {
    icon: LifeBuoy,
    title: "Safe Guidance",
    body: "Every flag comes with a rationale, next steps and campus placement cell guidance.",
    tag: "Human in the loop",
  },
];

const WEIGHTS = [
  { label: "Letter analysis", value: 45, fill: "hatch-green" },
  { label: "Company & domain", value: 35, fill: "hatch-bluebar" },
  { label: "Peer reports", value: 20, fill: "hatch-pink" },
];

export default function SystemDesignPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <h1 className="page-title">System</h1>
        <p className="eyebrow max-w-[440px] text-[13px] leading-relaxed">
          Transparent signals combined into a reviewable risk estimate. It does not claim to know intent or certify an
          employer.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="card flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-[12px] bg-[var(--blue-soft)] text-[var(--blue)] grid place-items-center">
                <s.icon className="w-5 h-5" />
              </span>
              <span className="font-mono-code text-[12px] text-[var(--faint)]">0{i + 1}</span>
            </div>
            <h3 className="text-[17px] tracking-tight mt-5">{s.title}</h3>
            <p className="text-[13px] leading-relaxed text-[var(--muted)] mt-1.5">{s.body}</p>
            <div className="mt-auto pt-4">
              <span className="pill pill-gray">{s.tag}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="card lg:col-span-7">
          <h2 className="card-title">How the Score Works</h2>
          <div className="mt-4 rounded-[16px] bg-[var(--field)] px-4 py-3.5 font-mono-code text-[13px] text-[var(--ink)] overflow-x-auto whitespace-nowrap">
            score = round(0.45 · Letter + 0.35 · Company + 0.20 · Reports)
          </div>

          <div className="mt-6 space-y-5">
            {WEIGHTS.map((w) => (
              <div key={w.label}>
                <div className="flex justify-between text-[13px] mb-2">
                  <span className="text-[var(--ink-2)]">{w.label}</span>
                  <span className="tnum font-medium">{w.value}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--track)] overflow-hidden">
                  <div className={`h-full rounded-full ${w.fill}`} style={{ width: `${w.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[13px] leading-relaxed text-[var(--muted)] mt-6">
            If an upfront fee is detected or 3+ independent student reports match, the final score is raised to at least
            75 (high concern).
          </p>
          <div className="flex gap-2 flex-wrap mt-4">
            <span className="pill pill-green">0–29 · Lower risk</span>
            <span className="pill pill-amber">30–59 · Caution</span>
            <span className="pill pill-red">60–100 · High concern</span>
          </div>
        </div>

        <div className="insight-card lg:col-span-5 p-6">
          <div className="insight-glass" />
          <div className="relative">
            <span className="glass-chip">Limitations</span>
            <h2 className="text-[26px] tracking-tight leading-tight mt-5 max-w-[18ch]">Built to be challenged.</h2>
            <ul className="mt-5 space-y-3 text-[13px] leading-relaxed text-white/90">
              <li>An explainable heuristic prototype, not an infallible fraud classifier.</li>
              <li>No connection to private company intranets or live HR databases.</li>
              <li>A low score does not guarantee legitimacy; independent checks remain necessary.</li>
              <li>Scanned documents rely on local OCR and may extract imperfectly.</li>
              <li>Student peer reports are UNVERIFIED community signals.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
