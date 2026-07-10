"use client";

import { Bug, ExternalLink, ImagePlus, Loader2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { openUatBugWindow } from "@/lib/uat/open-uat-bug-window";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string };
type ForgeIssue = {
 id: string;
 number: number;
 title: string;
 description: string | null;
 status: string;
 priority: string;
 category_id: string | null;
 created_at: string;
};

type Meta = {
 enabled: boolean;
 forgeReachable?: boolean;
 forgeError?: string;
 projectKey: string;
 assigneeName: string;
 assigneeEmail: string;
 categories: Category[];
 priorities: string[];
 statuses: string[];
 forgeUrl: string;
};

type Tab = "report" | "backlog";

const PRIORITY_LABELS: Record<string, string> = {
 critical: "Critical",
 high: "High",
 medium: "Medium",
 low: "Low",
};

export function UatBugTracker({
 enabled,
 reporterName,
 reporterEmail,
}: {
 enabled: boolean;
 reporterName: string;
 reporterEmail: string;
}) {
 const pathname = usePathname();
 const [backlogCount, setBacklogCount] = useState(0);

 useEffect(() => {
 if (!enabled || pathname === "/uat-bugs") return;

 const cacheKey = "uat-bug-backlog-count";
 const cached = sessionStorage.getItem(cacheKey);
 if (cached) {
 try {
 const { count, at } = JSON.parse(cached) as { count: number; at: number };
 if (Date.now() - at < 5 * 60_000) {
 setBacklogCount(count);
 return;
 }
 } catch {
 // ignore stale cache
 }
 }

 const load = () => {
 void fetch("/api/uat-bugs/issues?status=backlog", { credentials: "same-origin" })
 .then((res) => (res.ok ? res.json() : null))
 .then((json: { data?: unknown[] } | null) => {
 if (json?.data) {
 setBacklogCount(json.data.length);
 sessionStorage.setItem(cacheKey, JSON.stringify({ count: json.data.length, at: Date.now() }));
 }
 })
 .catch(() => undefined);
 };

 const idle = window.requestIdleCallback?.(() => load(), { timeout: 4_000 });
 const fallback = idle === undefined ? window.setTimeout(load, 2_000) : undefined;

 return () => {
 if (idle !== undefined) window.cancelIdleCallback(idle);
 if (fallback !== undefined) window.clearTimeout(fallback);
 };
 }, [enabled, pathname]);

 if (!enabled || pathname === "/uat-bugs") {
 return null;
 }

 return (
 <div
 className={cn(
 "fixed z-[70]",
 "bottom-20 left-3 md:bottom-6",
 "lg:left-[232px]",
 )}
 >
 <button
 className="flex items-center gap-2 rounded-full border border-[#0071ce]/30 bg-[#00143a] px-4 py-2.5 text-sm font-semibold text-white /25 transition hover:bg-[#002855]"
 onClick={() => openUatBugWindow()}
 title="Open UAT bug tracker in a separate window"
 type="button"
 >
 <Bug className="h-4 w-4 text-[#38bdf8]" aria-hidden />
 UAT Bugs
 {backlogCount > 0 ? (
 <span className="rounded-full bg-[#0071ce] px-1.5 py-0.5 text-[10px] font-bold">{backlogCount}</span>
 ) : null}
 <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
 </button>
 </div>
 );
}

/** Full bug tracker UI — rendered inside the dedicated /uat-bugs popup window. */
export function UatBugTrackerPanel({
 reporterName,
 reporterEmail,
}: {
 reporterName: string;
 reporterEmail: string;
}) {
 const pathname = usePathname();
 const [tab, setTab] = useState<Tab>("report");
 const [meta, setMeta] = useState<Meta | null>(null);
 const [issues, setIssues] = useState<ForgeIssue[]>([]);
 const [loadingMeta, setLoadingMeta] = useState(true);
 const [loadingIssues, setLoadingIssues] = useState(false);
 const [submitting, setSubmitting] = useState(false);
 const [selectedId, setSelectedId] = useState<string | null>(null);

 const [title, setTitle] = useState("");
 const [comments, setComments] = useState("");
 const [priority, setPriority] = useState("high");
 const [categoryId, setCategoryId] = useState("");
 const [files, setFiles] = useState<File[]>([]);
 const [dragOver, setDragOver] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const pageUrl = useMemo(() => {
 if (typeof window === "undefined") return pathname;
 return `${window.location.origin}${pathname}${window.location.search}`;
 }, [pathname]);

 const loadMeta = useCallback(async () => {
 setLoadingMeta(true);
 try {
 const res = await fetch("/api/uat-bugs/meta", { credentials: "same-origin" });
 if (res.status === 401) {
 setMeta(null);
 return;
 }
 const json = (await res.json()) as Meta & { error?: string; reason?: string };
 if (!json.enabled) {
 setMeta(null);
 return;
 }
 setMeta(json);
 if (json.categories[0]) {
 setCategoryId((current) => current || json.categories[0].id);
 }
 } catch {
 setMeta(null);
 } finally {
 setLoadingMeta(false);
 }
 }, []);

 const loadIssues = useCallback(async () => {
 setLoadingIssues(true);
 try {
 const res = await fetch("/api/uat-bugs/issues?status=backlog", { credentials: "same-origin" });
 const json = (await res.json()) as { data?: ForgeIssue[]; error?: string };
 if (!res.ok) throw new Error(json.error ?? "Failed to load backlog");
 setIssues(json.data ?? []);
 } catch (error) {
 toast.error(error instanceof Error ? error.message : "Could not load backlog.");
 } finally {
 setLoadingIssues(false);
 }
 }, []);

 useEffect(() => {
 void loadMeta();
 }, [loadMeta]);

 useEffect(() => {
 if (meta?.enabled) {
 void loadIssues();
 }
 }, [meta?.enabled, loadIssues]);

 function addFiles(incoming: FileList | File[]) {
 const next = [...files];
 for (const file of Array.from(incoming)) {
 if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
 toast.error(`${file.name}: only images and PDF are supported.`);
 continue;
 }
 if (file.size > 10 * 1024 * 1024) {
 toast.error(`${file.name} exceeds 10 MB.`);
 continue;
 }
 next.push(file);
 }
 setFiles(next.slice(0, 5));
 }

 async function handleSubmit(event: React.FormEvent) {
 event.preventDefault();
 if (!title.trim()) {
 toast.error("Title is required.");
 return;
 }

 setSubmitting(true);
 try {
 const form = new FormData();
 form.set("title", title.trim());
 form.set("comments", comments.trim());
 form.set("priority", priority);
 form.set("category_id", categoryId);
 form.set("page_url", pageUrl);
 form.set("reporter_name", reporterName);
 for (const file of files) {
 form.append("files", file);
 }

 const res = await fetch("/api/uat-bugs/issues", { method: "POST", body: form, credentials: "same-origin" });
 const json = (await res.json()) as { data?: { key?: string; number: number }; error?: string };
 if (!res.ok) throw new Error(json.error ?? "Failed to submit bug");

 const key = json.data?.key ?? `${meta?.projectKey ?? "SEENA"}-${json.data?.number}`;
 toast.success(`Logged ${key} — assigned to ${meta?.assigneeEmail ?? "Matt"}.`);
 setTitle("");
 setComments("");
 setFiles([]);
 setTab("backlog");
 void loadIssues();
 } catch (error) {
 toast.error(error instanceof Error ? error.message : "Could not submit bug.");
 } finally {
 setSubmitting(false);
 }
 }

 async function updateIssue(id: string, patch: Partial<ForgeIssue>) {
 try {
 const res = await fetch(`/api/uat-bugs/issues/${id}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(patch),
 credentials: "same-origin",
 });
 const json = (await res.json()) as { data?: ForgeIssue; error?: string };
 if (!res.ok) throw new Error(json.error ?? "Update failed");
 setIssues((current) => current.map((item) => (item.id === id ? { ...item, ...json.data! } : item)));
 toast.success("Issue updated.");
 if (patch.status && patch.status !== "backlog") {
 setIssues((current) => current.filter((item) => item.id !== id));
 setSelectedId(null);
 }
 } catch (error) {
 toast.error(error instanceof Error ? error.message : "Could not update issue.");
 }
 }

 if (loadingMeta) {
 return (
 <div className="flex min-h-screen items-center justify-center bg-white">
 <Loader2 className="h-6 w-6 animate-spin text-[#0071ce]" />
 </div>
 );
 }

 if (!meta?.enabled) {
 return (
 <div className="flex min-h-screen items-center justify-center bg-white p-6 text-center text-sm text-slate-600">
 UAT bug tracker is not configured for this environment.
 </div>
 );
 }

 const selected = issues.find((item) => item.id === selectedId) ?? null;
 const projectKey = meta?.projectKey ?? "SEENA";
 const assigneeName = meta?.assigneeName ?? "Matt Giblin";
 const assigneeEmail = meta?.assigneeEmail ?? "matt.j.giblin@gmail.com";
 const categories = meta?.categories ?? [{ id: "general", name: "General / UI" }];
 const priorities = meta?.priorities ?? ["critical", "high", "medium", "low"];
 const statuses = meta?.statuses ?? ["backlog", "todo", "in_progress", "in_review", "done"];
 const forgeUrl = meta?.forgeUrl ?? "https://forge-nu-ochre.vercel.app";

 return (
 <div className="flex min-h-screen flex-col bg-white">
 <header className="flex shrink-0 items-center justify-between border-b border-[#E2DFD9] bg-[#00143a] px-4 py-3 text-white">
 <div className="flex items-center gap-2">
 <Bug className="h-4 w-4 text-[#38bdf8]" aria-hidden />
 <div>
 <p className="text-sm font-bold leading-tight">UAT Bug Tracker</p>
 <p className="text-[10px] text-white/60">Forge · {projectKey}</p>
 </div>
 </div>
 <div className="flex items-center gap-1">
 <a
 className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
 href={forgeUrl}
 rel="noreferrer"
 target="_blank"
 title="Open Forge"
 >
 <ExternalLink className="h-4 w-4" />
 </a>
 <button
 className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
 onClick={() => window.close()}
 type="button"
 aria-label="Close window"
 >
 <X className="h-4 w-4" />
 </button>
 </div>
 </header>

 <div className="flex shrink-0 border-b border-[#E2DFD9] bg-[#f8fafc]">
 {(
 [
 ["report", "Report bug"],
 ["backlog", `Backlog (${issues.length})`],
 ] as const
 ).map(([key, label]) => (
 <button
 className={cn(
 "flex-1 px-3 py-2 text-xs font-semibold transition",
 tab === key ? "border-b-2 border-[#0071ce] text-[#0071ce] bg-white" : "text-slate-500",
 )}
 key={key}
 onClick={() => setTab(key)}
 type="button"
 >
 {label}
 </button>
 ))}
 </div>

 <div className="min-h-0 flex-1 overflow-y-auto p-4">
 {meta?.forgeReachable === false ? (
 <div className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
 <strong>Forge connection issue.</strong> {meta.forgeError ?? "API unreachable."} You can still
 file bugs — submissions may fail until Forge is healthy.
 </div>
 ) : null}
 {tab === "report" ? (
 <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
 <div>
 <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="uat-title">
 Title <span className="text-red-500">*</span>
 </label>
 <input
 className="w-full border border-[#E2DFD9] px-3 py-2 text-sm outline-none focus:border-[#0071ce]"
 id="uat-title"
 onChange={(event) => setTitle(event.target.value)}
 placeholder="Short summary of the issue"
 value={title}
 />
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="uat-category">
 Category
 </label>
 <select
 className="w-full border border-[#E2DFD9] px-2 py-2 text-sm outline-none focus:border-[#0071ce]"
 id="uat-category"
 onChange={(event) => setCategoryId(event.target.value)}
 value={categoryId}
 >
 {categories.length === 0 ? (
 <option value="">No categories</option>
 ) : (
 categories.map((category) => (
 <option key={category.id} value={category.id}>
 {category.name}
 </option>
 ))
 )}
 </select>
 </div>
 <div>
 <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="uat-severity">
 Severity
 </label>
 <select
 className="w-full border border-[#E2DFD9] px-2 py-2 text-sm outline-none focus:border-[#0071ce]"
 id="uat-severity"
 onChange={(event) => setPriority(event.target.value)}
 value={priority}
 >
 {priorities.map((item) => (
 <option key={item} value={item}>
 {PRIORITY_LABELS[item] ?? item}
 </option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="uat-comments">
 Comments / steps to reproduce
 </label>
 <textarea
 className="min-h-[88px] w-full resize-y border border-[#E2DFD9] px-3 py-2 text-sm outline-none focus:border-[#0071ce]"
 id="uat-comments"
 onChange={(event) => setComments(event.target.value)}
 placeholder="What happened? What did you expect? Steps to reproduce…"
 value={comments}
 />
 </div>

 <div
 className={cn(
 "border-2 border-dashed px-3 py-4 text-center transition",
 dragOver ? "border-[#0071ce] bg-[#eff6ff]" : "border-[#B0ADA8] bg-[#f8fafc]",
 )}
 onDragEnter={(event) => {
 event.preventDefault();
 setDragOver(true);
 }}
 onDragLeave={() => setDragOver(false)}
 onDragOver={(event) => event.preventDefault()}
 onDrop={(event) => {
 event.preventDefault();
 setDragOver(false);
 if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
 }}
 >
 <ImagePlus className="mx-auto mb-2 h-5 w-5 text-slate-400" />
 <p className="text-xs font-medium text-slate-600">Drag & drop screenshots here</p>
 <p className="mt-1 text-[10px] text-slate-400">PNG, JPG, GIF, WebP, PDF · max 10 MB each</p>
 <button
 className="mt-2 text-xs font-semibold text-[#0071ce] hover:underline"
 onClick={() => fileInputRef.current?.click()}
 type="button"
 >
 Browse files
 </button>
 <input
 accept="image/*,application/pdf"
 className="hidden"
 multiple
 onChange={(event) => {
 if (event.target.files) addFiles(event.target.files);
 event.target.value = "";
 }}
 ref={fileInputRef}
 type="file"
 />
 </div>

 {files.length > 0 ? (
 <ul className="space-y-1">
 {files.map((file) => (
 <li
 className="flex items-center justify-between rounded bg-[#ECEAE6] px-2 py-1 text-xs"
 key={`${file.name}-${file.size}`}
 >
 <span className="truncate">{file.name}</span>
 <button
 className="ml-2 text-slate-400 hover:text-red-500"
 onClick={() => setFiles((current) => current.filter((f) => f !== file))}
 type="button"
 >
 <X className="h-3 w-3" />
 </button>
 </li>
 ))}
 </ul>
 ) : null}

 <p className="text-[10px] text-slate-400">
 Page URL captured automatically. All bugs go to <strong>backlog</strong> and assign to{" "}
 {assigneeName} ({assigneeEmail}).
 </p>

 <button
 className="flex w-full items-center justify-center gap-2 bg-[#0071ce] py-2.5 text-sm font-semibold text-white hover:bg-[#005fa8] disabled:opacity-60"
 disabled={submitting}
 type="submit"
 >
 {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
 Submit to Forge
 </button>
 </form>
 ) : (
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <p className="text-xs text-slate-500">Backlog — triage one at a time</p>
 <button
 className="text-xs font-semibold text-[#0071ce] hover:underline"
 onClick={() => void loadIssues()}
 type="button"
 >
 Refresh
 </button>
 </div>

 {loadingIssues ? (
 <div className="flex justify-center py-8">
 <Loader2 className="h-5 w-5 animate-spin text-[#0071ce]" />
 </div>
 ) : issues.length === 0 ? (
 <p className="bg-[#f8fafc] px-3 py-6 text-center text-sm text-slate-500">
 No backlog bugs. Great job — or report the first one!
 </p>
 ) : (
 <ul className="space-y-2">
 {issues.map((issue) => (
 <li key={issue.id}>
 <button
 className={cn(
 "w-full border px-3 py-2 text-left transition",
 selectedId === issue.id
 ? "border-[#0071ce] bg-[#eff6ff]"
 : "border-[#E2DFD9] bg-white hover:border-[#93c5fd]",
 )}
 onClick={() => setSelectedId(selectedId === issue.id ? null : issue.id)}
 type="button"
 >
 <div className="flex items-start justify-between gap-2">
 <span className="text-xs font-bold text-[#0071ce]">
 {projectKey}-{issue.number}
 </span>
 <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
 {issue.priority}
 </span>
 </div>
 <p className="mt-1 text-sm font-medium text-slate-800">{issue.title}</p>
 </button>

 {selectedId === issue.id ? (
 <div className="mt-2 space-y-2 border border-[#E2DFD9] bg-[#f8fafc] p-3">
 {issue.description ? (
 <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
 {issue.description}
 </pre>
 ) : null}
 <div className="grid grid-cols-2 gap-2">
 <label className="text-[10px] font-semibold text-slate-500">
 Status
 <select
 className="mt-1 w-full rounded border border-[#E2DFD9] px-2 py-1 text-xs"
 onChange={(event) =>
 void updateIssue(issue.id, { status: event.target.value })
 }
 value={issue.status}
 >
 {statuses.map((status) => (
 <option key={status} value={status}>
 {status.replace(/_/g, " ")}
 </option>
 ))}
 </select>
 </label>
 <label className="text-[10px] font-semibold text-slate-500">
 Severity
 <select
 className="mt-1 w-full rounded border border-[#E2DFD9] px-2 py-1 text-xs"
 onChange={(event) =>
 void updateIssue(issue.id, { priority: event.target.value })
 }
 value={issue.priority}
 >
 {priorities.map((item) => (
 <option key={item} value={item}>
 {PRIORITY_LABELS[item] ?? item}
 </option>
 ))}
 </select>
 </label>
 </div>
 </div>
 ) : null}
 </li>
 ))}
 </ul>
 )}
 </div>
 )}
 </div>
 </div>
 );
}
