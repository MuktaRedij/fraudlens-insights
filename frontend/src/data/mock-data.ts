import type { Alert, ModelMetric, Transaction } from "@/lib/types";
import { getDecision, getRiskBand } from "@/lib/risk-utils";

const scores = [
  8, 12, 14, 16, 18, 21, 24, 27, 31, 36, 42, 45, 48, 52, 57, 62, 66, 69, 73, 78, 82, 85, 88, 91, 96,
];
const positive = [
  { feature: "V14", contribution: 3.69, value: -3.828 },
  { feature: "V17", contribution: 1.47, value: -7.551 },
  { feature: "V10", contribution: 0.8, value: -4.501 },
  { feature: "V4", contribution: 0.62, value: 2.288 },
  { feature: "V12", contribution: 0.44, value: -6.21 },
];
const negative = [
  { feature: "V8", contribution: -0.52, value: 0.614 },
  { feature: "Amount", contribution: -0.31, value: 450 },
  { feature: "V19", contribution: -0.18, value: 0.147 },
];
function makeFeatures(seed: number) {
  const f: Record<string, number> = {};
  for (let i = 1; i <= 28; i++) f[`V${i}`] = Number((Math.sin(seed * i) * 3.2).toFixed(3));
  return {
    ...f,
    log_amount: Number(Math.log(seed * 37 + 12).toFixed(3)),
    time_hours: seed * 1.75,
    time_days: Number((seed / 24).toFixed(3)),
    day_index: seed % 7,
    hour: seed % 24,
    hour_sin: Number(Math.sin(seed).toFixed(3)),
    hour_cos: Number(Math.cos(seed).toFixed(3)),
  };
}
export const transactions: Transaction[] = Array.from({ length: 50 }, (_, i) => {
  const score = scores[i % scores.length] ?? 50;
  const id = `DEMO-TX-${String(2000 - i).padStart(4, "0")}`;
  const amount = Number((((i * 83.47) % 1490) + 12.5).toFixed(2));
  return {
    id,
    timestamp: new Date(Date.UTC(2026, 8, 16, 5, 45 - i * 2)).toISOString(),
    amount,
    rawProbability: score / 100,
    riskScore: score,
    riskBand: getRiskBand(score),
    decision: getDecision(score),
    model: i % 7 === 0 ? "XGBoost" : "LightGBM + SMOTE",
    status:
      score >= 80 ? (i % 3 === 0 ? "Investigating" : "Open") : i % 4 === 0 ? "Resolved" : "Open",
    label: score >= 80 && i % 6 !== 0 ? "Fraud" : "Legitimate",
    type:
      ["Card Purchase", "Transfer", "Cash Withdrawal", "Online Payment"][i % 4] ?? "Card Purchase",
    category: ["Retail", "Travel", "Electronics", "Services", "Grocery"][i % 5] ?? "Retail",
    features: makeFeatures(i + 1),
    shapPositive: positive.map((x, n) => ({
      ...x,
      contribution: Number((x.contribution * (0.72 + (i % 5) * 0.08)).toFixed(2)),
      value: n === 1 ? Number((-7.551 + i * 0.03).toFixed(3)) : x.value,
    })),
    shapNegative: negative.map((x) => (x.feature === "Amount" ? { ...x, value: amount } : x)),
    anomalyScore: Number((0.18 + score / 145).toFixed(3)),
    notes: [],
  };
});
const tx0 = transactions[0];
const tx1 = transactions[1];
const tx2 = transactions[2];
const tx3 = transactions[3];
if (tx0)
  transactions[0] = {
    ...tx0,
    id: "DEMO-TX-1042",
    amount: 450,
    rawProbability: 0.94,
    riskScore: 94,
    riskBand: "Critical",
    decision: "CRITICAL",
    label: "Fraud",
  };
if (tx1)
  transactions[1] = {
    ...tx1,
    id: "DEMO-TX-1039",
    amount: 210,
    rawProbability: 0.721,
    riskScore: 72,
    riskBand: "High",
    decision: "REVIEW",
    status: "Investigating",
  };
if (tx2)
  transactions[2] = {
    ...tx2,
    id: "DEMO-TX-1037",
    amount: 91.2,
    rawProbability: 0.524,
    riskScore: 52,
    riskBand: "Medium",
    decision: "MONITOR",
  };
if (tx3)
  transactions[3] = {
    ...tx3,
    id: "DEMO-TX-1032",
    amount: 860.2,
    rawProbability: 0.87,
    riskScore: 87,
    riskBand: "Critical",
    decision: "REVIEW",
    label: "Legitimate",
    status: "False Positive",
  };

export const alerts: Alert[] = transactions
  .filter((t) => t.riskScore >= 60)
  .slice(0, 18)
  .map((t, i) => ({
    id: `DEMO-AL-${2048 - i}`,
    transactionId: t.id,
    riskScore: t.riskScore,
    riskBand: t.riskBand,
    reason: i % 2 ? "Elevated calibrated fraud probability" : "Multiple model risk contributors",
    created: t.timestamp,
    assignedTo: i % 3 === 0 ? "Maya Chen" : i % 3 === 1 ? "Unassigned" : "Daniel Ortiz",
    status:
      i % 5 === 0 ? "Escalated" : i % 4 === 0 ? "Resolved" : i % 3 === 0 ? "Investigating" : "Open",
  }));

export const modelMetrics: ModelMetric[] = [
  [
    "Logistic Regression",
    0.84562,
    0.983936,
    0.028441,
    0.115043,
    0.723577,
    0.978814,
    0.023488,
    0.096481,
  ],
  [
    "LightGBM Unweighted",
    0.825828,
    0.983424,
    0.000352,
    0.002238,
    0.755212,
    0.981492,
    0.000423,
    0.002759,
  ],
  [
    "LightGBM Class-Weighted",
    0.812504,
    0.972218,
    0.000397,
    0.003372,
    0.732349,
    0.957013,
    0.000692,
    0.004898,
  ],
  ["LightGBM SMOTE", 0.86215, 0.982384, 0.001471, 0.013341, 0.758784, 0.976314, 0.001858, 0.015842],
  ["XGBoost", 0.853855, 0.985764, 0.000336, 0.002121, 0.764778, 0.971735, 0.000478, 0.003345],
].map(
  ([
    name,
    validationAP,
    validationRoc,
    validationBrier,
    validationLogLoss,
    testAP,
    testRoc,
    testBrier,
    testLogLoss,
  ]) =>
    ({
      name,
      validationAP,
      validationRoc,
      validationBrier,
      validationLogLoss,
      testAP,
      testRoc,
      testBrier,
      testLogLoss,
    }) as ModelMetric,
);

export const calibrationMetrics = [
  {
    name: "LightGBM SMOTE + Platt",
    validationBrier: 0.000354,
    validationLogLoss: 0.002091,
    validationAP: 0.86215,
    validationRoc: 0.982384,
    testBrier: 0.000413,
    testLogLoss: 0.002948,
    testAP: 0.758784,
    testRoc: 0.976314,
  },
  {
    name: "XGBoost + Isotonic",
    validationBrier: 0.000319,
    validationLogLoss: 0.001942,
    validationAP: 0.844014,
    validationRoc: 0.986165,
    testBrier: 0.000382,
    testLogLoss: 0.002687,
    testAP: 0.754546,
    testRoc: 0.967313,
  },
];
export const activityData = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"].map(
  (time, i) => ({
    time,
    transactions: [18200, 29400, 42600, 51800, 49300, 45200, 35800][i],
    alerts: [18, 29, 37, 51, 44, 39, 31][i],
  }),
);
export const riskDistribution = [
  { name: "Low", value: 164203, fill: "var(--risk-low)" },
  { name: "Moderate", value: 72104, fill: "var(--risk-moderate)" },
  { name: "Medium", value: 32901, fill: "var(--risk-medium)" },
  { name: "High", value: 15097, fill: "var(--risk-high)" },
  { name: "Critical", value: 502, fill: "var(--risk-critical)" },
];
export const demoCases = {
  fraud: {
    transaction: transactions[0] ?? transactions[4],
    title: "High-risk fraud",
    description: "Critical-risk synthetic demonstration case",
  },
  medium: {
    transaction: transactions[2]
      ? {
          ...transactions[2],
          rawProbability: 0.532,
          riskScore: 53,
          riskBand: "Medium" as const,
          decision: "MONITOR" as const,
        }
      : transactions[4],
    title: "Medium-risk legitimate",
    description: "Borderline synthetic legitimate case",
  },
  falsePositive: {
    transaction: transactions[3] ?? transactions[4],
    title: "False-positive-like case",
    description: "High model probability with a legitimate demo label",
  },
};
export const driftPhases = [
  { phase: "Training", rate: 0.1052, decision: "BASELINE", features: [] },
  {
    phase: "Phase 1",
    rate: 1.0104,
    decision: "REJECT_ADAPTATION",
    features: ["step", "step_normalized", "hour_cos", "dest_time_since_previous_tx"],
  },
  {
    phase: "Phase 2",
    rate: 2.832,
    decision: "REJECT_ADAPTATION",
    features: ["step", "step_normalized", "dest_time_since_previous_tx", "hour_cos", "hour_sin"],
  },
  {
    phase: "Phase 3",
    rate: 1.8302,
    decision: "REJECT_ADAPTATION",
    features: ["step", "step_normalized", "dest_time_since_previous_tx", "hour_cos", "hour_sin"],
  },
];
