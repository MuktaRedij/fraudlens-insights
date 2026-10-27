import { Gauge, Info } from "lucide-react";
import type { Decision, RiskBand } from "@/lib/types";
import { cn } from "@/lib/utils";
import { riskClass } from "@/lib/risk-utils";

export function RiskBadge({ band }: { band: RiskBand }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase",
        riskClass[band],
      )}
    >
      {band}
    </span>
  );
}
export function DecisionBadge({ decision }: { decision: Decision }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold text-secondary-foreground">
      {decision}
    </span>
  );
}
export function RiskScore({
  score,
  band,
  size = "lg",
}: {
  score: number;
  band: RiskBand;
  size?: "sm" | "lg";
}) {
  const color = {
    Low: "var(--risk-low)",
    Moderate: "var(--risk-moderate)",
    Medium: "var(--risk-medium)",
    High: "var(--risk-high)",
    Critical: "var(--risk-critical)",
  }[band];
  return (
    <div
      className={cn("relative grid place-items-center", size === "lg" ? "size-44" : "size-20")}
      role="img"
      aria-label={`Risk score ${score} out of 100, ${band}`}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(${color} ${score * 3.6}deg, var(--muted) 0deg)` }}
      />
      <div
        className={cn(
          "absolute grid place-items-center rounded-full bg-card",
          size === "lg" ? "inset-3" : "inset-2",
        )}
      >
        <div className="text-center">
          <Gauge
            className={cn(
              "mx-auto text-muted-foreground",
              size === "lg" ? "mb-1 size-5" : "size-3",
            )}
          />
          <strong className={cn("font-mono", size === "lg" ? "text-4xl" : "text-lg")}>
            {score}
          </strong>
          {size === "lg" && (
            <span className="block text-[10px] text-muted-foreground">OUT OF 100</span>
          )}
        </div>
      </div>
    </div>
  );
}
export function PolicyInfo() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
      The risk score is derived from calibrated fraud probability. Decision thresholds are policy
      thresholds selected using validation data.
    </div>
  );
}
