import React from "react";

interface EvidenceItem {
  source: string;
  key: string;
  points: number;
  title: string;
  detail: string;
  advice: string;
}

interface EvidenceListProps {
  evidence: EvidenceItem[];
}

export default function EvidenceList({ evidence }: EvidenceListProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="border border-[#2b3b45] rounded-[7px] bg-[#111f28] p-4 text-center text-[#91a3ac] text-[10px]">
        No configured red flags found in this sample.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {evidence.map((item, idx) => {
        let iconBg = "bg-[#18342e] text-[#56ecc0]";
        let pointColor = "text-[#56ecc0]";
        let iconChar = "✓";

        if (item.points >= 20) {
          iconBg = "bg-[#43262e] text-[#ff8492]";
          pointColor = "text-[#ff8492]";
          iconChar = "!";
        } else if (item.points >= 10) {
          iconBg = "bg-[#3b331f] text-[#f3c46c]";
          pointColor = "text-[#f3c46c]";
          iconChar = "⌁";
        }

        return (
          <div
            key={idx}
            className="border border-[#2b3b45] rounded-[7px] bg-[#111f28] overflow-hidden"
          >
            <div className="flex gap-2.5 p-2.5 items-start">
              <div className={`w-[25px] h-[25px] grid place-items-center rounded-[6px] shrink-0 font-bold text-xs ${iconBg}`}>
                {iconChar}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <b className="block text-[11px] text-[#eef6f7] font-semibold">
                    {item.title}
                  </b>
                  <span className={`font-mono-code text-[9px] font-bold ${pointColor} shrink-0`}>
                    +{item.points} pts
                  </span>
                </div>

                <p className="text-[10px] text-[#91a3ac] leading-[1.6] mt-1 mb-0">
                  {item.detail}
                </p>
              </div>
            </div>

            {item.advice && (
              <div className="px-3 py-2 pl-[44px] border-t border-[#283943] bg-[#0d171f] text-[#b7c8ce] text-[9.5px] leading-[1.6]">
                <b className="text-[#56ecc0] font-semibold mr-1">Recommended next step:</b>
                <span>{item.advice}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
