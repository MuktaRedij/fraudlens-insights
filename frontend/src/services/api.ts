import type { Alert, AnalysisInput, PredictionResult, Transaction } from "@/lib/types";
import {
  alerts,
  activityData,
  calibrationMetrics,
  demoCases,
  driftPhases,
  modelMetrics,
  riskDistribution,
  transactions,
} from "@/data/mock-data";

export const API_BASE_URL: string = import.meta.env["VITE_API_BASE_URL"] || "http://localhost:8000";

const wait = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));
export async function getDashboardStats() {
  await wait();
  return {
    kpis: [
      {
        label: "Transactions Analyzed",
        value: "284,807",
        trend: "+8.4%",
        detail: "Synthetic evaluation volume",
      },
      { label: "Fraud Cases", value: "492", trend: "+2.1%", detail: "Frozen dataset labels" },
      { label: "Fraud Rate", value: "0.17%", trend: "−0.01%", detail: "Credit Card Fraud dataset" },
      { label: "Critical Alerts", value: "46", trend: "+6", detail: "Demo queue" },
      { label: "High-Risk Alerts", value: "51", trend: "−4", detail: "Demo queue" },
      {
        label: "Detection Coverage",
        value: "99.8%",
        trend: "Stable",
        detail: "Validation coverage",
      },
    ],
    riskDistribution,
    activityData,
    recent: transactions.slice(0, 6),
  };
}
export async function getTransactions() {
  await wait(180);
  return [...transactions];
}
export async function getTransaction(id: string) {
  await wait(140);
  return transactions.find((t) => t.id === id);
}
export async function getAlerts() {
  await wait(200);
  return [...alerts];
}
export async function getModelMetrics() {
  await wait();
  return { models: modelMetrics, calibration: calibrationMetrics };
}
export async function getRiskPolicy() {
  await wait(120);
  return [
    { range: "0–53", label: "Monitor / Allow", decision: "MONITOR" },
    { range: "54–87", label: "Review", decision: "REVIEW" },
    { range: "88–93", label: "High Risk", decision: "HIGH_RISK" },
    { range: "94–100", label: "Critical", decision: "CRITICAL" },
  ];
}

function toBackendTransaction(input: AnalysisInput) {
  return {
    transaction: {
      TransactionID: input.transactionId,
      TransactionDT: input.transactionDt,
      TransactionAmt: input.amount,
      ...(input.card1 ? { card1: input.card1 } : {}),
      ...(input.addr1 ? { addr1: input.addr1 } : {}),
      ...(input.emailDomain ? { P_emaildomain: input.emailDomain } : {}),
    },
  };
}

function isPredictionResult(value: unknown): value is PredictionResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return (
    typeof result["model_version"] === "string" &&
    (typeof result["transaction_id"] === "string" ||
      typeof result["transaction_id"] === "number") &&
    typeof result["raw_probability"] === "number" &&
    Number.isFinite(result["raw_probability"]) &&
    result["raw_probability"] >= 0 &&
    result["raw_probability"] <= 1 &&
    typeof result["calibrated_fraud_probability"] === "number" &&
    Number.isFinite(result["calibrated_fraud_probability"]) &&
    result["calibrated_fraud_probability"] >= 0 &&
    result["calibrated_fraud_probability"] <= 1
  );
}

function getApiErrorMessage(value: unknown, status: number): string {
  if (typeof value === "object" && value !== null) {
    const body = value as Record<string, unknown>;
    if (typeof body["message"] === "string") return body["message"];
    if (typeof body["detail"] === "string") return body["detail"];
    if (typeof body["detail"] === "object" && body["detail"] !== null) {
      const detail = body["detail"] as Record<string, unknown>;
      if (typeof detail["message"] === "string") return detail["message"];
    }
  }
  return `Prediction request failed (${status})`;
}

export async function analyzeTransaction(input: AnalysisInput): Promise<PredictionResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toBackendTransaction(input)),
  });

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = undefined;
  }

  if (!response.ok) {
    throw new Error(getApiErrorMessage(responseBody, response.status));
  }

  if (!isPredictionResult(responseBody)) {
    throw new Error("Prediction service returned an invalid response.");
  }
  return responseBody;
}
export async function getExplanation(transactionId: string) {
  const tx = await getTransaction(transactionId);
  return tx ? { positive: tx.shapPositive, negative: tx.shapNegative } : undefined;
}
export async function getDriftMetrics() {
  await wait();
  return {
    phases: driftPhases,
    anomaly: {
      name: "Isolation Forest",
      validationAP: 0.024055,
      testAP: 0.020599,
      validationRoc: 0.556046,
      testRoc: 0.562617,
    },
  };
}
export async function getResearchMetrics() {
  await wait();
  return {
    datasets: [
      {
        name: "PaySim",
        transactions: 6362620,
        fraud: 8213,
        rate: 0.129083,
        ap: 0.693698,
        roc: 0.974756,
        brier: 0.006155,
      },
      {
        name: "IEEE-CIS",
        transactions: 193540,
        fraud: 5689,
        rate: 2.9394,
        ap: 0.59944,
        roc: 0.896436,
        brier: 0.024092,
      },
      {
        name: "Credit Card Fraud",
        transactions: 284807,
        fraud: 492,
        rate: 0.172749,
        ap: 0.758784,
        roc: 0.976314,
        brier: 0.000413,
      },
    ],
  };
}
export async function searchAll(query: string) {
  await wait(80);
  const q = query.toLowerCase();
  return {
    transactions: transactions
      .filter((t) => [t.id, t.riskBand, t.decision].some((v) => v.toLowerCase().includes(q)))
      .slice(0, 5),
    alerts: alerts
      .filter((a) => [a.id, a.transactionId, a.riskBand].some((v) => v.toLowerCase().includes(q)))
      .slice(0, 4),
  };
}
export type { Alert, Transaction };
