import type { Decision, RiskBand } from "./types";
export const getRiskScore = (probability: number) =>
  Math.max(0, Math.min(100, Math.round(probability * 100)));
export function getRiskBand(score: number): RiskBand {
  if (score < 20) return "Low";
  if (score < 40) return "Moderate";
  if (score < 60) return "Medium";
  if (score < 80) return "High";
  return "Critical";
}
export function getDecision(score: number): Decision {
  if (score <= 53) return "MONITOR";
  if (score <= 87) return "REVIEW";
  if (score <= 93) return "HIGH_RISK";
  return "CRITICAL";
}
export const riskClass: Record<RiskBand, string> = {
  Low: "text-risk-low bg-risk-low/10 border-risk-low/25",
  Moderate: "text-risk-moderate bg-risk-moderate/10 border-risk-moderate/25",
  Medium: "text-risk-medium bg-risk-medium/10 border-risk-medium/25",
  High: "text-risk-high bg-risk-high/10 border-risk-high/25",
  Critical: "text-risk-critical bg-risk-critical/10 border-risk-critical/25",
};
export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
export const formatPercent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
