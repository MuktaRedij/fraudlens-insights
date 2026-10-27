export type RiskBand = "Low" | "Moderate" | "Medium" | "High" | "Critical";
export type Decision = "MONITOR" | "REVIEW" | "HIGH_RISK" | "CRITICAL";
export type TxStatus = "Open" | "Investigating" | "Resolved" | "False Positive";
export type Contribution = { feature: string; contribution: number; value: number };
export type Transaction = {
  id: string;
  timestamp: string;
  amount: number;
  rawProbability: number;
  riskScore: number;
  riskBand: RiskBand;
  decision: Decision;
  model: string;
  status: TxStatus;
  label: "Fraud" | "Legitimate";
  type: string;
  category: string;
  features: Record<string, number>;
  shapPositive: Contribution[];
  shapNegative: Contribution[];
  anomalyScore: number;
  notes: string[];
};
export type Alert = {
  id: string;
  transactionId: string;
  riskScore: number;
  riskBand: RiskBand;
  reason: string;
  created: string;
  assignedTo: string;
  status: "Open" | "Investigating" | "Escalated" | "Resolved" | "False Positive";
};
export type ModelMetric = {
  name: string;
  validationAP: number;
  validationRoc: number;
  validationBrier: number;
  validationLogLoss: number;
  testAP: number;
  testRoc: number;
  testBrier: number;
  testLogLoss: number;
};
export type AnalysisInput = {
  amount: number;
  transactionDt: number;
  transactionId: string;
  card1?: string;
  addr1?: string;
  emailDomain?: string;
};
export type PredictionResult = {
  model_version: string;
  transaction_id: number | string;
  raw_probability: number;
  calibrated_fraud_probability: number;
};
