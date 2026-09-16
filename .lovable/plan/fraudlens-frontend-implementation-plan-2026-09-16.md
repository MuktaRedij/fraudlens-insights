# FraudLens frontend implementation plan

## Goal
Build the complete dark-first FraudLens investigation application as a frontend-only, responsive demo. Every screen will use a typed service layer backed by synthetic data, so a future FastAPI integration can replace service implementations without changing page components.

## 1. Foundation and application shell
- Replace the blank home screen with a redirect to `/dashboard`.
- Establish the restrained charcoal/navy financial-security design system, semantic risk colors, professional typography, spacing, borders, focus states, and reduced-motion behavior.
- Build the persistent desktop sidebar, tablet drawer, mobile navigation, top search, notifications, profile menu, demo-mode indicator, and system/model status panel.
- Add shared page headers, metric cards, badges, tooltips, loading skeletons, empty/error states, confirmation dialogs, feedback modal, and toast notifications.
- Give every content route unique FraudLens metadata for search and social previews.

## 2. Data, service, and state architecture
- Define shared TypeScript domain types for transactions, alerts, explanations, model metrics, calibration, drift, research data, risk policy, and analyst feedback.
- Create reusable risk utilities using `round(probability × 100)` and the required Low/Moderate/Medium/High/Critical bands.
- Create at least 50 clearly synthetic transactions, balanced across the five risk bands, with features, SHAP contributions, decisions, statuses, and legitimate/fraud examples.
- Add the three required demonstration cases, exact supplied research metrics, notifications, alert records, time-series data, and system status data.
- Expose all data only through asynchronous service functions (`getDashboardStats`, `getTransactions`, `getTransaction`, `getAlerts`, `getModelMetrics`, `getRiskPolicy`, `analyzeTransaction`, `getExplanation`, `getDriftMetrics`, `getResearchMetrics`).
- Add small artificial delays and controlled loading/error shapes so UI states are demonstrable. Keep the service contracts suitable for later `/api/v1/*` fetch implementations.
- Keep analyst outcomes, notes, alert assignment/status, and display preferences in a local demo store persisted to localStorage after hydration.

## 3. Dashboard and global discovery
- Build `/dashboard` with clearly labeled demo KPIs, risk distribution donut, transaction/fraud activity chart, recent alerts table, and frozen evaluation snapshot.
- Make alert and transaction rows open the corresponding investigation view.
- Implement global search across transaction IDs, alert IDs, risk bands, and decisions with keyboard navigation and quick-result links.
- Add notification filtering/read state and refresh/export actions.

## 4. Transaction analysis and reusable risk explanation
- Build `/analyze` with grouped transaction, V1–V28 PCA, and derived-feature inputs; accessible terminology tooltips; clear/reset controls; and demo-case loading.
- Simulate the four-stage analysis sequence without implying a real model call.
- Render a reusable gauge-style RiskScore, calibrated probability, decision, model, calibration, status, demo-service label, and the required demonstration decision policy.
- Build reusable SHAP contribution views with positive/negative bars, input values, accessible summaries, and the required non-causality/PCA wording.
- Support all three demo scenarios, including the high-probability legitimate case.

## 5. Transaction and alert operations
- Build `/transactions` with a compact professional table, search, risk/decision/status/model filters, amount and date ranges, sorting, pagination, rows-per-page controls, CSV export, copy actions, and responsive overflow behavior.
- Build `/transactions/$id` with risk and model summaries, transaction details, assessment, SHAP, anomaly signal, behavioral context, analyst notes, history, and locally functional fraud/legitimate/escalate/note actions.
- Build `/alerts` with workflow KPIs, filtering, selectable rows, a responsive detail drawer, analyst assignment, status changes, escalation, notes, confirmations, and success feedback.

## 6. Model intelligence and explainability
- Build `/models` with the exact supplied validation/test metrics for all five models, sortable/comparable columns, expandable model detail, and no ranking or winner language.
- Add “Primary selection evidence,” untouched-test clarification, and the exact two-method calibration comparison with a professional calibration visualization.
- Build `/explainability` with Global, Fraud-Specific, and Transaction tabs; required feature-order charts; positive/negative panels; transaction selection; probability, score, and feature values.

## 7. Drift, adaptation, anomaly detection, and research
- Build `/drift` with the supplied PaySim fraud-rate timeline, relative shifts, phase-selectable feature-drift table, governance flow, and detailed Phase 1–3 rejection outcomes.
- Add the exact Isolation Forest metrics and the transparent secondary-signal conclusion.
- Build `/research` with an interactive architecture pipeline, independently evaluated dataset cards/details, exact frozen test metrics, and the seven research-principle panels.

## 8. Settings and system presentation
- Build `/settings` sections for general preferences, demonstration-only risk policy values, model configuration, notifications, and display.
- Clearly distinguish configurable interface preferences from non-persistent model/policy controls.
- Use system status components consistently: Frontend Operational, Model Loaded, Calibration Loaded, SHAP Available, Backend Not Connected, Demo Mode.

## 9. Verification and polish
- Validate the complete 3–5 minute demo path from dashboard through analysis, investigation, model intelligence, drift, and research.
- Test direct navigation and row/link transitions across every route.
- Verify local interactions, filters, sorting, pagination, search, exports, clipboard actions, drawers, dialogs, and persisted feedback.
- Check desktop, laptop, tablet, and mobile layouts with special attention to charts, wide tables, dense forms, drawers, and navigation.
- Check keyboard access, visible focus, labels, contrast, chart summaries, risk text labels, loading/empty/error states, and reduced motion.

## Technical details
- Keep the existing TanStack Start router rather than adding React Router; route behavior and URLs remain exactly as requested.
- Use React Query for service-backed reads, Recharts for responsive charts, Lucide icons, existing Radix-based controls, Tailwind v4 semantic tokens, and small focused reusable components.
- Use TypeScript service/data modules (`api.ts`, typed mock modules) for safety while preserving the requested service API names and replacement boundary.
- No backend, authentication, model training, fabricated live inference, or invented research metrics will be added.
