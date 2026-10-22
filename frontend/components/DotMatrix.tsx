import React from "react";

interface DotMatrixProps {
  /** Number of dots to fill */
  count: number;
  tone: "green" | "blue";
  cols?: number;
  rows?: number;
}

const TONES = {
  green: ["#16a34a", "#4cc77a", "#a7e3bd"],
  blue: ["#2b59ff", "#6f90ff", "#b9c9ff"],
};

// Fills a bell-shaped column layout from the centre outwards, one dot per unit
// (or scaled when count exceeds the grid capacity).
function columnHeights(count: number, cols: number, rows: number) {
  const capacity = cols * rows;
  const n = Math.min(count, capacity);
  const mid = (cols - 1) / 2;
  const weights = Array.from({ length: cols }, (_, i) => Math.exp(-((i - mid) ** 2) / (2 * (cols / 5) ** 2)));
  const heights = new Array(cols).fill(0);
  for (let k = 0; k < n; k++) {
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < cols; i++) {
      if (heights[i] >= rows) continue;
      const score = weights[i] * rows - heights[i];
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) break;
    heights[best]++;
  }
  return heights;
}

export default function DotMatrix({ count, tone, cols = 15, rows = 6 }: DotMatrixProps) {
  const heights = columnHeights(count, cols, rows);
  const mid = (cols - 1) / 2;
  const [dark, mid2, light] = TONES[tone];

  return (
    <div className="flex items-end gap-[5px]" aria-hidden>
      {heights.map((h, i) => {
        const d = Math.abs(i - mid);
        const color = d < 1 ? dark : d < 3 ? mid2 : light;
        return (
          <div key={i} className="flex flex-col-reverse gap-[5px]">
            {Array.from({ length: rows }).map((_, r) => (
              <span
                key={r}
                className="w-[7px] h-[7px] rounded-full"
                style={{ background: r < h ? color : r === 0 ? "var(--dot-empty)" : "transparent" }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
