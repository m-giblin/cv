"use client";

import { CalendarClock, ExternalLink, Loader2, RotateCcw, Save } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { SimulationSpeechInput } from "@/components/simulation/speech-input";
import { FIELD_CLS, LABEL_CLS, LINE_CARD_CLS, TEXTAREA_CLS } from "@/components/se/form-classes";
import { Chip } from "@/components/ui/chip";
import { Tag } from "@/components/ui/tag";
import { ISC_LAB_STARTER_PROMPTS } from "@/lib/isc-lab/knowledge-base";
import type { IscLabMode } from "@/lib/isc-lab/session-log";
import { cn } from "@/lib/utils";

type Source = {
 url: string;
 title: string;
 source: "documentation" | "developer" | "marketing" | "platform" | "battlecard";
 fetchedAt?: string;
 contentVersion?: string;
 kind?: string;
};

type PlatformHints = {
 coachingGaps: string[];
 practiceChallenges: Array<{ title: string; href: string }>;
};

type Nudges = {
 cert: { label: string; reason: string; href: string } | null;
 challenge: { title: string; reason: string; href: string } | null;
};

type ChatTurn = {
 role: "user" | "assistant";
 content: string;
 sources?: Source[];
 model?: string | null;
 provider?: string | null;
 platform?: PlatformHints;
 nudges?: Nudges;
};

type LabMode = Exclude<IscLabMode, "pre_call_brief">;

const MODES: Array<{ id: LabMode; label: string; hint: string }> = [
 { id: "chat", label: "Ask ISC", hint: "General ISC, AIS, and Agentic Fabric coaching" },
 {
 id: "account_prep",
 label: "Account prep",
 hint: "Deal prep + Gong context for a named account",
 },
 { id: "battlecard", label: "Battlecard", hint: "Competitive positioning vs Entra, Okta, DIY" },
 { id: "voice_objection", label: "Voice objection", hint: "Speak an objection — get coached phrasing" },
];

const BATTLECARD_PROMPTS = [
 "How do we beat Microsoft Entra on agent governance?",
 "Okta claims they govern agents — what's our trap question?",
 "Customer wants Copilot policies only — landmine response?",
];

const SOURCE_LABELS: Record<string, string> = {
 documentation: "Docs",
 developer: "Developer",
 marketing: "Website",
 platform: "Platform",
 battlecard: "Battlecard",
};

function formatFetchedAt(value?: string) {
 if (!value) return null;
 try {
 return new Date(value).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
 } catch {
 return value;
 }
}

export function IscLabChat() {
 const [mode, setMode] = useState<LabMode>("chat");
 const [accountName, setAccountName] = useState("");
 const [message, setMessage] = useState("");
 const [history, setHistory] = useState<ChatTurn[]>([]);
 const [loading, setLoading] = useState(false);
 const [loadingLabel, setLoadingLabel] = useState("Thinking…");
 const [savingPrep, setSavingPrep] = useState(false);
 const [briefLoading, setBriefLoading] = useState(false);
 const uid = useId();
 const accountInputId = `${uid}-account`;
 const composerId = `${uid}-composer`;
 const modeHintId = `${uid}-mode-hint`;
 const [pendingBriefs, setPendingBriefs] = useState<
 Array<{ accountName: string; sessionId: string; meetingDate: string | null }>
 >([]);

 useEffect(() => {
 void fetch("/api/isc-lab/pre-call-brief")
 .then((response) => (response.ok ? response.json() : { pendingAccounts: [] }))
 .then((body: { pendingAccounts?: typeof pendingBriefs }) => {
 setPendingBriefs(body.pendingAccounts ?? []);
 })
 .catch(() => undefined);
 }, []);

 async function send(userMessage: string, sendMode: LabMode = mode) {
 if (!userMessage.trim()) return;
 if (sendMode === "account_prep" && !accountName.trim()) {
 toast.error("Enter an account name for account prep mode.");
 return;
 }

 setLoading(true);
 setLoadingLabel("Searching docs and battlecards…");
 const nextHistory: ChatTurn[] = [...history, { role: "user", content: userMessage.trim() }];
 setHistory(nextHistory);
 setMessage("");

 try {
 const response = await fetch("/api/ai/isc-lab", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 "X-Requested-With": "XMLHttpRequest",
 },
 body: JSON.stringify({
 message: userMessage.trim(),
 mode: sendMode,
 accountName: accountName.trim() || undefined,
 history: nextHistory.slice(0, -1),
 }),
 });

 if (!response.ok) {
 toast.error("Lab assistant unavailable.");
 return;
 }

 setLoadingLabel("Drafting answer…");

 const body = (await response.json()) as {
 reply: string;
 sources?: Source[];
 model?: string | null;
 provider?: string | null;
 platform?: PlatformHints;
 nudges?: Nudges;
 };

 setHistory((current) => [
 ...current,
 {
 role: "assistant",
 content: body.reply,
 sources: body.sources,
 model: body.model,
 provider: body.provider,
 platform: body.platform,
 nudges: body.nudges,
 },
 ]);
 } finally {
 setLoading(false);
 setLoadingLabel("Thinking…");
 }
 }

 async function saveToDealPrep(reply: string) {
 if (!accountName.trim()) {
 toast.error("Enter an account name to save to Deal Prep.");
 return;
 }
 setSavingPrep(true);
 try {
 const response = await fetch("/api/isc-lab/save-to-prep", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ accountName: accountName.trim(), reply }),
 });
 if (!response.ok) {
 toast.error("Could not save to Deal Prep.");
 return;
 }
 const body = (await response.json()) as { href: string };
 toast.success("Saved to Deal Prep", {
 action: { label: "Open", onClick: () => window.location.assign(body.href) },
 });
 } finally {
 setSavingPrep(false);
 }
 }

 async function generatePreCallBrief(targetAccount?: string, sessionId?: string) {
 const name = (targetAccount ?? accountName).trim();
 if (!name) {
 toast.error("Enter an account name for the pre-call brief.");
 return;
 }
 setBriefLoading(true);
 try {
 const response = await fetch("/api/isc-lab/pre-call-brief", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ accountName: name, sessionId }),
 });
 if (!response.ok) {
 toast.error("Could not generate pre-call brief.");
 return;
 }
 const body = (await response.json()) as {
 briefMarkdown: string;
 sources?: Source[];
 model?: string | null;
 provider?: string | null;
 };
 setHistory((current) => [
 ...current,
 { role: "user", content: `Pre-call brief for ${name}` },
 {
 role: "assistant",
 content: body.briefMarkdown,
 sources: body.sources,
 model: body.model,
 provider: body.provider,
 },
 ]);
 setPendingBriefs((current) => current.filter((row) => row.accountName.toLowerCase() !== name.toLowerCase()));
 toast.success(`Pre-call brief ready for ${name}`);
 } finally {
 setBriefLoading(false);
 }
 }

 function clearChat() {
 setHistory([]);
 setMessage("");
 }

 const starterPrompts = mode === "battlecard" ? BATTLECARD_PROMPTS : ISC_LAB_STARTER_PROMPTS;

  const activeMode = MODES.find((item) => item.id === mode);

  return (
    <div className="flex flex-col gap-4">
      {pendingBriefs.length > 0 ? (
        <section
          aria-label="Meetings without a pre-call brief"
          className="flex flex-wrap items-center gap-3 rounded-[14px] bg-blue px-5 py-3.5 text-white"
        >
          <CalendarClock aria-hidden className="h-4 w-4 shrink-0 text-signal" />
          <span className="flex-1 text-[15px] font-semibold">Tomorrow&apos;s meetings without a pre-call brief</span>
          <div className="flex flex-wrap gap-2">
            {pendingBriefs.map((row) => (
              <button
                className="rounded-full border-[1.5px] border-white bg-white px-3 py-1 text-sm font-bold text-ink hover:bg-blue-soft disabled:opacity-60"
                disabled={briefLoading}
                key={row.sessionId}
                onClick={() => {
                  setAccountName(row.accountName);
                  setMode("account_prep");
                  void generatePreCallBrief(row.accountName, row.sessionId);
                }}
                type="button"
              >
                {row.accountName} →
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-2">
        <div aria-label="Lab mode" className="flex flex-wrap gap-2" role="group">
          {MODES.map((item) => (
            <Chip
              active={mode === item.id}
              aria-describedby={mode === item.id ? modeHintId : undefined}
              key={item.id}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </Chip>
          ))}
        </div>
        <p className="text-sm text-muted" id={modeHintId}>
          {activeMode?.hint}
        </p>
      </div>

      {mode === "account_prep" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[220px] max-w-sm flex-1 flex-col gap-1.5">
            <label className={LABEL_CLS} htmlFor={accountInputId}>
              Account name
            </label>
            <input
              className={FIELD_CLS}
              id={accountInputId}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="e.g. Acme Corp"
              value={accountName}
            />
          </div>
          <button
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60"
            disabled={briefLoading || !accountName.trim()}
            onClick={() => void generatePreCallBrief()}
            type="button"
          >
            {briefLoading ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarClock aria-hidden className="h-4 w-4" />
            )}
            Pre-call brief
          </button>
        </div>
      ) : null}

      <section aria-label="ISC Lab conversation" className={cn(LINE_CARD_CLS, "overflow-hidden")}>
        <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-3">
          <span className="label-mono">Transcript{history.length > 0 ? ` · ${history.length}` : ""}</span>
          {history.length > 0 ? (
            <button
              className="link inline-flex items-center gap-1.5 text-sm disabled:opacity-60"
              disabled={loading}
              onClick={clearChat}
              type="button"
            >
              <RotateCcw aria-hidden className="h-4 w-4" />
              Clear chat
            </button>
          ) : null}
        </div>

        <div aria-live="polite" className="flex h-[420px] flex-col gap-4 overflow-y-auto px-5 py-4" role="log">
          {history.length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-[15px] leading-[1.5] text-ink-2">
                ISC Lab searches product documentation, developer docs, curated battlecards, peer golden pitches and
                your enablement profile. Every answer cites what was consulted.
              </p>
              <span className="label-mono">Try one</span>
              <ul className="flex flex-col gap-2">
                {starterPrompts.map((prompt) => (
                  <li key={prompt}>
                    <button
                      className="w-full rounded-[10px] border border-line px-3.5 py-2.5 text-left text-[15px] text-ink hover:border-blue hover:bg-blue-soft disabled:opacity-60"
                      disabled={loading}
                      onClick={() => void send(prompt)}
                      type="button"
                    >
                      → {prompt}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            history.map((turn, index) => (
              <div
                className={turn.role === "user" ? "flex flex-col items-end gap-1" : "flex flex-col items-start gap-1"}
                key={`${turn.role}-${index}`}
              >
                <span className="label-mono">{turn.role === "user" ? "You" : "ISC Lab"}</span>
                <div
                  className={cn(
                    "max-w-[88%] rounded-[14px] px-4 py-3 text-[15px] leading-[1.5] text-ink",
                    turn.role === "user" ? "bg-blue-soft" : "border border-line bg-white",
                  )}
                >
                  <p className="whitespace-pre-wrap">{turn.content}</p>
                  {turn.role === "assistant" && turn.sources && turn.sources.length > 0 ? (
                    <div className="mt-3 border-t border-divider pt-3">
                      <p className="label-mono mb-2">Sources consulted</p>
                      <ul className="flex flex-wrap gap-2">
                        {turn.sources.map((source) => {
                          const label =
                            SOURCE_LABELS[source.kind === "battlecard" ? "battlecard" : source.source] ??
                            source.source;
                          const fetched = formatFetchedAt(source.fetchedAt);
                          const external = source.url.startsWith("http");
                          const meta = fetched
                            ? `Fetched ${fetched}`
                            : source.contentVersion
                              ? `v${source.contentVersion}`
                              : "";
                          return (
                            <li key={`${source.url}-${source.title}`}>
                              <a
                                className="inline-flex max-w-full items-center gap-1.5 rounded-full border-[1.5px] border-blue px-[9px] py-0.5 font-mono text-xs text-blue hover:bg-blue-soft"
                                href={source.url}
                                rel={external ? "noreferrer" : undefined}
                                target={external ? "_blank" : undefined}
                                title={meta || undefined}
                              >
                                <span className="truncate">
                                  {label} · {source.title}
                                </span>
                                {external ? (
                                  <>
                                    <ExternalLink aria-hidden className="h-3 w-3 shrink-0" />
                                    <span className="sr-only">(opens in a new tab)</span>
                                  </>
                                ) : null}
                              </a>
                              {meta ? <span className="sr-only"> {meta}</span> : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                  {turn.role === "assistant" && turn.nudges?.challenge ? (
                    <p className="mt-3 text-sm text-ink-2">
                      Practice:{" "}
                      <a className="link" href={turn.nudges.challenge.href}>
                        {turn.nudges.challenge.title}
                      </a>
                    </p>
                  ) : null}
                  {turn.role === "assistant" && turn.nudges?.cert ? (
                    <p className="mt-1 text-sm text-ink-2">
                      Cert path:{" "}
                      <a className="link" href={turn.nudges.cert.href}>
                        {turn.nudges.cert.label}
                      </a>
                    </p>
                  ) : null}
                  {turn.role === "assistant" && turn.platform?.practiceChallenges.length ? (
                    <div className="mt-2 text-sm text-ink-2">
                      Related challenges:{" "}
                      {turn.platform.practiceChallenges.map((challenge, challengeIndex) => (
                        <span key={challenge.href}>
                          {challengeIndex > 0 ? " · " : ""}
                          <a className="link" href={challenge.href}>
                            {challenge.title}
                          </a>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {turn.role === "assistant" && turn.model ? (
                    <div className="mt-3">
                      <Tag>Model · {turn.model}</Tag>
                    </div>
                  ) : null}
                  {turn.role === "assistant" &&
                  index === history.length - 1 &&
                  mode === "account_prep" &&
                  accountName.trim() ? (
                    <div className="mt-3 border-t border-divider pt-3">
                      <button
                        className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60"
                        disabled={savingPrep}
                        onClick={() => void saveToDealPrep(turn.content)}
                        type="button"
                      >
                        {savingPrep ? (
                          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save aria-hidden className="h-4 w-4" />
                        )}
                        Save to Deal Prep
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted" role="status">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              {loadingLabel}
            </p>
          ) : null}
        </div>

        <form
          className="flex flex-col gap-2 border-t border-divider px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send(message);
          }}
        >
          <label className="sr-only" htmlFor={composerId}>
            Message ISC Lab
          </label>
          <textarea
            className={cn(TEXTAREA_CLS, "min-h-[72px]")}
            id={composerId}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (!loading) void send(message);
              }
            }}
            placeholder={
              mode === "voice_objection"
                ? "Speak or type a buyer objection…"
                : mode === "battlecard"
                  ? "Competitor or objection to battle…"
                  : "Ask ISC Lab…"
            }
            rows={2}
            value={message}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {mode === "voice_objection" ? (
                <SimulationSpeechInput
                  disabled={loading}
                  onTranscript={(text) => setMessage((current) => (current ? `${current} ${text}` : text))}
                />
              ) : null}
              <span className="text-[13px] text-muted">Enter to send · Shift+Enter for a new line</span>
            </div>
            <button className="btn-primary" disabled={loading || !message.trim()} type="submit">
              Ask
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
