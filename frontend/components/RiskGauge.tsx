import React from "react";

interface RiskGaugeProps {
  score: number;
  level: string;
  badgeLabel: string;
  badgeColor?: string;
  signalsCount?: number;
  breakdown?: {
    letter_score?: number;
    company_score?: number;
    reports_score?: number;
    fees_demanded?: boolean;
  };
}

export default function RiskGauge({
  score,
  level,
  badgeLabel,
  signalsCount,
  breakdown
}: RiskGaugeProps) {
  let accentColor = "var(--mint)";
  let badgeClass = "bg-[#183b33] text-[#56ecc0]";
  let riskTitle = "Lower detected risk";
  let riskDesc = "No immediate high-risk signals were identified in configured rules.";

  if (level === "high" || score >= 60) {
    accentColor = "var(--red)";
    badgeClass = "bg-[#48252d] text-[#ff8492]";
    riskTitle = "High-concern risk pattern";
    riskDesc = "Strong indicators of deceptive recruitment or payment demands detected.";
  } else if (level === "caution" || score >= 30) {
    accentColor = "var(--amber)";
    badgeClass = "bg-[#41351e] text-[#f3c46c]";
    riskTitle = "Caution advised";
    riskDesc = "Some signals require verification before responding or submitting details.";
  }

  const deg = Math.round((score / 100) * 360);

  return (
    <div className="p-4 bg-[#0c161e] border border-[#2a3a43] rounded-[9px] flex flex-col sm:flex-row items-center sm:items-start gap-4">
      {/* Conic-gradient Circle Gauge from previous theme */}
      <div
        className="w-[105px] h-[105px] shrink-0 rounded-full grid place-items-center relative"
        style={{
          background: `conic-gradient(${accentColor} ${deg}deg, #26353e ${deg}deg)`
        }}
      >
        <div className="absolute inset-[7px] bg-[#0c161e] rounded-full" />
        <div className="relative text-center">
          <strong className="block text-[30px] font-extrabold tracking-[-1px] text-[#eef6f7] leading-none">
            {score}
          </strong>
          <small className="font-mono-code text-[8px] text-[#8397a1] uppercase mt-1 block tracking-[0.5px]">
            RISK SCORE
          </small>
        </div>
      </div>

      {/* Findings Summary Details */}
      <div className="flex-1 min-w-0 text-center sm:text-left">
        <span className={`inline-block px-2 py-1 rounded-[4px] font-mono-code text-[8px] tracking-[0.7px] uppercase font-bold ${badgeClass}`}>
          {badgeLabel || (level === "high" ? "HIGH CONCERN" : level === "caution" ? "CAUTION" : "LOWER SIGNAL")}
        </span>

        <h3 className="text-[14px] font-bold text-[#eef6f7] mt-2 mb-1 tracking-tight">
          {riskTitle}
        </h3>

        <p className="text-[10px] text-[#92a5ae] leading-[1.6] mb-2">
          {riskDesc}
        </p>

        <small className="font-mono-code text-[8px] text-[#728791] block">
          <b className="text-[#d7e3e6]">{signalsCount ?? 0}</b> signals found · Engine evaluated
        </small>

        {breakdown?.fees_demanded && (
          <div className="mt-2 text-[9px] font-mono-code text-[#ff8492] bg-[#48252d]/40 border border-[#ff8492]/30 px-2 py-1 rounded">
            ⚠ OVERRIDE: Upfront fee demand forced score to High Concern
          </div>
        )}
      </div>
    </div>
  );
}
