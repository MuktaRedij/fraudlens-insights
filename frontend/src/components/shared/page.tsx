import type { ReactNode } from "react";
import { AlertCircle, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="mb-2 font-mono text-[11px] uppercase text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("min-w-0 rounded-lg border border-border bg-card shadow-panel", className)}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-card-foreground">{title}</h2>}
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border border-demo/25 bg-demo/8 text-demo",
        compact ? "rounded-md px-2.5 py-1 text-[11px]" : "rounded-lg px-4 py-3 text-xs",
      )}
    >
      <Database className="size-3.5 shrink-0" />
      <span>
        <strong>Demo Mode</strong>
        {!compact &&
          " — This interface uses synthetic demonstration data and a mock inference service."}
      </span>
    </div>
  );
}
export function LoadingState({ label = "Loading analysis data..." }: { label?: string }) {
  return (
    <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground">
      <RefreshCw className="size-4 animate-spin text-primary" />
      {label}
    </div>
  );
}
export function EmptyState({
  title = "No data found",
  description = "No records match the current filters.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center text-center">
      <AlertCircle className="mb-3 size-7 text-muted-foreground" />
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
export function ErrorState({ retry }: { retry?: () => void }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center text-center">
      <AlertCircle className="mb-3 size-7 text-destructive" />
      <h3 className="text-sm font-medium">Unable to load analysis data.</h3>
      {retry && (
        <Button onClick={retry} variant="outline" size="sm" className="mt-4">
          Try again
        </Button>
      )}
    </div>
  );
}
