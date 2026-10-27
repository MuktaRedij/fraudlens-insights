import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  Filter,
  MessageSquare,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DemoNotice, EmptyState, LoadingState, PageHeader, Panel } from "@/components/shared/page";
import { DecisionBadge, RiskBadge, RiskScore } from "@/components/risk/risk-display";
import { ShapPanel } from "@/components/explanation/shap-panel";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
import { getAlerts, getTransaction, getTransactions } from "@/services/api";
import { formatCurrency, formatPercent } from "@/lib/risk-utils";
import type { Alert, Transaction } from "@/lib/types";

function TxTable({ rows }: { rows: Transaction[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Transaction</TableHead>
          <TableHead>Date / Time</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Probability</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Band</TableHead>
          <TableHead>Decision</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.id} className="cursor-pointer">
            <TableCell>
              <Link
                to="/transactions/$id"
                params={{ id: t.id }}
                className="font-mono text-xs text-primary"
              >
                {t.id}
              </Link>
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
              {new Date(t.timestamp).toLocaleString()}
            </TableCell>
            <TableCell className="font-mono">{formatCurrency(t.amount)}</TableCell>
            <TableCell className="font-mono">{formatPercent(t.rawProbability)}</TableCell>
            <TableCell className="font-mono font-semibold">{t.riskScore}</TableCell>
            <TableCell>
              <RiskBadge band={t.riskBand} />
            </TableCell>
            <TableCell>
              <DecisionBadge decision={t.decision} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs">{t.model}</TableCell>
            <TableCell className="text-xs">{t.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
export function TransactionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["transactions"], queryFn: getTransactions });
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("All");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(0);
  const rows = useMemo(
    () =>
      data?.filter(
        (t) =>
          t.id.toLowerCase().includes(search.toLowerCase()) &&
          (risk === "All" || t.riskBand === risk) &&
          (status === "All" || t.status === status),
      ) ?? [],
    [data, search, risk, status],
  );
  const visible = rows.slice(page * 10, page * 10 + 10);
  const exportCsv = () => {
    const csv = [
      "id,timestamp,amount,probability,riskScore,riskBand,decision,model,status",
      ...rows.map((t) =>
        [
          t.id,
          t.timestamp,
          t.amount,
          t.rawProbability,
          t.riskScore,
          t.riskBand,
          t.decision,
          t.model,
          t.status,
        ].join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "fraudlens-demo-transactions.csv";
    a.click();
    toast.success("Demo CSV exported");
  };
  if (isLoading) return <LoadingState />;
  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow="Investigation records"
        title="Transactions"
        description="Search, filter, and investigate synthetic transaction assessments."
        actions={
          <Button onClick={exportCsv} variant="outline">
            <Download />
            Export CSV
          </Button>
        }
      />
      <DemoNotice />
      <Panel>
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              aria-label="Search transactions"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search transaction ID"
              className="pl-9"
            />
          </div>
          <Select
            value={risk}
            onValueChange={(v) => {
              setRisk(v);
              setPage(0);
            }}
          >
            <SelectTrigger>
              <Filter />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["All", "Low", "Moderate", "Medium", "High", "Critical"].map((v) => (
                <SelectItem key={v} value={v}>
                  {v} risk
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["All", "Open", "Investigating", "Resolved", "False Positive"].map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4">
          <TxTable rows={visible} />
          {!visible.length && <EmptyState title="No transactions match the current filters." />}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {rows.length ? page * 10 + 1 : 0}–{Math.min((page + 1) * 10, rows.length)} of{" "}
            {rows.length} filtered · 284,807 total demo records
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={(page + 1) * 10 >= rows.length}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

export function TransactionDetailsPage({ id }: { id: string }) {
  const { data: t, isLoading } = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => getTransaction(id),
  });
  if (isLoading) return <LoadingState />;
  if (!t) return <EmptyState title="Transaction not found" />;
  const history: [string, string][] = [
    ["Assessment generated", t.timestamp],
    ["Alert entered analyst queue", t.timestamp],
    ["Status set to " + t.status, new Date().toISOString()],
  ];
  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow="Transaction investigation"
        title={`Transaction ${t.id}`}
        description="Complete model assessment, behavioral context, and analyst workflow."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(t.id);
                toast.success("Transaction ID copied");
              }}
            >
              <Clipboard />
              Copy ID
            </Button>
            <FeedbackDialog
              transactionId={t.id}
              trigger={
                <Button>
                  <MessageSquare />
                  Add feedback
                </Button>
              }
            />
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Panel className="sm:col-span-2">
          <div className="flex items-center gap-5">
            <RiskScore score={t.riskScore} band={t.riskBand} size="sm" />
            <div>
              <RiskBadge band={t.riskBand} />
              <p className="mt-2 text-xs text-muted-foreground">Risk score</p>
            </div>
          </div>
        </Panel>
        {[
          ["Fraud Probability", formatPercent(t.rawProbability)],
          ["Decision", t.decision],
          ["Amount", formatCurrency(t.amount)],
          ["Model", t.model],
        ].map((x) => (
          <Panel key={x[0]}>
            <p className="text-[10px] uppercase text-muted-foreground">{x[0]}</p>
            <strong className="mt-3 block font-mono text-base">{x[1]}</strong>
          </Panel>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Transaction Details">
          <dl className="grid grid-cols-2 gap-y-3 text-xs">
            {[
              ["Timestamp", new Date(t.timestamp).toLocaleString()],
              ["Type", t.type],
              ["Category", t.category],
              ["Label", `${t.label} · Demo`],
              ["Status", t.status],
              ["Calibration", "Platt Scaling"],
            ].map((x) => (
              <div key={x[0]} className="contents">
                <dt className="text-muted-foreground">{x[0]}</dt>
                <dd className="text-right font-medium">{x[1]}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Anomaly & Behavioral Context">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs">
                <span>Isolation Forest signal</span>
                <span className="font-mono">{t.anomalyScore}</span>
              </div>
              <div className="mt-2 h-1.5 rounded bg-muted">
                <div
                  className="h-full rounded bg-risk-medium"
                  style={{ width: `${t.anomalyScore * 100}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Potentially anomalous behavior detected. This is a secondary monitoring signal, not an
              independent fraud verdict.
            </p>
          </div>
        </Panel>
      </div>
      <ShapPanel positive={t.shapPositive} negative={t.shapNegative} />
      <Panel title="Investigation History">
        <div className="space-y-4 border-l border-border pl-5">
          {history.map((x) => (
            <div key={x[0]}>
              <p className="text-xs font-medium">{x[0]}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(x[1]).toLocaleString()} · Demo workflow
              </p>
            </div>
          ))}
        </div>
      </Panel>
      <div className="flex flex-wrap gap-2">
        <FeedbackDialog
          transactionId={t.id}
          trigger={<Button variant="destructive">Mark as Fraud</Button>}
        />
        <FeedbackDialog
          transactionId={t.id}
          trigger={<Button variant="outline">Mark as Legitimate</Button>}
        />
        <FeedbackDialog
          transactionId={t.id}
          trigger={<Button variant="secondary">Escalate</Button>}
        />
      </div>
    </div>
  );
}

export function AlertsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ["alerts"], queryFn: getAlerts });
  const [selected, setSelected] = useState<Alert>();
  const [local, setLocal] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  if (isLoading) return <LoadingState />;
  const counts = [
    {
      label: "Open Alerts",
      value: data.filter((a) => (local[a.id] ?? a.status) === "Open").length,
    },
    { label: "Critical", value: data.filter((a) => a.riskBand === "Critical").length },
    { label: "High Risk", value: data.filter((a) => a.riskBand === "High").length },
    {
      label: "Under Investigation",
      value: data.filter((a) => (local[a.id] ?? a.status) === "Investigating").length,
    },
    {
      label: "Resolved",
      value: data.filter((a) => (local[a.id] ?? a.status) === "Resolved").length,
    },
  ];
  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow="Analyst workflow"
        title="Fraud Alerts"
        description="Prioritize, assign, investigate, and resolve demonstration alerts."
      />
      <DemoNotice />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {counts.map((c) => (
          <Panel key={c.label}>
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <strong className="mt-3 block font-mono text-2xl">{c.value}</strong>
          </Panel>
        ))}
      </div>
      <Panel title="Alert Queue" description="Select an alert to open its investigation drawer">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alert</TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((a) => (
              <TableRow key={a.id} onClick={() => setSelected(a)} className="cursor-pointer">
                <TableCell className="font-mono text-xs text-primary">{a.id}</TableCell>
                <TableCell className="font-mono text-xs">{a.transactionId}</TableCell>
                <TableCell className="font-mono">{a.riskScore}</TableCell>
                <TableCell>
                  <RiskBadge band={a.riskBand} />
                </TableCell>
                <TableCell className="max-w-64 text-xs text-muted-foreground">{a.reason}</TableCell>
                <TableCell className="text-xs">{a.assignedTo}</TableCell>
                <TableCell className="text-xs">{local[a.id] ?? a.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(undefined)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selected?.id}</SheetTitle>
            <SheetDescription>Demo alert investigation and assignment</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-7 space-y-5">
              <div className="flex items-center justify-between rounded-md border border-border p-4">
                <div>
                  <RiskBadge band={selected.riskBand} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Transaction {selected.transactionId}
                  </p>
                </div>
                <strong className="font-mono text-3xl">{selected.riskScore}</strong>
              </div>
              <Panel title="Alert reason">
                <p className="text-sm">{selected.reason}</p>
              </Panel>
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Assign analyst</p>
                <Select defaultValue={selected.assignedTo}>
                  <SelectTrigger>
                    <UserRound />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Unassigned", "Maya Chen", "Daniel Ortiz", "A. Chen"].map((v) => (
                      <SelectItem value={v} key={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Update status</p>
                <Select
                  value={local[selected.id] ?? selected.status}
                  onValueChange={(v) => {
                    setLocal({ ...local, [selected.id]: v });
                    toast.success("Alert status updated");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Open", "Investigating", "Escalated", "Resolved", "False Positive"].map(
                      (v) => (
                        <SelectItem value={v} key={v}>
                          {v}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  navigate({ to: "/transactions/$id", params: { id: selected.transactionId } })
                }
              >
                Open full transaction
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => toast.success("Alert note added")}
              >
                <MessageSquare />
                Add analyst note
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
