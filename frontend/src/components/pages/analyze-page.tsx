import { useRef, useState } from "react";
import { Eraser, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel } from "@/components/shared/page";
import { demoCases } from "@/data/mock-data";
import { analyzeTransaction } from "@/services/api";
import type { PredictionResult } from "@/lib/types";

const pipelineSteps = [
  "Validate raw transaction",
  "Engineer behavioral features",
  "Run frozen LightGBM model",
  "Apply Platt calibration",
];
export function AnalyzePage() {
  const [amount, setAmount] = useState("450");
  const [transactionId, setTransactionId] = useState("TX-1001");
  const [transactionDt, setTransactionDt] = useState("12192900");
  const [card1, setCard1] = useState("");
  const [addr1, setAddr1] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [result, setResult] = useState<PredictionResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const requestId = useRef(0);

  const invalidatePrediction = () => {
    requestId.current += 1;
    setResult(undefined);
    setError(undefined);
    setLoading(false);
  };

  const updateInput = (setter: (value: string) => void, value: string) => {
    invalidatePrediction();
    setter(value);
  };

  const run = async () => {
    const currentRequestId = ++requestId.current;
    setResult(undefined);
    setError(undefined);
    setLoading(false);

    const parsedAmount = Number(amount);
    const parsedTransactionDt = Number(transactionDt);
    const submittedTransactionId = transactionId.trim();
    if (!submittedTransactionId) {
      setError("Transaction ID is required.");
      return;
    }
    if (!amount.trim()) {
      setError("Transaction amount is required.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError("Transaction amount must be a finite, non-negative number.");
      return;
    }
    if (!transactionDt.trim()) {
      setError("TransactionDT is required.");
      return;
    }
    if (!Number.isFinite(parsedTransactionDt)) {
      setError("TransactionDT must be a finite number of seconds.");
      return;
    }

    setLoading(true);

    try {
      const nextResult = await analyzeTransaction({
        amount: parsedAmount,
        transactionDt: parsedTransactionDt,
        transactionId: submittedTransactionId,
        ...(card1.trim() ? { card1: card1.trim() } : {}),
        ...(addr1.trim() ? { addr1: addr1.trim() } : {}),
        ...(emailDomain.trim() ? { emailDomain: emailDomain.trim() } : {}),
      });
      if (currentRequestId === requestId.current) {
        if (String(nextResult.transaction_id) !== submittedTransactionId) {
          throw new Error("Prediction service returned a result for a different transaction.");
        }
        setResult(nextResult);
      }
    } catch (error) {
      if (currentRequestId === requestId.current) {
        setError(
          error instanceof Error ? error.message : "Prediction request could not be completed.",
        );
      }
    } finally {
      if (currentRequestId === requestId.current) {
        setLoading(false);
      }
    }
  };

  const loadSample = () => {
    const tx = demoCases["fraud"]?.transaction;
    if (!tx) return;
    invalidatePrediction();
    setTransactionId(`TX-${Date.now().toString().slice(-6)}`);
    setAmount(String(tx.amount));
    setTransactionDt((Number(transactionDt) + 3600).toString());
    setCard1("");
    setAddr1("");
    setEmailDomain("");
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow="Interactive assessment"
        title="Analyze Transaction"
        description="Submit a raw transaction to the live frozen FastAPI inference service."
      />
      <p className="rounded-md border border-demo/25 bg-demo/8 px-4 py-3 text-xs text-demo">
        Sample values are synthetic. Predictions are returned by the live API; no decision threshold
        is configured.
      </p>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-5">
          <Panel
            title="Transaction Information"
            description="Raw transaction payload that the backend accepts before feature engineering."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Transaction ID">
                <Input
                  value={transactionId}
                  onChange={(e) => updateInput(setTransactionId, e.target.value)}
                />
              </Field>
              <Field label="Amount (USD)">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => updateInput(setAmount, e.target.value)}
                />
              </Field>
              <Field label="TransactionDT (seconds from dataset reference)">
                <Input
                  type="number"
                  step="any"
                  value={transactionDt}
                  onChange={(e) => updateInput(setTransactionDt, e.target.value)}
                />
              </Field>
              <Field label="card1 (optional)">
                <Input value={card1} onChange={(e) => updateInput(setCard1, e.target.value)} />
              </Field>
              <Field label="addr1 (optional)">
                <Input value={addr1} onChange={(e) => updateInput(setAddr1, e.target.value)} />
              </Field>
              <Field label="P_emaildomain (optional)">
                <Input
                  value={emailDomain}
                  onChange={(e) => updateInput(setEmailDomain, e.target.value)}
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Live inference contract"
            description="The frozen deployment keeps feature engineering in the model package; the API accepts raw transaction input."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "TransactionID", value: "string | int" },
                { label: "TransactionDT", value: "seconds from dataset reference" },
                { label: "TransactionAmt", value: "non-negative amount" },
              ].map((field) => (
                <div key={field.label} className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">{field.label}</p>
                  <p className="mt-2 font-mono text-sm font-semibold">{field.value}</p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="flex flex-wrap gap-2">
            <Button onClick={run} disabled={loading}>
              <Play />
              {loading ? "Submitting..." : "Analyze Transaction"}
            </Button>
            <Button variant="secondary" onClick={loadSample} disabled={loading}>
              <Sparkles />
              Load Sample Case
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                invalidatePrediction();
                setAmount("0");
                setTransactionId("TX-NEW");
                setTransactionDt("12192900");
                setCard1("");
                setAddr1("");
                setEmailDomain("");
              }}
              disabled={loading}
            >
              <Eraser />
              Clear
            </Button>
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>
        <aside>
          <Panel
            title="Inference Pipeline"
            description="Backend inference stages"
            className="xl:sticky xl:top-24"
          >
            <div className="space-y-3">
              {pipelineSteps.map((step, i) => (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-md border border-border p-3 text-xs"
                >
                  <span className="grid size-6 place-items-center rounded-full bg-muted text-muted-foreground">
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
            <p role="status" aria-live="polite" className="mt-4 text-xs text-muted-foreground">
              {loading ? "Waiting for the inference service..." : ""}
            </p>
          </Panel>
        </aside>
      </div>
      {result && (
        <Panel
          title="Frozen model prediction"
          description="Values shown are returned directly by the live inference service."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PredictionValue label="Model version" value={result.model_version} />
            <PredictionValue label="Transaction ID" value={String(result.transaction_id)} />
            <PredictionValue
              label="Raw probability"
              value={result.raw_probability.toString()}
              detail={`${(result.raw_probability * 100).toFixed(2)}%`}
            />
            <PredictionValue
              label="Calibrated fraud probability"
              value={result.calibrated_fraud_probability.toString()}
              detail={`${(result.calibrated_fraud_probability * 100).toFixed(2)}%`}
            />
            <PredictionValue label="Decision" value="Not configured" />
          </div>
        </Panel>
      )}
    </div>
  );
}
function PredictionValue({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-4">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <div className="mt-2 break-all font-mono text-sm font-semibold">{value}</div>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
