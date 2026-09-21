import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bot, Eraser, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getTransaction } from "@/services/api";
import type { Transaction } from "@/lib/types";
import {
  ASSISTANT_MODE,
  ASSISTANT_MODE_DETAIL,
  sendChatMessage,
  suggestedQuestions,
  type AssistantContext,
  type ChatMessage,
} from "@/services/chat-service";
import { alerts } from "@/data/mock-data";

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Fraud Intelligence Dashboard",
  "/analyze": "Analyze Transaction",
  "/transactions": "Transactions",
  "/alerts": "Fraud Alerts",
  "/models": "Model Intelligence",
  "/explainability": "Explainability",
  "/drift": "Drift & Adaptation",
  "/research": "Research & Evaluation",
  "/settings": "Settings",
};

const uid = () => `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function greeting(context: AssistantContext): ChatMessage {
  return {
    id: "assistant-greeting",
    role: "assistant",
    createdAt: new Date().toISOString(),
    content: [
      `FraudLens assistant ready — ${ASSISTANT_MODE}.`,
      `${ASSISTANT_MODE_DETAIL}`,
      "",
      `Context: **${context.pageLabel}**${context.transactionId ? ` · ${context.transactionId}` : ""}. Ask about risk scores, SHAP contributions, model evidence, drift governance or the documented dataset experiments.`,
    ].join("\n"),
  };
}

/** Very small inline formatter: **bold** segments only, no HTML injection. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i} className="block">
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
              : <span key={j}>{part}</span>,
          )}
        </span>
      ))}
    </>
  );
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const pathname = useRouterState({ select: s => s.location.pathname });

  const transactionId = useMemo(() => {
    const m = pathname.match(/^\/transactions\/([^/]+)$/);
    return m?.[1];
  }, [pathname]);

  useEffect(() => {
    let active = true;
    if (!transactionId) { setTransaction(undefined); return; }
    getTransaction(transactionId).then(tx => { if (active) setTransaction(tx); }).catch(() => { if (active) setTransaction(undefined); });
    return () => { active = false; };
  }, [transactionId]);

  const context: AssistantContext = useMemo(() => {
    const base = `/${pathname.split("/")[1] ?? ""}`;
    return {
      route: pathname,
      pageLabel: PAGE_LABELS[pathname] ?? PAGE_LABELS[base] ?? "FraudLens",
      ...(transactionId ? { transactionId } : {}),
      ...(transaction ? { transaction } : {}),
      ...(pathname === "/alerts" ? { visibleAlertIds: alerts.slice(0, 18).map(a => a.id) } : {}),
    };
  }, [pathname, transactionId, transaction]);

  const prompts = useMemo(() => suggestedQuestions(context), [context]);

  useEffect(() => {
    if (open && messages.length === 0) setMessages([greeting(context)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  async function submit(raw: string) {
    const text = raw.trim();
    if (!text || pending) return;
    const userMessage: ChatMessage = { id: uid(), role: "user", content: text, createdAt: new Date().toISOString() };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setPending(true);
    try {
      const response = await sendChatMessage({ message: text, conversationHistory: messages, context });
      setMessages(prev => [...prev, {
        id: uid(),
        role: "assistant",
        content: response.message,
        createdAt: new Date().toISOString(),
        ...(response.actions?.length ? { actions: response.actions } : {}),
        ...(response.relatedTransactionIds?.length ? { relatedTransactionIds: response.relatedTransactionIds } : {}),
      }]);
      if (response.suggestedActions?.length) setFollowUps(response.suggestedActions);
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: "assistant", content: "I couldn't process that request. Please try again.", createdAt: new Date().toISOString() }]);
    } finally {
      setPending(false);
    }
  }

  const [followUps, setFollowUps] = useState<string[]>([]);
  const chips = followUps.length ? followUps : prompts;

  function clearConversation() {
    setMessages([greeting(context)]);
    setFollowUps([]);
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open FraudLens AI Assistant"
            className="fixed bottom-20 right-4 z-40 flex size-12 items-center justify-center rounded-full border border-primary/40 bg-card text-primary shadow-panel transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:bottom-6 lg:right-6"
          >
            <MessageSquare className="size-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">FraudLens AI Assistant · {ASSISTANT_MODE}</TooltipContent>
      </Tooltip>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full max-w-full flex-col gap-0 overflow-hidden border-border bg-background p-0 sm:max-w-md [&>button]:hidden"
          aria-label="FraudLens AI Assistant"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bot className="size-4 shrink-0 text-primary" />
                <h2 className="truncate text-sm font-semibold text-foreground">FraudLens AI Assistant</h2>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-demo">
                <span className="inline-block size-1.5 rounded-full bg-demo" aria-hidden="true" />
                {ASSISTANT_MODE} · Backend AI not connected
              </p>
              <p className="mt-1 truncate font-mono text-[11px] uppercase text-muted-foreground">{context.pageLabel}{context.transactionId ? ` · ${context.transactionId}` : ""}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" onClick={clearConversation} aria-label="Clear conversation"><Eraser className="size-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close assistant"><X className="size-4" /></Button>
            </div>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
            {messages.map(message => (
              <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[88%] min-w-0 break-words rounded-lg border px-3 py-2 text-xs leading-relaxed",
                  message.role === "user" ? "border-primary/30 bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground",
                )}>
                  <RichText text={message.content} />
                  {message.actions?.length ? (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {message.actions.map(action => (
                        <Button
                          key={action.label + action.to}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[11px]"
                          onClick={() => { setOpen(false); void navigate({ to: action.to }); }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 animate-pulse text-primary" />
                Composing analyst response...
              </div>
            )}
          </div>

          <div className="border-t border-border px-4 py-3">
            {chips.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {chips.slice(0, 4).map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void submit(prompt)}
                    disabled={pending}
                    className="rounded-md border border-border bg-card px-2 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <form
              className="flex items-end gap-2"
              onSubmit={event => { event.preventDefault(); void submit(input); }}
            >
              <Textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(input); }
                }}
                rows={2}
                placeholder="Ask about this transaction, model evidence or drift..."
                aria-label="Message the FraudLens assistant"
                className="min-h-[44px] resize-none text-xs"
              />
              <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send message"><Send className="size-4" /></Button>
            </form>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              Responses are composed from data already shown in this demonstration. No live model or backend inference is performed.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
