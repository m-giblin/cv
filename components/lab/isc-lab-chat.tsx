"use client";

import { CalendarClock, ExternalLink, Loader2, RotateCcw, Save, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SimulationSpeechInput } from "@/components/simulation/speech-input";
import { SP_BLUE_BTN, SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { Input } from "@/components/ui/input";
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

const MODES: Array<{ id: LabMode; label: string; emoji: string; hint: string }> = [
 { id: "chat", label: "Ask ISC", emoji: "💡", hint: "General ISC, AIS, and Agentic Fabric coaching" },
 {
 id: "account_prep",
 label: "Account prep",
 emoji: "📋",
 hint: "Deal prep + Gong context for a named account",
 },
 { id: "battlecard", label: "Battlecard", emoji: "🛡️", hint: "Competitive positioning vs Entra, Okta, DIY" },
 { id: "voice_objection", label: "Voice objection", emoji: "🎤", hint: "Speak an objection — get coached phrasing" },
];

const BATTLECARD_PROMPTS = [
 "How do we beat Microsoft Entra on agent governance?",
 "Okta claims they govern agents — what's our trap question?",
 "Customer wants Copilot policies only — landmine response?",
];

const SOURCE_LABELS: Record<string, string> = {
 documentation: "Docs",
 developer: "Developer",
 marketing: "SailPoint.com",
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
 setLoadingLabel("Searching SailPoint docs & battlecards…");
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

 setLoadingLabel("Drafting with Grok…");

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

 return (
 <div className="animate-[fadeUp_0.2s_ease-out] space-y-3.5">
 {pendingBriefs.length > 0 ? (
 <div className="flex flex-wrap items-center gap-2.5 border border-[rgba(0,113,206,0.15)] bg-[#f0f7ff] px-3.5 py-2.5">
 <CalendarClock className="h-3.5 w-3.5 shrink-0 text-[#0071ce]" />
 <span className="flex-1 text-[11.5px] text-[#374151]">
 Tomorrow&apos;s meetings without a pre-call brief:
 </span>
 <div className="flex flex-wrap gap-1.5">
 {pendingBriefs.map((row) => (
 <button
 className="rounded-full border border-[rgba(0,113,206,0.25)] bg-[#e8f2fc] px-2.5 py-1 text-[11px] font-semibold text-[#0057a8] hover:bg-[#dbeafe]"
 key={row.sessionId}
 onClick={() => {
 setAccountName(row.accountName);
 setMode("account_prep");
 void generatePreCallBrief(row.accountName, row.sessionId);
 }}
 type="button"
 >
 {row.accountName}
 </button>
 ))}
 </div>
 </div>
 ) : null}

 <div className="flex flex-wrap gap-2">
 {MODES.map((item) => {
 const active = mode === item.id;
 return (
 <button
 className={cn(
 "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
 active
 ? "border-[1.5px] border-[#0071ce] bg-[#e8f2fc] text-[#0057a8]"
 : "border border-[#E2DFD9] bg-white text-[#3D3C38] hover:bg-slate-50",
 )}
 key={item.id}
 onClick={() => setMode(item.id)}
 title={item.hint}
 type="button"
 >
 <span>{item.emoji}</span>
 {item.label}
 </button>
 );
 })}
 </div>

 {mode === "account_prep" ? (
 <div className="flex flex-wrap items-end gap-2">
 <div className="min-w-[200px] flex-1 max-w-xs">
 <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#6B6860]">
 Account name
 </label>
 <Input
 onChange={(event) => setAccountName(event.target.value)}
 placeholder="e.g. Acme Corp"
 value={accountName}
 />
 </div>
 <button
 className={SP_OUTLINE_BTN}
 disabled={briefLoading || !accountName.trim()}
 onClick={() => void generatePreCallBrief()}
 type="button"
 >
 {briefLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
 Pre-call brief
 </button>
 {history.length > 0 ? (
 <button className={SP_OUTLINE_BTN} disabled={loading} onClick={clearChat} type="button">
 <RotateCcw className="h-3.5 w-3.5" />
 Clear chat
 </button>
 ) : null}
 </div>
 ) : null}

 <div className="overflow-hidden border-[1.5px] border-[#E2DFD9] bg-white ">
 <div className="h-[340px] space-y-3 overflow-y-auto px-[18px] py-4">
 {history.length === 0 ? (
 <div className="space-y-3">
 <p className="text-[12.5px] leading-relaxed text-[#6B6860]">
 {MODES.find((item) => item.id === mode)?.hint}. ISC Lab searches{" "}
 <strong>documentation.sailpoint.com</strong>, <strong>developer.sailpoint.com</strong>, curated
 battlecards, peer golden pitches, and your enablement profile — every answer cites what was consulted.
 </p>
 <div className="flex flex-wrap gap-2">
 {starterPrompts.map((prompt) => (
 <button
 className="rounded-full border border-[rgba(0,113,206,0.2)] bg-[#e8f2fc]/80 px-3 py-1.5 text-left text-[11.5px] font-semibold text-[#0057a8] hover:bg-[#e8f2fc]"
 key={prompt}
 onClick={() => void send(prompt)}
 type="button"
 >
 {prompt}
 </button>
 ))}
 </div>
 </div>
 ) : (
 history.map((turn, index) => (
 <div
 className={turn.role === "user" ? "flex items-start justify-end gap-[9px]" : "flex items-start gap-[9px]"}
 key={`${turn.role}-${index}`}
 >
 <div
 className={cn(
 "flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
 turn.role === "user" ? "order-2" : "",
 )}
 style={{
 background:
 turn.role === "user"
 ? "linear-gradient(135deg,#0033a1,#cc27b0)"
 : "linear-gradient(135deg,#0033a1,#0071ce)",
 }}
 >
 {turn.role === "user" ? "SE" : "ISC"}
 </div>
 <div
 className={cn(
 "max-w-[84%] border px-[11px] py-[10px] text-[12.5px] leading-[1.65]",
 turn.role === "user"
 ? "order-1 border-[#E2DFD9] bg-white text-[#3D3C38]"
 : "border-[#E2DFD9] bg-[#F9F8F6] text-[#3D3C38]",
 )}
 >
 <p className="whitespace-pre-wrap">{turn.content}</p>
 {turn.role === "assistant" && turn.sources && turn.sources.length > 0 ? (
 <div className="mt-[10px] border-t border-black/[0.08] pt-[8px]">
 <p className="mb-[6px] flex items-center gap-[4px] text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#A09D98]">
 📄 Sources consulted (grounded)
 </p>
 <div className="mb-[7px] flex flex-wrap gap-[5px]">
 {turn.sources.map((source) => {
 const label =
 SOURCE_LABELS[source.kind === "battlecard" ? "battlecard" : source.source] ??
 source.source;
 const fetched = formatFetchedAt(source.fetchedAt);
 return (
 <a
 className="border border-[#E2DFD9] bg-white px-[9px] py-[4px]"
 href={source.url}
 key={`${source.url}-${source.title}`}
 rel={source.url.startsWith("http") ? "noreferrer" : undefined}
 target={source.url.startsWith("http") ? "_blank" : undefined}
 >
 <p className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0057a8]">
 {label} · {source.title}
 {source.url.startsWith("http") ? <ExternalLink className="h-2.5 w-2.5" /> : null}
 </p>
 <p className="mt-[1px] text-[9px] text-[#A09D98]">
 {fetched ? `Fetched ${fetched}` : source.contentVersion ? `v${source.contentVersion}` : ""}
 </p>
 </a>
 );
 })}
 </div>
 </div>
 ) : null}
 {turn.role === "assistant" && turn.nudges?.challenge ? (
 <p className="mt-2 text-xs text-[#6B6860]">
 Practice:{" "}
 <a className="font-semibold text-[#0057a8] hover:underline" href={turn.nudges.challenge.href}>
 {turn.nudges.challenge.title}
 </a>
 </p>
 ) : null}
 {turn.role === "assistant" && turn.nudges?.cert ? (
 <p className="mt-1 text-xs text-[#6B6860]">
 Cert path:{" "}
 <a className="font-semibold text-[#0057a8] hover:underline" href={turn.nudges.cert.href}>
 {turn.nudges.cert.label}
 </a>
 </p>
 ) : null}
 {turn.role === "assistant" && turn.platform?.practiceChallenges.length ? (
 <div className="mt-2 text-xs text-[#6B6860]">
 Related challenges:{" "}
 {turn.platform.practiceChallenges.map((challenge, challengeIndex) => (
 <span key={challenge.href}>
 {challengeIndex > 0 ? " · " : ""}
 <a className="font-semibold text-[#0057a8] hover:underline" href={challenge.href}>
 {challenge.title}
 </a>
 </span>
 ))}
 </div>
 ) : null}
 {turn.role === "assistant" && turn.model ? (
 <p className="mt-2 text-[10px] text-[#A09D98]">
 {turn.provider === "xai" ? "Grok" : turn.provider} · {turn.model}
 </p>
 ) : null}
 {turn.role === "assistant" &&
 index === history.length - 1 &&
 mode === "account_prep" &&
 accountName.trim() ? (
 <div className="mt-3 border-t border-slate-200/80 pt-2">
 <button
 className={SP_OUTLINE_BTN}
 disabled={savingPrep}
 onClick={() => void saveToDealPrep(turn.content)}
 type="button"
 >
 {savingPrep ? (
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <Save className="h-3.5 w-3.5" />
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
 <div className="flex items-center gap-2 text-sm text-[#6B6860]">
 <Loader2 className="h-4 w-4 animate-spin" />
 {loadingLabel}
 </div>
 ) : null}
 </div>

 <form
 className="flex gap-2 border-t border-[#ECEAE6] px-4 py-3"
 onSubmit={(event) => {
 event.preventDefault();
 void send(message);
 }}
 >
 {mode === "voice_objection" ? (
 <SimulationSpeechInput
 disabled={loading}
 onTranscript={(text) => setMessage((current) => (current ? `${current} ${text}` : text))}
 />
 ) : null}
 <Input
 className="flex-1"
 onChange={(event) => setMessage(event.target.value)}
 placeholder={
 mode === "voice_objection"
 ? "Speak or type a buyer objection…"
 : mode === "battlecard"
 ? "Competitor or objection to battle…"
 : "Ask ISC Lab…"
 }
 value={message}
 />
 <button className={SP_BLUE_BTN} disabled={loading || !message.trim()} type="submit">
 <Send className="h-4 w-4" />
 </button>
 </form>
 </div>
 </div>
 );
}
