import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowDown, CheckCircle2, Info, RefreshCcw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DemoNotice, LoadingState, PageHeader, Panel } from "@/components/shared/page";
import { ShapPanel } from "@/components/explanation/shap-panel";
import {
  getDriftMetrics,
  getModelMetrics,
  getResearchMetrics,
  getTransactions,
} from "@/services/api";

const fmt = (v: number) => v.toFixed(6);
export function ModelsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["models"], queryFn: getModelMetrics });
  if (isLoading || !data) return <LoadingState label="Loading model intelligence..." />;
  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow="Frozen research evaluation"
        title="Model Intelligence"
        description="Comparative validation, untouched test evidence, and probability calibration analysis."
      />
      <DemoNotice />
      <Panel
        title="Primary selection evidence"
        description="Selection is based on validation evidence, not untouched test results."
      >
        <p className="text-sm text-foreground">
          LightGBM SMOTE has the higher validation AP among the primary LightGBM and XGBoost
          candidates.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0 text-primary" />
          Test performance is reported as untouched generalization evidence and was not used for
          model selection. Models are not ranked.
        </div>
      </Panel>
      <Panel title="Supervised Model Comparison" description="Exact frozen research values">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Val AP</TableHead>
              <TableHead>Val ROC-AUC</TableHead>
              <TableHead>Val Brier</TableHead>
              <TableHead>Val LogLoss</TableHead>
              <TableHead>Test AP</TableHead>
              <TableHead>Test ROC-AUC</TableHead>
              <TableHead>Test Brier</TableHead>
              <TableHead>Test LogLoss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.models.map((m) => (
              <TableRow key={m.name}>
                <TableCell className="whitespace-nowrap font-medium">{m.name}</TableCell>
                {[
                  m.validationAP,
                  m.validationRoc,
                  m.validationBrier,
                  m.validationLogLoss,
                  m.testAP,
                  m.testRoc,
                  m.testBrier,
                  m.testLogLoss,
                ].map((v, i) => (
                  <TableCell key={i} className="font-mono text-xs">
                    {fmt(v)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
      <Panel
        title="Probability Calibration"
        description="Calibration is treated as a probability-representation layer rather than a detector-ranking improvement."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {data.calibration.map((c) => (
            <article key={c.name} className="rounded-md border border-border p-4">
              <h3 className="text-sm font-semibold">{c.name}</h3>
              <dl className="mt-4 grid grid-cols-2 gap-y-3 text-xs">
                {[
                  ["Validation Brier", c.validationBrier],
                  ["Validation LogLoss", c.validationLogLoss],
                  ["Validation AP", c.validationAP],
                  ["Validation ROC-AUC", c.validationRoc],
                  ["Test Brier", c.testBrier],
                  ["Test LogLoss", c.testLogLoss],
                  ["Test AP", c.testAP],
                  ["Test ROC-AUC", c.testRoc],
                ].map(([k, v]) => (
                  <div className="contents" key={String(k)}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right font-mono">{fmt(Number(v))}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const globalFeatures = [
  "V14",
  "V4",
  "V12",
  "V10",
  "Time",
  "V8",
  "V1",
  "V11",
  "Amount",
  "V7",
  "V24",
  "V19",
  "V18",
  "V3",
  "V22",
  "V16",
  "V21",
  "V26",
  "V2",
  "V5",
].map((feature, i) => ({ feature, value: Number((1.85 - i * 0.072).toFixed(3)) }));
const fraudFeatures = ["V14", "V10", "V4", "V12", "Time", "V7", "V8", "V16", "V3", "Amount"].map(
  (feature, i) => ({ feature, value: Number((2.1 - i * 0.16).toFixed(3)) }),
);
function FeatureChart({ data }: { data: { feature: string; value: number }[] }) {
  return (
    <ChartContainer
      config={{ value: { label: "Mean |SHAP|", color: "var(--primary)" } }}
      className="h-[480px] w-full"
    >
      <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" />
        <YAxis type="category" dataKey="feature" width={55} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--primary)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
export function ExplainabilityPage() {
  const { data = [] } = useQuery({ queryKey: ["transactions"], queryFn: getTransactions });
  const [id, setId] = useState("DEMO-TX-1042");
  const tx = data.find((t) => t.id === id) ?? data[0];
  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow="Model contribution layer"
        title="Explainability"
        description="Inspect global feature importance, fraud-specific patterns, and transaction-level contributions."
      />
      <DemoNotice />
      <Tabs defaultValue="global">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="global">Global Explanation</TabsTrigger>
          <TabsTrigger value="fraud">Fraud-Specific Explanation</TabsTrigger>
          <TabsTrigger value="transaction">Transaction Explanation</TabsTrigger>
        </TabsList>
        <TabsContent value="global">
          <Panel
            title="Credit Card Fraud XGBoost — Global SHAP"
            description="Mean absolute feature contribution across the evaluated sample"
          >
            <FeatureChart data={globalFeatures} />
          </Panel>
        </TabsContent>
        <TabsContent value="fraud">
          <Panel
            title="Fraud-Specific Explanation"
            description="Most influential features among frozen fraud examples"
          >
            <FeatureChart data={fraudFeatures} />
          </Panel>
        </TabsContent>
        <TabsContent value="transaction" className="space-y-5">
          <Panel title="Select synthetic transaction">
            <Select value={id} onValueChange={setId}>
              <SelectTrigger className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.slice(0, 15).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.id} · {t.riskBand} · {t.riskScore}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Panel>
          {tx && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Panel>
                  <p className="text-xs text-muted-foreground">Risk score</p>
                  <strong className="mt-2 block font-mono text-3xl">{tx.riskScore}</strong>
                </Panel>
                <Panel>
                  <p className="text-xs text-muted-foreground">Fraud probability</p>
                  <strong className="mt-2 block font-mono text-3xl">
                    {(tx.rawProbability * 100).toFixed(1)}%
                  </strong>
                </Panel>
                <Panel>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <strong className="mt-2 block text-sm">{tx.model}</strong>
                </Panel>
              </div>
              <ShapPanel positive={tx.shapPositive} negative={tx.shapNegative} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function DriftPage() {
  const { data, isLoading } = useQuery({ queryKey: ["drift"], queryFn: getDriftMetrics });
  const [phase, setPhase] = useState(1);
  if (isLoading || !data) return <LoadingState />;
  const p = data.phases[phase] ?? data.phases[1];
  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow="Forward-validation governance"
        title="Drift & Adaptive Detection"
        description="Monitor distribution shift, generate adaptation candidates, and accept changes only when forward validation supports them."
      />
      <DemoNotice />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Feature Drift", "Detected"],
          ["Fraud Rate Shift", `${p?.rate.toFixed(4)}%`],
          ["Adaptation Candidates", "3 evaluated"],
          ["Governance Decision", p?.decision],
        ].map((x) => (
          <Panel key={x[0]}>
            <p className="text-xs text-muted-foreground">{x[0]}</p>
            <strong className="mt-3 block font-mono text-base">{x[1]}</strong>
          </Panel>
        ))}
      </div>
      <Panel
        title="PaySim Fraud Rate Over Time"
        description="Training baseline and adaptive experiment phases"
      >
        <ChartContainer
          config={{ rate: { label: "Fraud rate %", color: "var(--risk-high)" } }}
          className="h-[300px] w-full"
        >
          <AreaChart data={data.phases}>
            <defs>
              <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--risk-high)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--risk-high)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="phase" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area dataKey="rate" stroke="var(--risk-high)" fill="url(#rateFill)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Feature Drift Signals" description="Select an adaptive experiment phase">
          <div className="mb-4 flex gap-2">
            {[1, 2, 3].map((i) => (
              <Button
                key={i}
                size="sm"
                variant={phase === i ? "default" : "outline"}
                onClick={() => setPhase(i)}
              >
                Phase {i}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            {p?.features.map((f, i) => (
              <div
                key={f}
                className="flex items-center justify-between rounded-md border border-border p-3 text-xs"
              >
                <span className="font-mono">{f}</span>
                <span className="text-risk-high">High drift · {i + 1}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Controlled Adaptation Governance">
          <div className="flex flex-col items-center gap-2 text-center">
            {[
              "Drift detected",
              "Candidate adaptation generated",
              "Forward validation",
              "Performance improved?",
            ].map((s, i) => (
              <div key={s} className="contents">
                <div className="w-full max-w-xs rounded-md border border-border bg-muted/20 p-3 text-xs">
                  {s}
                </div>
                {i < 3 && <ArrowDown className="size-4 text-muted-foreground" />}
              </div>
            ))}
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-md border border-risk-low/30 p-3 text-xs text-risk-low">
                <CheckCircle2 className="mx-auto mb-2 size-4" />
                YES · Accept
              </div>
              <div className="rounded-md border border-risk-critical/30 p-3 text-xs text-risk-critical">
                <XCircle className="mx-auto mb-2 size-4" />
                NO · Reject
              </div>
            </div>
            <div className="rounded-md border border-primary/25 bg-primary/5 p-3 text-xs text-primary">
              Retain current model
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Adaptive Experiment Result" description="Phase 1, Phase 2, and Phase 3">
        <div className="grid gap-3 sm:grid-cols-3">
          {data.phases.slice(1).map((ph) => (
            <div
              key={ph.phase}
              className="rounded-md border border-risk-critical/25 bg-risk-critical/5 p-4"
            >
              <p className="text-xs text-muted-foreground">{ph.phase}</p>
              <strong className="mt-2 block font-mono text-xs text-risk-critical">
                REJECT_ADAPTATION
              </strong>
              <p className="mt-3 text-xs text-muted-foreground">
                Drift was detected, but adaptation candidates performed worse than the static
                detector on forward validation.
              </p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Anomaly Detection" description="Isolation Forest · Secondary anomaly signal">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["PaySim validation AP", data.anomaly.validationAP],
            ["PaySim test AP", data.anomaly.testAP],
            ["Validation ROC-AUC", data.anomaly.validationRoc],
            ["Test ROC-AUC", data.anomaly.testRoc],
          ].map((x) => (
            <div key={String(x[0])} className="border-l border-border pl-4">
              <p className="text-[10px] text-muted-foreground">{x[0]}</p>
              <strong className="mt-2 block font-mono">{Number(x[1]).toFixed(6)}</strong>
            </div>
          ))}
        </div>
        <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
          Isolation Forest did not provide measurable incremental predictive improvement over the
          supervised detector in the evaluated fusion experiment. It is therefore treated as a
          secondary analyst/monitoring signal.
        </p>
      </Panel>
    </div>
  );
}

const pipeline = [
  "Transaction",
  "Validation",
  "Feature Engineering",
  "Behavioral Profiling",
  "Supervised Detection",
  "Anomaly Detection",
  "Risk Scoring",
  "Explainability",
  "Decisioning",
  "Feedback",
  "Monitoring",
  "Controlled Adaptation",
];
export function ResearchPage() {
  const { data, isLoading } = useQuery({ queryKey: ["research"], queryFn: getResearchMetrics });
  const [selected, setSelected] = useState("Credit Card Fraud");
  if (isLoading || !data) return <LoadingState />;
  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow="Academic evidence"
        title="Research & Evaluation"
        description="System architecture, independent dataset evaluation, frozen results, and methodological principles."
      />
      <Panel
        title="System Architecture"
        description="Adaptive and explainable fraud detection pipeline"
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          {pipeline.map((s, i) => (
            <div className="contents" key={s}>
              <button className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs transition-colors hover:border-primary/40 hover:bg-primary/5">
                {s}
              </button>
              {i < pipeline.length - 1 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>
      </Panel>
      <section className="grid gap-4 lg:grid-cols-3">
        {data.datasets.map((d) => (
          <button
            onClick={() => setSelected(d.name)}
            key={d.name}
            className={`rounded-lg border bg-card p-5 text-left shadow-panel transition-colors ${selected === d.name ? "border-primary" : "border-border hover:border-primary/40"}`}
          >
            <p className="text-sm font-semibold">{d.name}</p>
            <strong className="mt-4 block font-mono text-2xl">
              {d.transactions.toLocaleString()}
            </strong>
            <p className="mt-1 text-xs text-muted-foreground">transactions</p>
            <div className="mt-4 flex justify-between text-xs">
              <span>{d.fraud.toLocaleString()} fraud</span>
              <span className="font-mono">{d.rate}% rate</span>
            </div>
          </button>
        ))}
      </section>
      <Panel
        title={`${selected} — Frozen Test Performance`}
        description="Datasets are evaluated independently rather than concatenated."
      >
        {data.datasets
          .filter((d) => d.name === selected)
          .map((d) => (
            <div key={d.name} className="grid gap-4 sm:grid-cols-3">
              {[
                ["Average Precision", d.ap],
                ["ROC-AUC", d.roc],
                ["Brier Score", d.brier],
              ].map((x) => (
                <div key={String(x[0])} className="rounded-md border border-border p-4">
                  <p className="text-xs text-muted-foreground">{x[0]}</p>
                  <strong className="mt-3 block font-mono text-xl">
                    {Number(x[1]).toFixed(6)}
                  </strong>
                </div>
              ))}
            </div>
          ))}
      </Panel>
      <Panel title="Research Principles">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Chronological Validation",
            "Imbalance-Aware Evaluation",
            "Probability Calibration",
            "Explainable AI",
            "Drift Monitoring",
            "Controlled Adaptation",
            "Human-in-the-Loop",
          ].map((x) => (
            <div
              key={x}
              className="flex items-center gap-3 rounded-md border border-border p-4 text-xs"
            >
              <ShieldCheck className="size-4 text-primary" />
              {x}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow="Demonstration controls"
        title="Settings"
        description="Review interface preferences, risk policy, model configuration, notifications, and system status."
      />
      <DemoNotice />
      <Tabs
        defaultValue="general"
        orientation="vertical"
        className="grid gap-5 lg:grid-cols-[200px_1fr]"
      >
        <TabsList className="h-auto flex-col items-stretch justify-start bg-transparent p-0">
          {["general", "policy", "model", "notifications", "display"].map((x) => (
            <TabsTrigger key={x} value={x} className="justify-start capitalize">
              {x}
            </TabsTrigger>
          ))}
        </TabsList>
        <div>
          <TabsContent value="general">
            <SettingsPanel
              title="General"
              rows={["Synthetic demo dataset", "Compact analyst tables", "Automatic refresh"]}
            />
          </TabsContent>
          <TabsContent value="policy">
            <Panel
              title="Risk Policy"
              description="Policy configuration is currently in demonstration mode."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Review threshold", "54"],
                  ["High-risk threshold", "88"],
                  ["Critical threshold", "94"],
                ].map((x) => (
                  <div key={x[0]} className="rounded-md border border-border p-4">
                    <p className="text-xs text-muted-foreground">{x[0]}</p>
                    <strong className="mt-2 block font-mono text-2xl">{x[1]}</strong>
                  </div>
                ))}
              </div>
              <Button className="mt-5" disabled>
                Save policy to model
              </Button>
            </Panel>
          </TabsContent>
          <TabsContent value="model">
            <Panel title="Model Configuration">
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                {[
                  ["Dataset", "Credit Card Fraud"],
                  ["Detector", "LightGBM + SMOTE"],
                  ["Calibration", "Platt Scaling"],
                  ["Explainability", "SHAP TreeExplainer"],
                  ["Anomaly signal", "Isolation Forest"],
                  ["Version", "v1.0.0"],
                ].map((x) => (
                  <div className="contents" key={x[0]}>
                    <dt className="text-muted-foreground">{x[0]}</dt>
                    <dd className="text-right">{x[1]}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </TabsContent>
          <TabsContent value="notifications">
            <SettingsPanel
              title="Notifications"
              rows={[
                "Critical transaction detected",
                "New high-risk alert",
                "Model drift detected",
                "System health updates",
              ]}
            />
          </TabsContent>
          <TabsContent value="display">
            <SettingsPanel
              title="Display"
              rows={["Dense data tables", "Chart tooltips", "Reduced decorative motion"]}
            />
          </TabsContent>
        </div>
      </Tabs>
      <Panel title="System Status">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Frontend", "Operational", true],
            ["Model", "Loaded", true],
            ["Calibration", "Loaded", true],
            ["SHAP", "Available", true],
            ["Backend", "Not Connected", false],
          ].map((x) => (
            <div key={String(x[0])} className="rounded-md border border-border p-4">
              <p className="text-xs text-muted-foreground">{x[0]}</p>
              <div className="mt-2 flex items-center gap-2 text-xs font-medium">
                <span
                  className={`size-2 rounded-full ${x[2] ? "bg-risk-low" : "bg-risk-moderate"}`}
                />
                {x[1]}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
function SettingsPanel({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Panel title={title}>
      {rows.map((r, i) => (
        <div
          key={r}
          className="flex items-center justify-between border-b border-border py-4 last:border-0"
        >
          <div>
            <p className="text-sm">{r}</p>
            <p className="mt-1 text-xs text-muted-foreground">Local demonstration preference</p>
          </div>
          <Switch
            defaultChecked={i !== 2}
            onCheckedChange={() => toast.success("Preference saved locally")}
          />
        </div>
      ))}
    </Panel>
  );
}
