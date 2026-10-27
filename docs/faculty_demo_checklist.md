# FraudLens — Faculty Demonstration Checklist

Use this checklist for a reproducible local demonstration. It intentionally demonstrates
the working live-analysis path without presenting demo-only screens as live model output.

## 1. Pre-demo checks

- [ ] Use the repository root:
  `C:\Users\Mukta\Downloads\fraudlens-insights`
- [ ] Confirm the frozen deployment is present under
  [`backend\ml\deployment\fraud_model_v1`](../backend/ml/deployment/fraud_model_v1/).
- [ ] Keep the backend terminal and frontend terminal open.
- [ ] Do not claim a finalized fraud threshold, production decision policy, or independently
  reproduced model metrics.

## 2. Start the backend

From the repository root:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Expected startup evidence:

- `Application startup complete`
- `Frozen inference engine initialized`
- model version `fraud_model_v1`

Optional health check in a second terminal:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
```

Expected response status: `200`.

## 3. Start the frontend

From the repository root, in a second terminal:

```powershell
Set-Location frontend
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000"
npm run dev -- --host 127.0.0.1 --port 5173
```

Open:

```text
http://127.0.0.1:5173/analyze
```

The backend now allows both `localhost` and `127.0.0.1` development origins.

## 4. Main live demonstration

1. Open **Analyze Transaction**.
2. Keep or enter:
   - Transaction ID: `TX-1001`
   - Amount: `450`
   - TransactionDT: `12192900`
3. Select **Analyze Transaction**.
4. Show the **Frozen model prediction** panel.
5. Point out that:
   - the model version is `fraud_model_v1`;
   - the displayed transaction ID matches the submitted ID;
   - raw and calibrated probabilities are returned by the live API; and
   - the decision is **Not configured**, because no operational threshold is finalized.

The exact probability values can vary when the stateful stream has received prior
transactions. Do not present a probability as an accuracy claim.

## 5. Validation and error demonstrations

### Empty amount

1. Clear the Amount field.
2. Select **Analyze Transaction**.
3. Expected message: `Transaction amount is required.`

### Invalid amount

1. Enter a negative amount or non-finite value where the browser permits it.
2. Submit.
3. Expected behavior: a visible validation error and no misleading prediction panel.

### Backend unavailable fallback

If the API is unavailable, the page should show an error alert and no successful
prediction result. Restore the backend and submit again to demonstrate recovery.

## 6. What not to present as live

The dashboard, transactions, alerts, research metrics, risk-policy tables, and
explanation panels contain demo/mock data or local simulated services. They may be
shown as UI prototypes, but label them as **demo data** rather than current model
output.

The active API does not provide a verified risk score, fraud/legitimate decision,
SHAP explanation, persistence, authentication, or multi-worker state coordination.

## 7. Fallback plan

If the backend cannot start:

1. Show the frontend interface and explain the architecture.
2. Show the repository's passing backend test and deployment-integrity results.
3. Explain that the live Analyze result requires the FastAPI service and frozen
   deployment artifacts.
4. Do not substitute a fabricated result or claim that mock dashboard values came
   from the deployed model.

