import type { Contribution } from "@/lib/types";
import { Panel } from "@/components/shared/page";

function Contributions({ data, positive }: { data: Contribution[]; positive: boolean }) {
  const max = Math.max(...data.map((d) => Math.abs(d.contribution)), 1);
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div
          key={item.feature}
          className="grid grid-cols-[48px_1fr_58px] items-center gap-3 text-xs"
        >
          <span className="font-mono font-semibold">{item.feature}</span>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={positive ? "h-full bg-risk-critical" : "ml-auto h-full bg-risk-low"}
              style={{ width: `${(Math.abs(item.contribution) / max) * 100}%` }}
            />
          </div>
          <span
            className={
              positive
                ? "text-right font-mono text-risk-critical"
                : "text-right font-mono text-risk-low"
            }
          >
            {item.contribution > 0 ? "+" : ""}
            {item.contribution.toFixed(2)}
          </span>
          <span />
          <span className="text-[10px] text-muted-foreground">Input value</span>
          <span className="text-right font-mono text-[10px] text-muted-foreground">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
export function ShapPanel({
  positive,
  negative,
}: {
  positive: Contribution[];
  negative: Contribution[];
}) {
  return (
    <Panel
      title="Why was this transaction flagged?"
      description="Feature contributions from the model explanation layer."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase text-risk-critical">
            Increases predicted risk
          </h3>
          <Contributions data={positive} positive />
        </div>
        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase text-risk-low">
            Decreases predicted risk
          </h3>
          <Contributions data={negative} positive={false} />
        </div>
      </div>
      <div className="mt-6 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        SHAP values describe how features influenced the model prediction. They indicate model
        contribution, not causation. V1–V28 are PCA-derived features; their real-world meaning is
        not known.
      </div>
    </Panel>
  );
}
