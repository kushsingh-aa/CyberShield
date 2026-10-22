export const API_URL = process.env.NEXT_PUBLIC_API || "http://127.0.0.1:8000";

export interface EvidenceItem {
  source: string;
  key: string;
  points: number;
  title: string;
  detail: string;
  advice: string;
  /** Exact phrases in the offer text that triggered a rule */
  matches?: string[];
}

export interface HistoryItem {
  id: string;
  score: number;
  level: string;
  company: string | null;
  sender: string;
  url: string;
  document_name?: string | null;
  evidence_count: number;
  created_at: string;
}

export interface Breakdown {
  letter_score?: number;
  company_score?: number;
  reports_score?: number;
  fees_demanded?: boolean;
}

export interface CheckResult {
  id: string;
  company?: string;
  sender?: string;
  url?: string;
  document_name?: string | null;
  demo_label?: string;
  timestamp: string;
  sanitized_preview?: string;
  score: number;
  level: string;
  badge_label?: string;
  badge_color?: string;
  breakdown?: Breakdown;
  evidence?: EvidenceItem[];
  evidence_count?: number;
  next_steps?: string[];
}

export interface Stats {
  total_checks: number;
  avg_risk_score: number;
  high_risk_flagged: number;
  community_reports: number;
}

export type Level = "high" | "caution" | "low";

// Mirrors the thresholds in backend/scoring.py
export function levelOf(score: number, level?: string): Level {
  if (level === "high" || level === "caution" || level === "low") return level;
  if (score >= 60) return "high";
  if (score >= 30) return "caution";
  return "low";
}

export const LEVEL_META: Record<Level, { label: string; pill: string; title: string }> = {
  high: { label: "High scam risk", pill: "pill-red", title: "High-concern pattern" },
  caution: { label: "Caution required", pill: "pill-amber", title: "Verify before responding" },
  low: { label: "Lower risk", pill: "pill-green", title: "No major red flags" },
};

export function cacheResult(result: CheckResult) {
  try {
    sessionStorage.setItem(`cybershield_result_${result.id}`, JSON.stringify(result));
  } catch {
    // storage unavailable
  }
}
