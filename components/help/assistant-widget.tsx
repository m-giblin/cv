"use client";

import Link from "next/link";
import { Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WorkspaceHat } from "@/lib/auth/workspace";
import { ASSISTANT_LIMITS } from "@/lib/help/assistant";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string; sources?: { id: string; title: string }[] };

const STARTERS: Record<WorkspaceHat, string[]> = {
  se: ["How do I submit evidence for a step?", "How are simulations scored?", "Help me explain identity governance to a CISO"],
  manager: ["How do I bulk approve sim cards?", "How do I enroll someone in a program?", "What does at risk mean?"],
  tenant_admin: ["How do I create a program?", "How do I invite people?", "Where do I see AI cost?"],
  platform: ["How do tenant feature flags work?", "How do I shadow a tenant?", "Where do I see AI cost?"],
};

/**
 * Floating assistant. Answers platform how-to and SailPoint questions only, grounded in the Help
 * Center the person can read; the server enforces scope, daily caps and cost limits.
 */
export function AssistantWidget({ workspace }: { workspace: WorkspaceHat }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    if (question.length > ASSISTANT_LIMITS.maxQuestionChars) {
      setError(`Keep questions under ${ASSISTANT_LIMITS.maxQuestionChars} characters.`);
      return;
    }
    setError(null);
    setDraft("");
    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setBusy(true);
    const response = await fetch("/api/ai/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portal: workspace,
        messages: next.slice(-ASSISTANT_LIMITS.historyMessages).map(({ role, content }) => ({ role, content })),
      }),
    }).catch(() => null);
    setBusy(false);
    const body = (await response?.json().catch(() => null)) as
      | { answer?: string; sources?: Message["sources"]; remaining?: number; error?: string }
      | null;
    if (!response?.ok || !body?.answer) {
      setError(
        response?.status === 403 || response?.status === 404
          ? "The assistant is turned off for your organization."
          : (body?.error ?? "The assistant couldn't answer just now."),
      );
      return;
    }
    if (typeof body.remaining === "number") setRemaining(body.remaining);
    setMessages([...next, { role: "assistant", content: body.answer, sources: body.sources }]);
  }

  return (
    <>
      {!open ? (
        <button
          aria-label="Ask the assistant"
          className="fixed right-4 bottom-5 z-[60] inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-navy)] hover:bg-[#13224a]"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Sparkles aria-hidden className="h-4 w-4 text-signal" />
          Ask
        </button>
      ) : null}

      {open ? (
        <section
          aria-label="Enablement assistant"
          className="fixed right-4 bottom-4 z-[70] flex h-[min(620px,calc(100vh-96px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-[var(--shadow-modal)]"
          role="dialog"
        >
          <header className="on-navy flex items-start justify-between gap-3 bg-navy px-5 py-4">
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2 text-[16px] font-extrabold text-white">
                <Sparkles aria-hidden className="h-4 w-4 text-signal" />
                Enablement assistant
              </span>
              <span className="text-[12px] text-on-navy-muted">Platform how-to and SailPoint topics only.</span>
            </span>
            <button
              aria-label="Close assistant"
              className="grid h-8 w-8 place-items-center rounded-full text-white hover:bg-white/10"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </header>

          <div aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-bg px-4 py-4" ref={listRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-2">
                  Ask how something in the platform works, or for help with a SailPoint or SE skill topic.
                </p>
                <div className="flex flex-col gap-2">
                  {STARTERS[workspace].map((starter) => (
                    <button
                      className="rounded-[10px] border border-line bg-white px-3 py-2 text-left text-sm text-ink hover:border-blue"
                      key={starter}
                      onClick={() => void ask(starter)}
                      type="button"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  className={cn(
                    "max-w-[88%] rounded-[12px] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    message.role === "user" ? "self-end bg-blue text-white" : "self-start border border-line bg-white text-ink",
                  )}
                  key={index}
                >
                  {message.content}
                  {message.sources?.length ? (
                    <span className="mt-2 flex flex-col gap-1 border-t border-divider pt-2">
                      <span className="text-[11px] font-bold tracking-wide text-muted uppercase">From the Help Center</span>
                      {message.sources.map((source) => (
                        <Link
                          className="link text-[13px]"
                          href={`/help?article=${source.id}`}
                          key={source.id}
                          onClick={() => setOpen(false)}
                        >
                          {source.title}
                        </Link>
                      ))}
                    </span>
                  ) : null}
                </div>
              ))
            )}
            {busy ? <p className="self-start text-sm text-muted">Thinking…</p> : null}
            {error ? (
              <p className="rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <form
            className="flex flex-col gap-1.5 border-t border-line bg-white px-3 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(draft);
            }}
          >
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor="assistant-input">
                Your question
              </label>
              <textarea
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-[10px] border border-line-strong px-3 py-2.5 text-sm text-ink focus:border-blue focus:shadow-[0_0_0_3px_var(--color-blue-soft)] focus:outline-none"
                id="assistant-input"
                maxLength={ASSISTANT_LIMITS.maxQuestionChars}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void ask(draft);
                  }
                }}
                placeholder="Ask about the platform or SailPoint"
                ref={inputRef}
                rows={1}
                value={draft}
              />
              <button aria-label="Send" className="btn-primary !px-3.5 !py-2.5" disabled={busy || !draft.trim()} type="submit">
                <Send aria-hidden className="h-4 w-4" />
              </button>
            </div>
            <span className="flex justify-between text-[11px] text-muted">
              <span>Answers can be wrong; check the Help Center for steps.</span>
              <span className="num">
                {remaining !== null ? `${remaining} left today` : `${draft.length}/${ASSISTANT_LIMITS.maxQuestionChars}`}
              </span>
            </span>
          </form>
        </section>
      ) : null}
    </>
  );
}
