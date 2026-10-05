"use client";

import { Loader2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Tag } from "@/components/ui/tag";
import { Textarea } from "@/components/ui/textarea";
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

 // Bottom-right, clear of the sidebar user row, and raised above the sticky action bars
 // (unsaved changes, bulk approve) so it never covers their primary button. Toasts sit bottom-centre.
 return (
 <button
 className="fixed right-4 bottom-[84px] z-[60] inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-white px-4 py-2 text-sm font-bold text-ink hover:bg-blue-soft"
 onClick={() => openUatBugWindow()}
 type="button"
 >
 UAT bugs
 {backlogCount > 0 ? (
 <span className="rounded-full bg-signal px-2 font-mono text-xs leading-[18px] font-medium text-ink">
 {backlogCount}
 <span className="sr-only"> in backlog</span>
 </span>
 ) : null}
 <span className="sr-only">(opens a new window)</span>
 <span aria-hidden className="text-muted">
 ↗
 </span>
 </button>
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
 // Step 1 — create issue (JSON only; Forge attachments are a separate call).
 const createRes = await fetch("/api/uat-bugs/issues", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 credentials: "same-origin",
 body: JSON.stringify({
 title: title.trim(),
 comments: comments.trim(),
 priority,
 category_id: categoryId,
 page_url: pageUrl,
 reporter_name: reporterName,
 }),
 });
 const createJson = (await createRes.json()) as {
 data?: { id: string; number: number; key?: string };
 error?: string;
 };
 if (!createRes.ok) throw new Error(createJson.error ?? "Failed to submit bug");

 const issue = createJson.data;
 if (!issue?.id) throw new Error("Forge did not return an issue id.");

 // Step 2 — upload each screenshot/file sequentially to the new issue.
 const failedUploads: string[] = [];
 for (const file of files) {
 const uploadForm = new FormData();
 uploadForm.append("file", file, file.name);
 const uploadRes = await fetch(`/api/uat-bugs/issues/${issue.id}/attachments`, {
 method: "POST",
 body: uploadForm,
 credentials: "same-origin",
 });
 if (!uploadRes.ok) {
 failedUploads.push(file.name);
 }
 }

 const key = issue.key ?? `${meta?.projectKey ?? "SEENA"}-${issue.number}`;
 if (failedUploads.length > 0) {
 toast.warning(
 `Logged ${key}, but ${failedUploads.length} attachment(s) failed: ${failedUploads.join(", ")}`,
 );
 } else if (files.length > 0) {
 toast.success(`Logged ${key} with ${files.length} attachment(s).`);
 } else {
 toast.success(`Logged ${key} — assigned to ${meta?.assigneeEmail ?? "Matt"}.`);
 }

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
 <main className="flex min-h-screen items-center justify-center bg-bg" id="main-content">
 <Loader2 aria-hidden className="h-6 w-6 animate-spin text-blue" />
 <span className="sr-only">Loading</span>
 </main>
 );
 }

 if (!meta?.enabled) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-center text-[15px] text-ink-2" id="main-content">
 UAT bug tracker is not configured for this environment.
 </main>
 );
 }

 const projectKey = meta?.projectKey ?? "SEENA";
 const assigneeName = meta?.assigneeName ?? "Matt Giblin";
 const assigneeEmail = meta?.assigneeEmail ?? "matt.j.giblin@gmail.com";
 const categories = meta?.categories ?? [{ id: "general", name: "General / UI" }];
 const priorities = meta?.priorities ?? ["critical", "high", "medium", "low"];
 const statuses = meta?.statuses ?? ["backlog", "todo", "in_progress", "in_review", "done"];
 const forgeUrl = meta?.forgeUrl ?? "https://forge-nu-ochre.vercel.app";
 const selectClass =
 "h-10 w-full rounded-[10px] border-[1.5px] border-ink bg-white px-3 text-[15px] text-ink focus:border-blue";
 const labelClass = "mb-1.5 block text-sm font-semibold text-ink";

 return (
 <div className="flex min-h-screen flex-col bg-bg">
 <header className="flex shrink-0 items-center justify-between gap-3 bg-blue px-5 py-3.5 text-white">
 <div>
 <p className="text-base font-bold leading-tight">UAT bug tracker</p>
 <p className="font-mono text-xs text-on-blue-muted">FORGE · {projectKey}</p>
 </div>
 <div className="flex items-center gap-3">
 <a className="text-sm font-bold text-white underline decoration-signal decoration-2 underline-offset-[3px]" href={forgeUrl} rel="noreferrer" target="_blank">
 Open Forge<span className="sr-only"> (opens a new tab)</span>
 </a>
 <button
 aria-label="Close window"
 className="grid h-8 w-8 place-items-center rounded-full border border-blue-line text-white hover:bg-blue-2"
 onClick={() => window.close()}
 type="button"
 >
 <X aria-hidden className="h-4 w-4" />
 </button>
 </div>
 </header>

 <div className="flex shrink-0 justify-center border-b border-line bg-white px-5 py-3">
 <SegmentedToggle
 label="Bug tracker view"
 onChange={(id) => setTab(id as Tab)}
 options={[
 { id: "report", label: "Report bug" },
 { id: "backlog", label: `Backlog · ${issues.length}` },
 ]}
 value={tab}
 />
 </div>

 <main className="min-h-0 flex-1 overflow-y-auto p-5" id="main-content">
 {meta?.forgeReachable === false ? (
 <p className="mb-4 rounded-[10px] border-[1.5px] border-warning bg-warning-soft px-3.5 py-2.5 text-sm text-warning" role="alert">
 <span aria-hidden>▲ </span>
 <strong>Forge connection issue.</strong> {meta.forgeError ?? "API unreachable."} You can still file bugs, but
 submissions may fail until Forge is healthy.
 </p>
 ) : null}
 {tab === "report" ? (
 <form
 className="space-y-4"
 onPaste={(event) => {
 const items = event.clipboardData?.items;
 if (!items) return;
 const pasted: File[] = [];
 for (const item of Array.from(items)) {
 if (!item.type.startsWith("image/")) continue;
 const blob = item.getAsFile();
 if (blob) {
 pasted.push(new File([blob], `screenshot-${Date.now()}.png`, { type: blob.type || "image/png" }));
 }
 }
 if (pasted.length > 0) {
 event.preventDefault();
 addFiles(pasted);
 toast.message(`Pasted ${pasted.length} screenshot(s).`);
 }
 }}
 onSubmit={(event) => void handleSubmit(event)}
 >
 <div>
 <label className={labelClass} htmlFor="uat-title">
 Title <span className="font-normal text-muted">(required)</span>
 </label>
 <Input
 id="uat-title"
 onChange={(event) => setTitle(event.target.value)}
 placeholder="Short summary of the issue"
 required
 value={title}
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={labelClass} htmlFor="uat-category">
 Category
 </label>
 <select
 className={selectClass}
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
 <label className={labelClass} htmlFor="uat-severity">
 Severity
 </label>
 <select
 className={selectClass}
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
 <label className={labelClass} htmlFor="uat-comments">
 Comments and steps to reproduce
 </label>
 <Textarea
 className="min-h-[96px] resize-y"
 id="uat-comments"
 onChange={(event) => setComments(event.target.value)}
 placeholder="What happened? What did you expect? Steps to reproduce"
 value={comments}
 />
 </div>

 <div
 className={cn(
 "rounded-[14px] border-2 border-dashed px-4 py-5 text-center transition-colors",
 dragOver ? "border-blue bg-blue-soft" : "border-dash bg-white",
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
 <p className="text-sm font-semibold text-ink">Drop screenshots here, or paste with Ctrl/Cmd+V</p>
 <p className="mt-1 font-mono text-xs text-muted">PNG, JPG, GIF, WEBP, PDF · MAX 10 MB EACH · UP TO 5</p>
 <button className="link mt-2 text-sm" onClick={() => fileInputRef.current?.click()} type="button">
 Browse files
 </button>
 <input
 accept="image/*,application/pdf"
 aria-label="Attach screenshots"
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
 <ul className="overflow-hidden rounded-[10px] border border-line bg-white">
 {files.map((file) => (
 <li
 className="flex items-center justify-between gap-2 border-b border-divider px-3 py-2 text-sm last:border-b-0"
 key={`${file.name}-${file.size}`}
 >
 <span className="truncate font-mono text-xs text-ink">{file.name}</span>
 <button
 aria-label={`Remove ${file.name}`}
 className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
 onClick={() => setFiles((current) => current.filter((f) => f !== file))}
 type="button"
 >
 <X aria-hidden className="h-3.5 w-3.5" />
 </button>
 </li>
 ))}
 </ul>
 ) : null}

 <p className="text-[13px] leading-[1.45] text-muted">
 The page URL is captured automatically. Attachments upload after the issue is created. Every bug goes to the
 backlog and is assigned to {assigneeName} ({assigneeEmail}).
 </p>

 <button className="btn-primary inline-flex w-full items-center justify-center gap-2" disabled={submitting} type="submit">
 {submitting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
 Submit to Forge
 </button>
 </form>
 ) : (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <p className="label-mono">Backlog · triage one at a time</p>
 <button className="link text-sm" onClick={() => void loadIssues()} type="button">
 Refresh
 </button>
 </div>

 {loadingIssues ? (
 <div className="flex justify-center py-8" role="status">
 <Loader2 aria-hidden className="h-5 w-5 animate-spin text-blue" />
 <span className="sr-only">Loading backlog</span>
 </div>
 ) : issues.length === 0 ? (
 <p className="rounded-[14px] border border-line bg-white px-4 py-6 text-center text-[15px] text-ink-2">
 No backlog bugs. Report the first one from the other tab.
 </p>
 ) : (
 <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
 {issues.map((issue) => {
 const open = selectedId === issue.id;
 return (
 <li className={cn("border-b border-divider last:border-b-0", open && "bg-blue-soft")} key={issue.id}>
 <button
 aria-expanded={open}
 className="w-full px-4 py-3 text-left"
 onClick={() => setSelectedId(open ? null : issue.id)}
 type="button"
 >
 <span className="flex items-start justify-between gap-2">
 <span className="font-mono text-xs font-medium text-blue">
 {projectKey}-{issue.number}
 </span>
 <Tag tone={issue.priority === "critical" ? "danger" : issue.priority === "high" ? "warning" : "neutral"}>
 {issue.priority === "critical" ? "▲" : issue.priority === "high" ? "●" : "•"}{" "}
 {PRIORITY_LABELS[issue.priority] ?? issue.priority}
 </Tag>
 </span>
 <span className="mt-1 block text-[15px] font-semibold text-ink">{issue.title}</span>
 </button>

 {open ? (
 <div className="space-y-3 px-4 pb-4">
 {issue.description ? (
 <pre className="max-h-32 overflow-auto rounded-[10px] bg-white p-3 font-mono text-xs whitespace-pre-wrap text-ink-2">
 {issue.description}
 </pre>
 ) : null}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={labelClass} htmlFor={`uat-status-${issue.id}`}>
 Status
 </label>
 <select
 className={selectClass}
 id={`uat-status-${issue.id}`}
 onChange={(event) => void updateIssue(issue.id, { status: event.target.value })}
 value={issue.status}
 >
 {statuses.map((status) => (
 <option key={status} value={status}>
 {status.replace(/_/g, " ")}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className={labelClass} htmlFor={`uat-priority-${issue.id}`}>
 Severity
 </label>
 <select
 className={selectClass}
 id={`uat-priority-${issue.id}`}
 onChange={(event) => void updateIssue(issue.id, { priority: event.target.value })}
 value={issue.priority}
 >
 {priorities.map((item) => (
 <option key={item} value={item}>
 {PRIORITY_LABELS[item] ?? item}
 </option>
 ))}
 </select>
 </div>
 </div>
 </div>
 ) : null}
 </li>
 );
 })}
 </ul>
 )}
 </div>
 )}
 </main>
 </div>
 );
}
