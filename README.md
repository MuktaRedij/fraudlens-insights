# FraudLens Insights — AI Financial Fraud Detection System

**FraudLens** is an AI-based adaptive and explainable financial fraud detection system designed as a final-year AI/ML engineering project. It pairs a modern standalone React & Vite frontend with an active, high-performance FastAPI service delegating to a frozen 22-feature LightGBM inference and Platt calibration pipeline.

---

## Repository Architecture

```text
fraudlens-insights/
├── frontend/                     # Standalone React + TypeScript + Vite + Tailwind frontend
│   ├── public/                   # Static web assets
│   ├── src/                      # Source components, routes, hooks, lib, services
│   │   ├── components/           # UI and domain components
│   │   ├── routes/               # TanStack Router route definitions
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Utilities and formatting
│   │   ├── services/             # Frontend API and chat service adapters
│   │   └── data/                 # Demo/mock transaction datasets
│   ├── package.json              # Frontend dependencies and scripts
│   ├── vite.config.ts            # Vite build configuration
│   └── tsconfig.json             # TypeScript compiler settings
│
├── backend/                      # Python backend services and ML deployments
│   ├── app/                      # Active FastAPI production service
│   │   ├── main.py               # FastAPI application entrypoint & lifespan
│   │   ├── core/                 # Core configuration and settings
│   │   ├── api/routes/           # Health and prediction routes
│   │   ├── schemas/              # Pydantic validation schemas
│   │   └── services/             # InferenceService adapter
│   ├── ml/                       # Machine Learning packages
│   │   └── deployment/
│   │       ├── fraud_model_v1/   # Frozen 22-feature LightGBM + Platt calibration package
│   │       ├── inference/        # Production feature engineering and inference pipeline
│   │       └── tests/            # ML inference regression tests
│   ├── legacy/                   # Preserved legacy implementations
│   │   └── flask_app/            # Historical Flask backend (reference only)
│   ├── tests/                    # Integration and API test suites
│   │   └── api/                  # FastAPI integration test suite
│   ├── requirements.txt          # Backend Python dependencies
│   ├── .env.example              # Environment variables template
│   └── README.md                 # Backend documentation
│
├── docs/                         # Technical documentation
│   ├── architecture/             # System architecture & roadmap
│   │   └── system-overview.md    # Active vs. legacy system overview
│   ├── ml/                       # Machine learning documentation
│   │   └── frozen-model.md       # Frozen fraud_model_v1 specification & contract
│   ├── api/                      # API contracts & endpoint specifications
│   └── research/                 # Dataset audits & experimental research notes
│
├── scripts/                      # Verification and automation utilities
│   └── verify_deployment.py      # Frozen deployment SHA-256 integrity validator
│
├── .github/                      # GitHub configurations
│   └── copilot-instructions.md   # Repository architectural rules & constraints
├── .gitignore                    # Git ignore specifications
└── README.md                     # Root project documentation
```

---

## Development & Quick Start

### 1. Run the Active FastAPI Backend

From the repository root:

```powershell
Set-Location backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

Active API endpoints:
- `GET  /health` - System health, engine initialization status, and artifact verification
- `GET  /api/v1/model` - Frozen model metadata (LightGBM, 22 features, Platt calibration)
- `GET  /api/v1/system/status` - Runtime state and integrity status
- `POST /api/v1/predict` - Real-time fraud scoring for raw transactions

### 2. Verify Frozen Model Integrity

From the repository root, run the cryptographic checksum validator:

```powershell
backend\.venv\Scripts\python.exe scripts/verify_deployment.py
```

### 3. Run Backend API Tests

From the `backend` directory:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m pytest tests/api -v
```

### 4. Run the Frontend Application

From the repository root:

```powershell
Set-Location frontend
npm install
npm run dev
```

To build the frontend for production:

```powershell
Set-Location frontend
npm run build
```

### 5. Legacy Flask Backend (Reference Only)

The legacy Flask backend is preserved under `backend/legacy/flask_app/`. It uses an earlier 37-feature Credit Card Fraud contract whose model files are not part of the active frozen deployment:

```powershell
Set-Location backend
python run.py
```

---

## Original frontend and product specification

The following original specification is preserved for product context; its `src/` and `public/` paths are relative to `frontend/` after reorganization.

Build a full-fledged, production-quality AI financial fraud detection web application called:

“FraudLens — AI-Based Adaptive and Explainable Financial Fraud Detection System”

This is a major/final-year AI/ML research project. The application should look and behave like a serious financial fraud analytics and investigation platform, NOT like a generic student dashboard or a simple CRUD application.

IMPORTANT:

- Build the FRONTEND FIRST.

- Do not require a backend to make the frontend functional.

- Use realistic mock data initially.

- Architect the frontend so the mock API can later be replaced by a FastAPI backend without changing the UI components.

- Do NOT train models in the frontend.

- Do NOT invent machine-learning performance numbers.

- Use the research results and system architecture described below.

- The frontend should be polished enough for a final-year project demonstration, research presentation, viva, and portfolio.

- The UI must be responsive and work well on desktop, laptop, and tablet.

- Prioritize usability, visual hierarchy, accessibility, and professional financial-security aesthetics.

============================================================

1. PRODUCT PURPOSE

============================================================

FraudLens is an AI-powered financial fraud detection and investigation platform.

The conceptual pipeline is:

Transaction Ingestion

        ↓

Validation

        ↓

Feature Engineering

        ↓

Behavioral Profiling

        ↓

Supervised Fraud Detection

        ↓

Anomaly Detection

        ↓

Risk Scoring

        ↓

Explainability

        ↓

Decisioning

        ↓

Analyst Feedback

        ↓

Drift Monitoring

        ↓

Controlled Model Adaptation

The frontend should communicate this complete system architecture.

The application must support:

1. Real-time transaction risk analysis

2. Fraud probability visualization

3. 0–100 risk scoring

4. Risk bands

5. Automated decision recommendations

6. SHAP-based explainability

7. Transaction investigation

8. Fraud-alert management

9. Model-performance visualization

10. Dataset comparison

11. Calibration analysis

12. Anomaly detection monitoring

13. Feature-drift monitoring

14. Adaptive-model governance

15. Analyst feedback

16. Research/project information

17. System health and model information

============================================================

2. VISUAL DESIGN DIRECTION

============================================================

Create a sophisticated financial-security / enterprise AI visual language.

DO NOT make it look like:

- a basic Bootstrap admin template

- a generic SaaS landing page

- a cryptocurrency dashboard

- a gaming dashboard

- a colorful student project

- a template with excessive gradients

- an overly futuristic neon interface

The visual identity should communicate:

AI

Financial Security

Fraud Intelligence

Trust

Explainability

Professional Analytics

Use a dark-first interface.

Primary appearance:

- very dark charcoal/navy background

- slightly lighter panels/cards

- subtle borders

- restrained use of accent colors

- strong white/light-gray typography

- muted secondary text

- high contrast for important risk information

Use risk colors consistently:

LOW:

neutral/green visual treatment

MODERATE:

yellow/amber

MEDIUM:

orange

HIGH:

red-orange

CRITICAL:

strong red

Do not use bright colors everywhere. Risk colors should be reserved for risk-related information.

Use:

- clean cards

- subtle shadows

- thin borders

- rounded corners, but not excessively rounded

- clear section headers

- compact data tables

- professional charts

- meaningful empty states

- loading states

- skeleton states

- tooltips

- hover states

- transitions that are subtle and professional

Typography:

Use a modern professional sans-serif font such as Inter.

Use a clear hierarchy:

- page title

- section title

- card title

- metric

- supporting text

- metadata

============================================================

3. GLOBAL APPLICATION LAYOUT

============================================================

Create a persistent application shell.

Desktop:

------------------------------------------------------------

| SIDEBAR              | TOP BAR                           |

|                      |                                  |

| FraudLens            | Search     Alerts    User       |

|                      |                                  |

| Dashboard            |----------------------------------|

| Analyze Transaction  |                                  |

| Transactions         | Main Content                     |

| Alerts               |                                  |

| Model Intelligence   |                                  |

| Explainability       |                                  |

| Drift & Adaptation   |                                  |

| Research             |                                  |

| Settings             |                                  |

|                      |                                  |

| System Status        |                                  |

------------------------------------------------------------

Sidebar:

Logo:

FraudLens

Subtitle:

AI Fraud Intelligence

Navigation:

Dashboard

Analyze Transaction

Transactions

Fraud Alerts

Model Intelligence

Explainability

Drift & Adaptation

Research

Settings

At the bottom:

System Status

● All systems operational

Model:

LightGBM / XGBoost

Version:

v1.0.0

The sidebar should collapse on smaller screens.

Top navigation:

- global search

- notification icon

- current system status

- user/profile menu

- optional command palette trigger

============================================================

4. DASHBOARD

============================================================

Route:

/dashboard

This is the primary landing page after login.

Header:

“Fraud Intelligence Dashboard”

Subtitle:

“Real-time transaction risk monitoring, fraud detection analytics, and model intelligence.”

Top KPI cards:

1. Transactions Analyzed

Example:

284,807

2. Fraud Cases

Example:

492

3. Fraud Rate

Example:

0.17%

4. Critical Alerts

Example:

46

5. High-Risk Alerts

Example:

51

6. Detection Coverage

Example:

99.8%

Do not claim these values are live. Mark mock/demo values appropriately until backend integration.

Each KPI card should include:

- metric

- label

- small trend indicator

- optional contextual description

Main dashboard grid:

LEFT:

“Risk Distribution”

Use a donut/pie chart showing:

Low

Moderate

Medium

High

Critical

RIGHT:

“Fraud Detection Activity”

Use a professional line/area chart showing transaction volume and fraud-alert activity over time.

Below:

“Recent Fraud Alerts”

Table columns:

Transaction ID

Timestamp

Amount

Fraud Probability

Risk Score

Risk Band

Decision

Model

Status

Example:

TX-1042

$450.00

78.3%

94

Critical

Escalate

LightGBM

Open

TX-1039

$210.00

72.1%

88

High

Review

LightGBM

Investigating

TX-1037

$91.20

52.4%

61

High

Review

LightGBM

Open

Allow clicking a transaction to navigate to:

/transactions/:id

Below that:

“Detection Performance Snapshot”

Cards/charts:

Precision

Recall

PR-AUC

ROC-AUC

Brier Score

LogLoss

Include a small note:

“Metrics shown are based on the frozen research evaluation and should not be interpreted as live production metrics.”

============================================================

5. ANALYZE TRANSACTION PAGE

============================================================

Route:

/analyze

This is the most important interactive demo page.

Page title:

“Analyze Transaction”

Subtitle:

“Submit transaction features to generate an AI fraud-risk assessment.”

Create a professional transaction input form.

Sections:

A. Transaction Information

Amount

Transaction Time

Time Since Previous Transaction

Transaction Type

Transaction Category

B. PCA / Behavioral Features

V1

V2

V3

...

V28

C. Derived Features

log_amount

time_hours

time_days

day_index

hour

hour_sin

hour_cos

Use grouped form sections.

For V1–V28:

- compact numerical inputs

- tooltips

- optional “Use demo transaction” button

Buttons:

[Analyze Transaction]

[Load Demo Fraud Case]

[Clear]

When Analyze is clicked, simulate a short inference loading state:

“Validating transaction...”

“Computing features...”

“Running fraud detector...”

“Generating explanation...”

Then show result.

============================================================

6. TRANSACTION RESULT VIEW

============================================================

After analysis, display a large risk summary.

Example:

AI FRAUD RISK ASSESSMENT

Risk Score

94 / 100

CRITICAL

Fraud Probability

78.3%

Decision

ESCALATE

Model

LightGBM + SMOTE

Calibration

Platt Scaling

Status

Requires analyst attention

Create a large circular/gauge-style risk visualization.

Risk scale:

0 ------------------------------ 100

LOW              HIGH        CRITICAL

The exact score should be dynamically generated from mock data.

Do not imply that mock inference is actually calling the ML model.

Clearly show:

“Demo Mode — connected to mock inference service”

This label will later become:

“Live Model — API Connected”

============================================================

7. DECISION POLICY

============================================================

Create a decision-policy visualization.

For the current Credit Card Fraud model:

Risk Score:

0–53

Monitor / Allow

54–87

Review

88–93

High Risk

94–100

Critical

However, present these as:

“Current demonstration decision policy”

and make them configurable later through the backend.

Show:

Decision

REVIEW / HIGH_RISK / CRITICAL / MONITOR

Add a tooltip explaining:

“The risk score is derived from calibrated fraud probability. Decision thresholds are policy thresholds selected using validation data.”

============================================================

8. SHAP EXPLAINABILITY

============================================================

Create a major section:

“Why was this transaction flagged?”

Subtitle:

“Feature contributions from the model explanation layer.”

Show positive and negative contributors.

Positive contributors:

V14

V17

V10

V4

V12

Negative contributors:

V8

Amount

V19

Use horizontal contribution bars.

Positive:

feature increases predicted fraud risk

Negative:

feature decreases predicted fraud risk

Each feature should display:

Feature

Contribution

Input Value

Example:

V14

+3.69

-3.828

V17

+1.47

-7.551

V10

+0.80

-4.501

Add an information box:

“SHAP values describe how features influenced the model prediction. They indicate model contribution, not causation.”

VERY IMPORTANT:

Never describe anonymized PCA features as if their real-world meaning is known.

For example:

Do NOT say:

“V14 represents transaction velocity.”

Instead:

“V14 is a PCA-derived feature in the dataset.”

============================================================

9. TRANSACTION DETAILS PAGE

============================================================

Route:

/transactions/:id

Create a full investigation page.

Header:

Transaction TX-1042

Status:

Open / Investigating / Resolved

Main cards:

Risk Score

Fraud Probability

Decision

Model

Timestamp

Amount

Then sections:

Transaction Details

Model Assessment

Risk Assessment

SHAP Explanation

Anomaly Signal

Behavioral Context

Analyst Notes

Investigation History

Add action buttons:

[Mark as Fraud]

[Mark as Legitimate]

[Escalate]

[Add Note]

These actions should work locally using mock state.

============================================================

10. TRANSACTIONS PAGE

============================================================

Route:

/transactions

Create an enterprise-style transaction table.

Columns:

Transaction ID

Date/Time

Amount

Probability

Risk Score

Risk Band

Decision

Model

Status

Features:

- search

- filter by risk band

- filter by decision

- filter by status

- filter by model

- amount range

- date range

- sorting

- pagination

- rows per page

- export button

Use realistic transaction data.

Clicking a row opens the transaction details page.

Add a small summary:

Showing 1–25 of 284,807 transactions

============================================================

11. FRAUD ALERTS PAGE

============================================================

Route:

/alerts

This page focuses on analyst workflow.

Top cards:

Open Alerts

Critical

High Risk

Under Investigation

Resolved

Alert table:

Alert ID

Transaction

Risk Score

Risk Band

Reason

Created

Assigned To

Status

Create statuses:

Open

Investigating

Escalated

Resolved

False Positive

Allow local interactions:

- assign analyst

- change status

- add note

- escalate

Add a right-side detail drawer when an alert is selected.

============================================================

12. MODEL INTELLIGENCE PAGE

============================================================

Route:

/models

Title:

“Model Intelligence”

This page should communicate the actual research work.

Create a model comparison table.

Models:

Logistic Regression

LightGBM Unweighted

LightGBM Class-Weighted

LightGBM SMOTE

XGBoost

Metrics:

Validation AP

Validation ROC-AUC

Validation Brier

Validation LogLoss

Test AP

Test ROC-AUC

Test Brier

Test LogLoss

Use these exact research values:

Logistic Regression:

Validation AP: 0.845620

Validation ROC-AUC: 0.983936

Validation Brier: 0.028441

Validation LogLoss: 0.115043

Test AP: 0.723577

Test ROC-AUC: 0.978814

Test Brier: 0.023488

Test LogLoss: 0.096481

LightGBM Unweighted:

Validation AP: 0.825828

Validation ROC-AUC: 0.983424

Validation Brier: 0.000352

Validation LogLoss: 0.002238

Test AP: 0.755212

Test ROC-AUC: 0.981492

Test Brier: 0.000423

Test LogLoss: 0.002759

LightGBM Class-Weighted:

Validation AP: 0.812504

Validation ROC-AUC: 0.972218

Validation Brier: 0.000397

Validation LogLoss: 0.003372

Test AP: 0.732349

Test ROC-AUC: 0.957013

Test Brier: 0.000692

Test LogLoss: 0.004898

LightGBM SMOTE:

Validation AP: 0.862150

Validation ROC-AUC: 0.982384

Validation Brier: 0.001471

Validation LogLoss: 0.013341

Test AP: 0.758784

Test ROC-AUC: 0.976314

Test Brier: 0.001858

Test LogLoss: 0.015842

XGBoost:

Validation AP: 0.853855

Validation ROC-AUC: 0.985764

Validation Brier: 0.000336

Validation LogLoss: 0.002121

Test AP: 0.764778

Test ROC-AUC: 0.971735

Test Brier: 0.000478

Test LogLoss: 0.003345

IMPORTANT:

Do not create a “winner” badge.

Do not rank models.

Do not label one model “best.”

Instead show:

“Primary selection evidence”

and explain:

“LightGBM SMOTE has the higher validation AP among the primary LightGBM and XGBoost candidates.”

Also show:

“Test performance is reported as untouched generalization evidence and was not used for model selection.”

============================================================

13. CALIBRATION SECTION

============================================================

Inside Model Intelligence:

“Probability Calibration”

Compare:

LightGBM SMOTE + Platt

XGBoost + Isotonic

Show:

Validation Brier

Validation LogLoss

Test Brier

Test LogLoss

Test AP

Test ROC-AUC

Exact values:

LightGBM SMOTE + Platt:

Validation Brier: 0.000354

Validation LogLoss: 0.002091

Validation AP: 0.862150

Validation ROC-AUC: 0.982384

Test Brier: 0.000413

Test LogLoss: 0.002948

Test AP: 0.758784

Test ROC-AUC: 0.976314

XGBoost + Isotonic:

Validation Brier: 0.000319

Validation LogLoss: 0.001942

Validation AP: 0.844014

Validation ROC-AUC: 0.986165

Test Brier: 0.000382

Test LogLoss: 0.002687

Test AP: 0.754546

Test ROC-AUC: 0.967313

Add explanatory text:

“Calibration is treated as a probability-representation layer rather than a detector-ranking improvement.”

============================================================

14. EXPLAINABILITY PAGE

============================================================

Route:

/explainability

Create three tabs:

1. Global Explanation

2. Fraud-Specific Explanation

3. Transaction Explanation

GLOBAL:

Show top feature importance.

Credit Card Fraud XGBoost SHAP global features:

V14

V4

V12

V10

Time

V8

V1

V11

Amount

V7

V24

V19

V18

V3

V22

V16

V21

V26

V2

V5

Use bar charts.

FRAUD-SPECIFIC:

Show:

V14

V10

V4

V12

Time

V7

V8

V16

V3

Amount

Show positive and negative contribution panels.

TRANSACTION:

Allow selecting a transaction and display:

Risk score

Fraud probability

Top positive contributors

Top negative contributors

Feature values

============================================================

15. DRIFT & ADAPTATION PAGE

============================================================

Route:

/drift

This page communicates the adaptive part of the research.

Header:

“Drift & Adaptive Detection”

Show:

Feature Drift

Fraud Rate Shift

Adaptation Candidates

Governance Decision

Create a fraud-rate-over-time chart.

Use the PaySim adaptive experiment:

Training fraud rate:

0.1052%

Phase 1:

1.0104%

Phase 2:

2.8320%

Phase 3:

1.8302%

Show the relative changes.

Create a feature-drift table.

Important high-drift signals:

Phase 1:

step

step_normalized

hour_cos

dest_time_since_previous_tx

Phase 2:

step

step_normalized

dest_time_since_previous_tx

hour_cos

hour_sin

Phase 3:

step

step_normalized

dest_time_since_previous_tx

hour_cos

hour_sin

Create a governance flow:

Drift detected

      ↓

Candidate adaptation generated

      ↓

Forward validation

      ↓

Performance improved?

   ↙           ↘

 YES            NO

Accept        Reject

                ↓

          Retain current model

Show the actual research result:

Phase 1:

REJECT_ADAPTATION

Phase 2:

REJECT_ADAPTATION

Phase 3:

REJECT_ADAPTATION

Reason:

“Drift was detected, but adaptation candidates performed worse than the static detector on forward validation.”

This is important:

Do NOT portray adaptation as automatically improving the model.

============================================================

16. ANOMALY DETECTION SECTION

============================================================

Inside Drift & Adaptation or a dedicated page:

“Anomaly Detection”

Show:

Isolation Forest

Purpose:

Secondary anomaly signal

PaySim validation AP:

0.024055

PaySim test AP:

0.020599

PaySim validation ROC-AUC:

0.556046

PaySim test ROC-AUC:

0.562617

Explain:

“Isolation Forest did not provide measurable incremental predictive improvement over the supervised detector in the evaluated fusion experiment. It is therefore treated as a secondary analyst/monitoring signal.”

Again:

Do not hide negative research results.

Present them professionally.

============================================================

17. RESEARCH PAGE

============================================================

Route:

/research

This page should showcase the academic/research component.

Title:

“Research & Evaluation”

Sections:

A. System Architecture

Interactive diagram:

Transaction

↓

Validation

↓

Feature Engineering

↓

Behavioral Profiling

↓

Supervised Detection

↓

Anomaly Detection

↓

Risk Scoring

↓

Explainability

↓

Decisioning

↓

Feedback

↓

Monitoring

↓

Controlled Adaptation

B. Dataset Comparison

PaySim

6,362,620 transactions

8,213 fraud

Fraud rate 0.129083%

IEEE-CIS

193,540 transactions

5,689 fraud

Fraud rate 2.9394%

Credit Card Fraud

284,807 transactions

492 fraud

Fraud rate 0.172749%

Explain that datasets are evaluated independently rather than concatenated.

C. Frozen Test Performance

PaySim:

AP 0.693698

ROC-AUC 0.974756

Brier 0.006155

IEEE-CIS:

AP 0.599440

ROC-AUC 0.896436

Brier 0.024092

Credit Card Fraud:

AP 0.758784

ROC-AUC 0.976314

Brier 0.000413

D. Research Principles

Display cards:

Chronological Validation

Imbalance-Aware Evaluation

Probability Calibration

Explainable AI

Drift Monitoring

Controlled Adaptation

Human-in-the-Loop

============================================================

18. RISK SCORE PAGE / COMPONENT

============================================================

Create a reusable RiskScore component.

Input:

probability

Output:

risk score 0–100

Formula:

risk_score = round(probability × 100)

Bands:

0–19:

Low

20–39:

Moderate

40–59:

Medium

60–79:

High

80–100:

Critical

Make this component reusable everywhere.

============================================================

19. MOCK API ARCHITECTURE

============================================================

Create:

frontend/src/services/api.ts

The frontend must call service functions rather than directly accessing mock objects.

Functions:

getDashboardStats()

getTransactions()

getTransaction(id)

getAlerts()

getModelMetrics()

getRiskPolicy()

analyzeTransaction(transaction)

getExplanation(transactionId)

getDriftMetrics()

getResearchMetrics()

Initially these functions should return mock data.

Structure the code so they can later become:

fetch("/api/v1/dashboard")

fetch("/api/v1/predict")

fetch("/api/v1/explain")

etc.

Do not tightly couple components to mock data.

============================================================

20. MOCK DATA

============================================================

Create realistic mock transaction data.

At least 50 transactions.

Include:

id

timestamp

amount

rawProbability

riskScore

riskBand

decision

model

status

features

shapPositive

shapNegative

Create at least:

10 low-risk transactions

10 moderate

10 medium

10 high

10 critical

Include both legitimate and fraudulent cases.

Include realistic but clearly synthetic/demo transaction IDs.

============================================================

21. DEMO TRANSACTION CASES

============================================================

Create at least three built-in demo cases.

CASE 1:

High-risk fraud

Risk score:

94

Probability:

0.940 or similar

Decision:

CRITICAL

Strong SHAP contributors:

V14

V17

V10

V4

V12

CASE 2:

Medium-risk legitimate

Risk score:

53

Probability:

0.532

Decision:

MONITOR

CASE 3:

False-positive-like case

High model probability but legitimate label.

Use this to demonstrate why human review and explainability are important.

Clearly mark all cases as DEMO DATA.

============================================================

22. ANALYST FEEDBACK

============================================================

Allow the analyst to submit:

Mark as Fraud

Mark as Legitimate

False Positive

Escalate

Add Note

Create a modal:

“Submit Analyst Feedback”

Fields:

Outcome

Comment

Confidence

After submission show:

“Feedback recorded successfully.”

For now persist to local state/localStorage.

Later this will map to the backend feedback-learning system.

============================================================

23. NOTIFICATIONS

============================================================

Create a notification dropdown.

Examples:

Critical transaction detected

New high-risk alert

Model drift detected

Analyst feedback received

System health check completed

Use mock timestamps.

============================================================

24. SEARCH

============================================================

Global search should allow searching:

Transaction ID

Alert ID

Risk band

Decision

Show quick results.

============================================================

25. SETTINGS PAGE

============================================================

Route:

/settings

Sections:

General

Risk Policy

Model Configuration

Notifications

Display

Risk Policy:

Review threshold

High-risk threshold

Critical threshold

These should be displayed as configuration values.

Do not allow the frontend to pretend to permanently modify the real ML model.

Show:

“Policy configuration is currently in demonstration mode.”

============================================================

26. SYSTEM STATUS

============================================================

Create a reusable status indicator.

Examples:

Frontend:

Operational

Model:

Loaded

Calibration:

Loaded

SHAP:

Available

Backend:

Not Connected

Since the frontend is being built before the backend, show:

“Demo Mode”

When backend is eventually connected, this should become dynamic.

============================================================

27. RESPONSIVE DESIGN

============================================================

Desktop:

Full sidebar + multi-column dashboard.

Tablet:

Collapsible sidebar.

Mobile:

Bottom navigation or drawer navigation.

Tables should become horizontally scrollable cards on mobile.

Charts must resize correctly.

Forms must stack vertically on smaller screens.

============================================================

28. ACCESSIBILITY

============================================================

Implement:

- keyboard navigation

- visible focus states

- semantic buttons

- aria labels where appropriate

- sufficient contrast

- tooltips for unfamiliar ML terminology

- accessible chart summaries

- no information conveyed only through color

============================================================

29. UX DETAILS

============================================================

Add:

Loading skeletons

Empty states

Error states

Success toasts

Confirmation dialogs

Hover states

Smooth transitions

Chart tooltips

Table row hover

Copy transaction ID

Copy risk score

Export CSV button

Refresh data button

Do not overuse animations.

============================================================

30. IMPORTANT ML TERMINOLOGY

============================================================

Use these terms accurately:

Fraud Probability:

Model-estimated probability after the relevant calibration layer.

Risk Score:

0–100 representation of calibrated probability.

Risk Band:

Low / Moderate / Medium / High / Critical.

SHAP:

Model contribution/explanation method.

PR-AUC / AP:

Primary fraud-detection ranking metric because of severe class imbalance.

ROC-AUC:

Secondary discrimination metric.

Brier Score:

Probability quality/calibration-related metric.

LogLoss:

Probabilistic prediction quality metric.

Isolation Forest:

Secondary unsupervised anomaly signal.

Drift:

Change in feature/data distribution or fraud prevalence.

Adaptation:

Controlled candidate model update evaluated using forward validation.

============================================================

31. DO NOT MAKE THESE CLAIMS

============================================================

Never say:

“100% accurate”

“perfect fraud detection”

“guaranteed fraud detection”

“best model”

“most accurate model”

“production-ready AI”

“eliminates fraud”

“zero false positives”

Do not rank models.

Do not fabricate live predictions.

Do not fabricate backend connectivity.

Do not imply that SHAP proves causality.

Do not imply that drift automatically means retraining is beneficial.

============================================================

32. MODEL INFORMATION

============================================================

The current research system contains:

Primary supervised branches:

LightGBM

XGBoost

Logistic Regression baseline

Unsupervised:

Isolation Forest

Explainability:

SHAP TreeExplainer

Calibration:

Platt scaling

Isotonic regression

Adaptive governance:

Drift detection

Candidate retraining

Forward validation

Accept/reject gate

Fallback to static model

============================================================

33. FRONTEND TECHNOLOGY

============================================================

Use:

React

Vite

Tailwind CSS

React Router

Recharts

Lucide React

Use reusable components.

Suggested component structure:

frontend/src/

├── components/

│   ├── layout/

│   │   ├── Sidebar

│   │   ├── Topbar

│   │   └── AppShell

│   │

│   ├── dashboard/

│   │   ├── KPIcard

│   │   ├── RiskDistribution

│   │   ├── FraudActivityChart

│   │   └── RecentAlerts

│   │

│   ├── risk/

│   │   ├── RiskScore

│   │   ├── RiskBand

│   │   └── DecisionBadge

│   │

│   ├── explanation/

│   │   ├── SHAPBarChart

│   │   ├── FeatureContribution

│   │   └── ExplanationPanel

│   │

│   ├── transaction/

│   │   ├── TransactionForm

│   │   ├── TransactionTable

│   │   └── TransactionDetails

│   │

│   └── charts/

│

├── pages/

│   ├── Dashboard

│   ├── AnalyzeTransaction

│   ├── Transactions

│   ├── TransactionDetails

│   ├── Alerts

│   ├── Models

│   ├── Explainability

│   ├── Drift

│   ├── Research

│   └── Settings

│

├── services/

│   └── api.js

│

├── data/

│   └── mockData.js

│

└── lib/

    └── riskUtils.js

============================================================

34. ROUTES

============================================================

Implement:

/dashboard

/analyze

/transactions

/transactions/:id

/alerts

/models

/explainability

/drift

/research

/settings

Default route:

/dashboard

============================================================

35. NAVIGATION BEHAVIOR

============================================================

Dashboard:

click alert → transaction details

Analyze:

submit → analysis result

Transactions:

click row → transaction details

Alerts:

click alert → alert details drawer

Models:

click model → model detail section

Explainability:

click transaction → explanation

Drift:

click phase → phase detail

Research:

dataset card → dataset details

============================================================

36. POLISHED DASHBOARD MICROCOPY

============================================================

Use professional language.

Examples:

“AI-powered transaction risk assessment”

“Model-derived fraud probability”

“Analyst review required”

“Potentially anomalous behavior detected”

“Explanation generated from model contributions”

“Current decision policy”

“Chronological evaluation”

“Frozen test evaluation”

“Secondary anomaly signal”

“Forward-validation governance”

============================================================

37. LANDING / LOGIN EXPERIENCE

============================================================

If you create a login screen, keep it simple.

Brand:

FraudLens

Tagline:

“Adaptive. Explainable. Risk-aware.”

Subtitle:

“AI-powered financial fraud intelligence.”

Use a professional authentication card.

For demonstration, allow:

[Enter Demo Dashboard]

Do not implement real authentication unless needed.

============================================================

38. EMPTY / LOADING / ERROR STATES

============================================================

Create polished states.

Loading:

“Analyzing transaction...”

“Generating explanation...”

“Loading model intelligence...”

Empty:

“No transactions match the current filters.”

Error:

“Unable to load analysis data.”

Demo-mode message:

“This dashboard is currently using synthetic demonstration data.”

============================================================

39. FINAL QUALITY BAR

============================================================

The final result must feel like:

An enterprise fraud operations center + explainable AI research platform.

It should be visually comparable to a modern financial-security product.

Prioritize:

1. Dashboard polish

2. Analyze Transaction experience

3. Risk score visualization

4. SHAP explanation

5. Transaction investigation workflow

6. Model intelligence

7. Drift/adaptation visualization

8. Research presentation

9. Responsive design

10. Clean reusable architecture

Do not build a shallow prototype.

Build the frontend as a coherent application with reusable components, realistic data, proper routing, state management, polished interactions, and clear separation between UI, services, and data.

============================================================

40. MOST IMPORTANT IMPLEMENTATION RULE

============================================================

The frontend is being developed BEFORE the FastAPI backend.

Therefore:

DO NOT hard-code API calls directly into components.

Use:

Component

    ↓

Service Layer

    ↓

Mock API

Later:

Component

    ↓

Service Layer

    ↓

FastAPI Backend

    ↓

Frozen ML Artifacts

This is essential.

============================================================

41. INITIAL DEMO MODEL

============================================================

For the live-looking demo interface, use:

Dataset:

Credit Card Fraud

Primary demonstration detector:

LightGBM SMOTE

Calibration:

Platt scaling

Risk score:

round(calibrated_probability × 100)

Explainability:

SHAP

Secondary anomaly signal:

Isolation Forest

The frontend should identify the model as:

“LightGBM + SMOTE”

and calibration as:

“Platt Scaling”

until the backend is connected.

============================================================

42. FINAL DEMO FLOW

============================================================

A user should be able to demonstrate the complete project in approximately 3–5 minutes:

1. Open Dashboard

2. Show fraud statistics

3. Open Analyze Transaction

4. Load Demo Fraud Case

5. Click Analyze

6. Show Risk Score

7. Show Fraud Probability

8. Show Decision

9. Scroll to SHAP explanation

10. Explain positive/negative contributors

11. Open transaction details

12. Show analyst workflow

13. Open Model Intelligence

14. Show validation/test research metrics

15. Open Drift & Adaptation

16. Show drift detection

17. Show adaptation rejection based on forward validation

18. Open Research

19. Show multi-dataset evaluation

The entire application should support this flow naturally.

============================================================

43. FINAL IMPLEMENTATION SPECIFICATION

============================================================

Build the complete frontend now.

Do not stop at a landing page.

Do not generate only static screenshots.

Implement the actual React application with:

- routing

- reusable components

- mock state

- mock API service

- realistic data

- interactive charts

- transaction analysis

- risk scoring

- SHAP visualization

- alert management

- model comparison

- calibration visualization

- drift monitoring

- adaptation governance

- research dashboard

- responsive layout

- polished dark financial-security design

The application should be functional in demo mode immediately.

Keep all ML/backend integration points clean and replaceable so the FastAPI backend can be connected later with minimal frontend changes.

Start by building the application shell, navigation, design system, dashboard, and mock data architecture, then implement all remaining pages and interactions.

## Local Frontend Development

Prefer working locally? You need Node.js (v18+) and npm:

```sh
cd frontend
npm install
npm run dev
```
