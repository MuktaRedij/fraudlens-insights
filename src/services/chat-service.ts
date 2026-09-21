/**
 * FraudLens AI Assistant — service layer (Demo Intelligence Mode).
 *
 * The UI only ever calls `sendChatMessage`. To connect a real backend/LLM later,
 * replace the body of `sendChatMessage` with:
 *   const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify(request) });
 *   return (await res.json()) as ChatResponse;
 * No component changes are required. No API keys ever live in frontend code.
 */
import { alerts, calibrationMetrics, driftPhases, modelMetrics, transactions } from "@/data/mock-data";
import { formatCurrency, formatPercent, getRiskBand } from "@/lib/risk-utils";
import type { Transaction } from "@/lib/types";

export type ChatRole = "user" | "assistant";
export type ChatMessage = { id: string; role: ChatRole; content: string; createdAt: string; actions?: ChatAction[]; relatedTransactionIds?: string[] };
export type ChatAction = { label: string; to: string };

export type AssistantContext = {
  route: string;
  pageLabel: string;
  transactionId?: string;
  transaction?: Transaction;
  visibleAlertIds?: string[];
  notes?: string[];
};

export type ChatRequest = { message: string; conversationHistory: ChatMessage[]; context: AssistantContext };
export type ChatResponse = { message: string; suggestedActions?: string[]; relatedTransactionIds?: string[]; actions?: ChatAction[] };

export const ASSISTANT_MODE = "Demo Intelligence Mode";
export const ASSISTANT_MODE_DETAIL = "Backend AI not connected — responses are composed locally from the data shown in this application.";

const num = (v: number, d = 6) => v.toFixed(d);

/* ------------------------------------------------------------------ intents */

type Intent =
  | "transaction" | "shap" | "riskVsProbability" | "model" | "calibration" | "imbalance"
  | "drift" | "anomaly" | "research" | "alerts" | "nextSteps" | "metrics" | "feedback" | "capabilities" | "unknown";

const INTENT_KEYWORDS: Record<Exclude<Intent, "unknown">, string[]> = {
  transaction: ["transaction", "flagged", "suspicious", "this tx", "high risk", "why is", "summarize", "simple terms", "amount"],
  shap: ["shap", "explain", "explanation", "contribution", "contributor", "feature", "why was", "factors", "increased"],
  riskVsProbability: ["difference", "risk score", "probability", "0-100", "0–100", "band", "scale"],
  model: ["model", "lightgbm", "xgboost", "logistic", "detector", "which model", "using"],
  calibration: ["calibration", "platt", "isotonic", "calibrated", "brier", "probability quality"],
  imbalance: ["imbalance", "smote", "class weight", "rare", "minority", "resampling"],
  drift: ["drift", "psi", "shift", "adaptation", "retrain", "adaptive", "governance", "phase"],
  anomaly: ["anomaly", "isolation forest", "unsupervised", "outlier"],
  research: ["research", "dataset", "paysim", "ieee", "credit card fraud", "experiment", "evaluation", "perform"],
  alerts: ["alert", "queue", "assigned", "escalate", "investigating", "open alerts"],
  nextSteps: ["next", "investigate", "should i", "recommend", "action", "what now"],
  metrics: ["precision", "recall", "pr-auc", "average precision", "roc", "log loss", "logloss", "performance", "metric"],
  feedback: ["feedback", "human-in-the-loop", "analyst review", "mark as", "false positive"],
  capabilities: ["what can you", "help", "who are you", "capabilities", "hello", "hi"],
};

function scoreIntents(message: string, context: AssistantContext): Intent {
  const q = message.toLowerCase();
  let best: Intent = "unknown";
  let bestScore = 0;
  for (const [intent, words] of Object.entries(INTENT_KEYWORDS) as [Exclude<Intent, "unknown">, string[]][]) {
    let score = 0;
    for (const w of words) if (q.includes(w)) score += w.includes(" ") ? 2.5 : 1.5;
    // route affinity nudges ties toward the page the analyst is on
    if (context.route.startsWith("/transactions") && (intent === "transaction" || intent === "nextSteps")) score += 0.6;
    if (context.route === "/analyze" && (intent === "transaction" || intent === "shap")) score += 0.6;
    if (context.route === "/models" && (intent === "model" || intent === "calibration" || intent === "metrics")) score += 0.6;
    if (context.route === "/explainability" && intent === "shap") score += 0.8;
    if (context.route === "/drift" && (intent === "drift" || intent === "anomaly")) score += 0.8;
    if (context.route === "/research" && intent === "research") score += 0.8;
    if (context.route === "/alerts" && intent === "alerts") score += 0.8;
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  return bestScore >= 1.5 ? best : "unknown";
}

function findReferencedTransaction(message: string, context: AssistantContext): Transaction | undefined {
  const match = message.toUpperCase().match(/(?:DEMO-TX-)?(\d{4})/);
  if (match) {
    const byId = transactions.find(t => t.id.endsWith(match[1] ?? ""));
    if (byId) return byId;
  }
  return context.transaction;
}

/* --------------------------------------------------------------- composers */

function transactionSummary(tx: Transaction): ChatResponse {
  const top = tx.shapPositive.slice(0, 3).map(c => `${c.feature} (+${c.contribution.toFixed(2)}, input ${c.value})`).join(", ");
  const down = tx.shapNegative.slice(0, 2).map(c => `${c.feature} (${c.contribution.toFixed(2)})`).join(", ");
  const message = [
    `**Risk:** ${tx.riskBand} — ${tx.status}`,
    `**Risk Score:** ${tx.riskScore}/100`,
    `**Fraud Probability:** ${formatPercent(tx.rawProbability, 1)} (calibrated)`,
    `**Decision:** ${tx.decision}`,
    `**Model:** ${tx.model} · Platt Scaling`,
    `**Amount:** ${formatCurrency(tx.amount)} · ${tx.type} / ${tx.category}`,
    `**Key Factors:** ${top || "no positive contributors recorded"}`,
    `**Offsetting Factors:** ${down || "none recorded"}`,
    `**Recommended Investigation:** ${recommendation(tx)}`,
    "",
    `V-prefixed features are PCA-derived features in the dataset; their real-world meaning is not known. SHAP values show model contribution, not causation.`,
  ].join("\n");
  return {
    message,
    relatedTransactionIds: [tx.id],
    actions: [{ label: "View Transaction", to: `/transactions/${tx.id}` }, { label: "Open Explanation", to: "/explainability" }],
    suggestedActions: ["What does the SHAP explanation mean?", "What should an analyst investigate next?", "What is the difference between fraud probability and risk score?"],
  };
}

function recommendation(tx: Transaction) {
  if (tx.riskScore >= 94) return "Escalate for immediate analyst attention and confirm the account's recent transaction sequence.";
  if (tx.riskScore >= 88) return "Queue for priority review; compare behavioural context with the account's baseline.";
  if (tx.riskScore >= 54) return "Manual review — check the offsetting contributors before recording an outcome.";
  return "Monitor only under the current demonstration policy; no analyst action required.";
}

function shapExplanation(tx?: Transaction): ChatResponse {
  const base = [
    "SHAP attributes a model prediction across input features. Positive values push the predicted fraud risk up, negative values pull it down.",
    "It describes how the model used the features — it does not establish causality, and anonymised PCA features (V1–V28) have no documented real-world meaning.",
  ];
  if (tx) {
    base.push("", `**Transaction:** ${tx.id}`, ...tx.shapPositive.slice(0, 5).map(c => `↑ ${c.feature}  +${c.contribution.toFixed(2)}  (input ${c.value})`), ...tx.shapNegative.slice(0, 3).map(c => `↓ ${c.feature}  ${c.contribution.toFixed(2)}  (input ${c.value})`));
  }
  return {
    message: base.join("\n"),
    ...(tx ? { relatedTransactionIds: [tx.id] } : {}),
    actions: [{ label: "Open Explanation", to: "/explainability" }],
    suggestedActions: ["Which model is being used?", "Explain this transaction in simple terms."],
  };
}

function modelAnswer(q: string): ChatResponse {
  const wanted = modelMetrics.filter(m => q.includes(m.name.toLowerCase().split(" ")[0] ?? "") && q.includes(m.name.toLowerCase().slice(0, 4)));
  const rows = (wanted.length ? wanted : modelMetrics).map(m => `• ${m.name} — Val AP ${num(m.validationAP)} / ROC ${num(m.validationRoc)} · Test AP ${num(m.testAP)} / ROC ${num(m.testRoc)}`);
  return {
    message: [
      "**Model:** LightGBM + SMOTE is the active demonstration detector, with Platt scaling as the calibration layer.",
      "**Dataset:** Credit Card Fraud (frozen research evaluation).",
      "**Metric:** Average Precision (PR-AUC) is the primary ranking metric under severe class imbalance; ROC-AUC is secondary.",
      "",
      "Documented candidates:",
      ...rows,
      "",
      "**Interpretation:** LightGBM SMOTE has the higher validation AP among the primary LightGBM and XGBoost candidates. Test performance is reported as untouched generalization evidence and was not used for selection — the platform does not rank a single best model.",
    ].join("\n"),
    actions: [{ label: "View Model", to: "/models" }],
    suggestedActions: ["Explain the current model performance.", "How does FraudLens handle class imbalance?", "What does calibration change?"],
  };
}

function calibrationAnswer(): ChatResponse {
  return {
    message: [
      "**Model:** calibrated probability layers documented in the application.",
      ...calibrationMetrics.map(c => `• ${c.name} — Val Brier ${num(c.validationBrier)} / LogLoss ${num(c.validationLogLoss)} · Test Brier ${num(c.testBrier)} / LogLoss ${num(c.testLogLoss)}`),
      "",
      "**Interpretation:** calibration is treated as a probability-representation layer rather than a detector-ranking improvement. Brier score and log loss describe probability quality; AP and ROC-AUC describe ranking.",
    ].join("\n"),
    actions: [{ label: "View Model", to: "/models" }],
    suggestedActions: ["What is the difference between fraud probability and risk score?"],
  };
}

function driftAnswer(q: string): ChatResponse {
  const named = driftPhases.find(p => q.includes(p.phase.toLowerCase()));
  const phases = named ? [named] : driftPhases;
  const baseline = driftPhases[0]?.rate ?? 0;
  return {
    message: [
      "**Drift Status:** drift detected in the PaySim adaptive experiment across all evaluated phases.",
      ...phases.map(p => `• ${p.phase} — fraud rate ${p.rate.toFixed(4)}%${p.phase === "Training" ? " (baseline)" : ` (${(p.rate / baseline).toFixed(1)}× baseline)`} · governance ${p.decision}`),
      `**Affected Features:** ${(named?.features.length ? named.features : driftPhases[2]?.features ?? []).join(", ") || "none recorded for the baseline"}`,
      "**Interpretation:** drift means the feature distribution or fraud prevalence changed — it does not by itself mean retraining helps.",
      "**Recommended Action:** governance recorded REJECT_ADAPTATION for Phase 1, 2 and 3: adaptation candidates performed worse than the static detector on forward validation, so the current model is retained.",
    ].join("\n"),
    actions: [{ label: "View Drift", to: "/drift" }],
    suggestedActions: ["What is the secondary anomaly signal?", "What does data drift mean?"],
  };
}

function anomalyAnswer(): ChatResponse {
  return {
    message: [
      "**Drift Status:** not applicable — Isolation Forest is an unsupervised secondary signal, not a drift measure.",
      "**Documented results (PaySim):** validation AP 0.024055, test AP 0.020599, validation ROC-AUC 0.556046, test ROC-AUC 0.562617.",
      "**Interpretation:** Isolation Forest did not provide measurable incremental predictive improvement over the supervised detector in the evaluated fusion experiment. It is therefore treated as a secondary analyst/monitoring signal.",
    ].join("\n"),
    actions: [{ label: "View Drift", to: "/drift" }],
  };
}

function researchAnswer(): ChatResponse {
  return {
    message: [
      "**Frozen test evaluation (datasets evaluated independently, not concatenated):**",
      "• PaySim — 6,362,620 transactions, 8,213 fraud (0.129083%) · AP 0.693698 · ROC-AUC 0.974756 · Brier 0.006155",
      "• IEEE-CIS — 193,540 transactions, 5,689 fraud (2.9394%) · AP 0.599440 · ROC-AUC 0.896436 · Brier 0.024092",
      "• Credit Card Fraud — 284,807 transactions, 492 fraud (0.172749%) · AP 0.758784 · ROC-AUC 0.976314 · Brier 0.000413",
      "",
      "**Interpretation:** evaluation is chronological and imbalance-aware, with probability calibration, SHAP explainability, drift monitoring and controlled adaptation under a human-in-the-loop workflow.",
    ].join("\n"),
    actions: [{ label: "Open Research", to: "/research" }],
    suggestedActions: ["How does FraudLens handle class imbalance?", "What does data drift mean?"],
  };
}

function alertsAnswer(context: AssistantContext): ChatResponse {
  const visible = context.visibleAlertIds?.length ? alerts.filter(a => context.visibleAlertIds?.includes(a.id)) : alerts;
  const count = (s: string) => visible.filter(a => a.status === s).length;
  const top = [...visible].sort((a, b) => b.riskScore - a.riskScore).slice(0, 3);
  return {
    message: [
      `**Alert queue (${visible.length} demo alerts in view):** Open ${count("Open")} · Investigating ${count("Investigating")} · Escalated ${count("Escalated")} · Resolved ${count("Resolved")} · False Positive ${count("False Positive")}`,
      "**Highest risk in view:**",
      ...top.map(a => `• ${a.id} → ${a.transactionId} · score ${a.riskScore} (${a.riskBand}) · ${a.status} · ${a.assignedTo} — ${a.reason}`),
      "**Recommended Investigation:** work the Critical band first, then High-band alerts that are still unassigned.",
    ].join("\n"),
    relatedTransactionIds: top.map(a => a.transactionId),
    actions: [{ label: "Open Alert", to: "/alerts" }, ...(top[0] ? [{ label: "View Transaction", to: `/transactions/${top[0].transactionId}` }] : [])],
  };
}

function metricsAnswer(): ChatResponse {
  return {
    message: [
      "**Model:** LightGBM + SMOTE with Platt scaling · **Dataset:** Credit Card Fraud (frozen test evaluation).",
      "**Metric:** Precision 0.79 · Recall 0.76 · PR-AUC 0.758784 · ROC-AUC 0.976314 · Brier 0.000413 · LogLoss 0.002948.",
      "**Interpretation:** these come from the frozen research evaluation, not live production metrics. PR-AUC is the primary metric because fraud is severely under-represented; Brier and log loss describe probability quality.",
    ].join("\n"),
    actions: [{ label: "View Model", to: "/models" }],
  };
}

function riskVsProbabilityAnswer(tx?: Transaction): ChatResponse {
  const lines = [
    "**Fraud Probability** is the model-estimated probability after the calibration layer (Platt scaling in this demo).",
    "**Risk Score** is a 0–100 representation of that calibrated probability: round(probability × 100).",
    "**Risk Band:** 0–19 Low · 20–39 Moderate · 40–59 Medium · 60–79 High · 80–100 Critical.",
    "**Decision policy (demonstration):** 0–53 Monitor/Allow · 54–87 Review · 88–93 High Risk · 94–100 Critical. Decision thresholds are policy thresholds selected using validation data.",
  ];
  if (tx) lines.push("", `On ${tx.id}: probability ${formatPercent(tx.rawProbability, 1)} → score ${tx.riskScore} → band ${getRiskBand(tx.riskScore)} → decision ${tx.decision}.`);
  return { message: lines.join("\n"), ...(tx ? { relatedTransactionIds: [tx.id] } : {}), suggestedActions: ["Which model is being used?", "What does the SHAP explanation mean?"] };
}

function imbalanceAnswer(): ChatResponse {
  return {
    message: [
      "**Model:** class-imbalance handling is compared across documented candidates rather than assumed.",
      "**Approaches evaluated:** LightGBM unweighted, LightGBM class-weighted, LightGBM with SMOTE resampling, XGBoost, and a Logistic Regression baseline.",
      "**Metric:** Average Precision (PR-AUC) is used as the primary metric because accuracy is uninformative at a ~0.17% fraud rate.",
      "**Interpretation:** the documented validation and test AP values for each candidate are shown on the Model Intelligence page; no candidate is labelled best.",
    ].join("\n"),
    actions: [{ label: "View Model", to: "/models" }],
  };
}

function nextStepsAnswer(tx?: Transaction, context?: AssistantContext): ChatResponse {
  if (!tx) {
    return {
      message: ["**Recommended Investigation:**", "• Start from the Critical band in the alert queue.", "• Open the transaction, read the SHAP contributors, and compare with behavioural context.", "• Record an outcome (Fraud / Legitimate / False Positive) so human-in-the-loop feedback is captured.", "", `I don't have a specific transaction in the current demo context${context ? ` for ${context.pageLabel}` : ""}. Open a transaction and ask again for a case-level recommendation.`].join("\n"),
      actions: [{ label: "Open Alert", to: "/alerts" }],
    };
  }
  return {
    message: [
      `**Transaction:** ${tx.id} · score ${tx.riskScore}/100 (${tx.riskBand}) · decision ${tx.decision}`,
      "**Recommended Investigation:**",
      `• ${recommendation(tx)}`,
      `• Review the top contributors (${tx.shapPositive.slice(0, 3).map(c => c.feature).join(", ")}) against the account's behavioural baseline.`,
      `• Check the secondary anomaly signal (${tx.anomalyScore}) as supporting context only.`,
      "• Record the outcome so the feedback loop captures the analyst decision.",
    ].join("\n"),
    relatedTransactionIds: [tx.id],
    actions: [{ label: "View Transaction", to: `/transactions/${tx.id}` }],
  };
}

function feedbackAnswer(): ChatResponse {
  return {
    message: [
      "Analyst feedback is the human-in-the-loop layer: Mark as Fraud, Mark as Legitimate, False Positive, Escalate, or Add Note, each with an outcome, comment and confidence.",
      "In this demonstration the outcome is stored in local application state only. When a backend is connected it maps to the feedback-learning pipeline.",
    ].join("\n"),
    actions: [{ label: "Open Alert", to: "/alerts" }],
  };
}

function capabilitiesAnswer(context: AssistantContext): ChatResponse {
  return {
    message: [
      `I'm the FraudLens assistant, running in ${ASSISTANT_MODE}. ${ASSISTANT_MODE_DETAIL}`,
      "",
      `You're on **${context.pageLabel}**. I can explain a transaction's risk score, fraud probability and decision, read its SHAP contributors, summarise model and calibration evidence, describe drift and adaptation governance, and walk the documented dataset experiments.`,
      "I only use values already shown in this application — if something isn't here, I'll say so.",
    ].join("\n"),
    suggestedActions: suggestedQuestions(context).slice(0, 3),
  };
}

function unknownAnswer(context: AssistantContext): ChatResponse {
  return {
    message: [
      "I don't have that information in the current demo context.",
      "",
      `I can help with transaction risk, SHAP explanations, model and calibration evidence, drift and adaptation governance, the alert queue, and the documented dataset experiments. You're currently on ${context.pageLabel}.`,
    ].join("\n"),
    suggestedActions: suggestedQuestions(context).slice(0, 3),
  };
}

/* ------------------------------------------------------- contextual prompts */

export function suggestedQuestions(context: AssistantContext): string[] {
  switch (true) {
    case context.route.startsWith("/transactions/") || Boolean(context.transactionId):
      return ["Why was this transaction flagged?", "What factors increased the risk score?", "Summarize this transaction for an analyst.", "What should an analyst investigate next?"];
    case context.route === "/analyze":
      return ["Why is this transaction high risk?", "Explain this transaction in simple terms.", "What does the SHAP explanation mean?", "What is the difference between fraud probability and risk score?"];
    case context.route === "/models":
      return ["Which model is being used?", "Explain the current model performance.", "How does FraudLens handle class imbalance?", "What does calibration change?"];
    case context.route === "/explainability":
      return ["What does the SHAP explanation mean?", "What factors increased the risk score?", "Do SHAP values prove causality?"];
    case context.route === "/drift":
      return ["Is there drift?", "What does data drift mean?", "Why was adaptation rejected?", "What is the secondary anomaly signal?"];
    case context.route === "/research":
      return ["How did the models perform?", "Which datasets were evaluated?", "How does FraudLens handle class imbalance?"];
    case context.route === "/alerts":
      return ["What should an analyst investigate next?", "Summarize the alert queue.", "Which alerts are critical?"];
    case context.route === "/settings":
      return ["What is the current decision policy?", "What is the difference between fraud probability and risk score?"];
    default:
      return ["What is the difference between fraud probability and risk score?", "Which model is being used?", "What does data drift mean?", "What should an analyst investigate next?"];
  }
}

/* ---------------------------------------------------------------- transport */

function buildResponse(request: ChatRequest): ChatResponse {
  const q = request.message.toLowerCase();
  const intent = scoreIntents(request.message, request.context);
  const tx = findReferencedTransaction(request.message, request.context);

  switch (intent) {
    case "transaction":
      return tx ? transactionSummary(tx) : nextStepsAnswer(undefined, request.context);
    case "shap": return shapExplanation(tx);
    case "riskVsProbability": return riskVsProbabilityAnswer(tx);
    case "model": return modelAnswer(q);
    case "calibration": return calibrationAnswer();
    case "imbalance": return imbalanceAnswer();
    case "drift": return driftAnswer(q);
    case "anomaly": return anomalyAnswer();
    case "research": return researchAnswer();
    case "alerts": return alertsAnswer(request.context);
    case "metrics": return metricsAnswer();
    case "nextSteps": return nextStepsAnswer(tx, request.context);
    case "feedback": return feedbackAnswer();
    case "capabilities": return capabilitiesAnswer(request.context);
    default: return unknownAnswer(request.context);
  }
}

/** Single integration point. Swap the body for `POST /api/chat` when a backend exists. */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  if (!request.message.trim()) throw new Error("EMPTY_MESSAGE");
  await new Promise(resolve => setTimeout(resolve, 420 + Math.random() * 380));
  const response = buildResponse(request);
  if (!response.message) throw new Error("INVALID_RESPONSE");
  return response;
}
