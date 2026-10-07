"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill } from "@/components/ui/status-pill";

type Change = { path: string; before: string; after: string };
type Item = {
  target: "guide" | "playbook";
  id: string;
  title: string;
  mentions: number;
  draft: { note: string | null; mentionsLeft: number; changes: Change[] } | null;
};

async function post(body: unknown) {
  const response = await fetch("/api/admin/playbooks/neutral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(json.error ?? "That didn't work.");
  return json;
}

/** Readable name for a changed field: "pitches[0].text" becomes "Pitch 1". */
function fieldLabel(path: string) {
  const [head = "", index] = path.replace(/\]/g, "").split(/[.[]/);
  const names: Record<string, string> = {
    subtitle: "Subtitle",
    hook: "Hook",
    objectives: "Objective",
    preview: "Preview",
    whereFits: "Where it fits",
    problem: "The problem",
    costs: "Cost",
    solution: "The solution",
    motion: "Selling motion",
    pitches: "Pitch",
    discoveryQuestions: "Discovery question",
    buyingTriggers: "Buying trigger",
    stories: "Story",
    objections: "Objection",
    mistakes: "Common mistake",
    takeaways: "Takeaway",
    retrievalCheck: "Retrieval check",
    fastTrack: "Fast track",
    audience: "Written for",
    routing: "Which chapter to lead with",
    sections: "Section",
  };
  const name = names[head] ?? head;
  return index && /^\d+$/.test(index) ? `${name} ${Number(index) + 1}` : name;
}

/**
 * Admin › Playbooks: make the guide and its chapters sector-neutral. The AI drafts a rewrite of
 * each one; you review what changed and publish or discard. Learners see nothing until you publish.
 */
export function NeutralDraftsPanel() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState<{ done: number; total: number; current: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = useCallback(() => {
    void fetch("/api/admin/playbooks/neutral")
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { items?: Item[]; error?: string } | null;
        if (!response.ok || !body?.items) throw new Error(body?.error ?? "Couldn't load the playbooks.");
        setItems(body.items);
        setError("");
      })
      .catch((caught: Error) => setError(caught.message));
  }, []);
  useEffect(() => load(), [load]);

  if (error) return <p className="rounded-[10px] bg-warning-soft px-4 py-3 text-sm text-ink">{error}</p>;
  if (!items) return null;

  const needing = items.filter((item) => item.mentions > 0 && !item.draft);
  const drafts = items.filter((item) => item.draft);
  const totalMentions = items.reduce((sum, item) => sum + item.mentions, 0);
  const open = items.find((item) => item.id === reviewing) ?? null;

  async function generateAll() {
    // One at a time: each rewrite takes up to a minute, and a failure shouldn't stop the rest.
    setRunning({ done: 0, total: needing.length, current: needing[0]?.title ?? "" });
    let failed = 0;
    for (const [index, item] of needing.entries()) {
      setRunning({ done: index, total: needing.length, current: item.title });
      try {
        await post({ target: item.target, id: item.id, action: "generate" });
      } catch {
        failed += 1;
      }
    }
    setRunning(null);
    toast[failed ? "error" : "success"](
      failed ? `${needing.length - failed} drafts ready, ${failed} failed. Run it again for the rest.` : `${needing.length} drafts ready to review`,
    );
    load();
  }

  async function act(item: Item, action: "generate" | "publish" | "discard") {
    setBusyId(item.id);
    try {
      await post({ target: item.target, id: item.id, action });
      toast.success(action === "publish" ? `${item.title} published` : action === "discard" ? "Draft discarded" : "Draft ready to review");
      if (action !== "generate") setReviewing(null);
      load();
      if (action === "publish") router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "That didn't work.");
    } finally {
      setBusyId(null);
    }
  }

  async function publishAll() {
    if (!confirm(`Publish all ${drafts.length} drafts? Learners see the new text straight away, and rewritten chapters rebuild their drills.`)) return;
    for (const item of drafts) await act(item, "publish");
  }

  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[640px]">
          <h2 className="text-[18px] font-extrabold text-ink">Make it sector-neutral</h2>
          <p className="text-sm text-muted">
            The guide was written for State, Local and Higher Education. The AI drafts a version any sales team can use, keeping every product fact.
            You review each change, then publish. {totalMentions ? `${totalMentions} sector-specific mentions found.` : "No sector-specific mentions left."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {needing.length ? (
            <button className="btn-primary inline-flex items-center gap-2" disabled={Boolean(running)} onClick={() => void generateAll()} type="button">
              {running ? <Loader2 aria-hidden className="animate-spin" size={16} /> : <Sparkles aria-hidden size={16} />}
              {running ? `Drafting ${running.done + 1} of ${running.total}` : `Draft ${needing.length} rewrites`}
            </button>
          ) : null}
          {drafts.length > 1 ? (
            <button className="btn-secondary" disabled={Boolean(running) || Boolean(busyId)} onClick={() => void publishAll()} type="button">
              Publish all {drafts.length}
            </button>
          ) : null}
        </div>
      </div>
      {running ? <p className="text-[13px] text-muted">Working on {running.current}. Each takes up to a minute; you can keep this page open.</p> : null}

      <ul className="overflow-hidden rounded-[12px] border border-line">
        {items.map((item) => (
          <li className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-4 py-2.5 last:border-b-0" key={item.id}>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-ink">{item.title}</span>
              <span className="block text-[13px] text-muted">
                {item.draft
                  ? `${item.draft.changes.length} changes drafted · ${item.draft.mentionsLeft} mentions left`
                  : item.mentions
                    ? `${item.mentions} sector-specific mentions`
                    : "Already neutral"}
              </span>
            </span>
            <span className="flex items-center gap-3">
              {item.draft ? (
                <>
                  <StatusPill tone="blue">Draft ready</StatusPill>
                  <button className="link text-sm font-bold" onClick={() => setReviewing(item.id)} type="button">
                    Review
                  </button>
                </>
              ) : item.mentions ? (
                <button className="link text-sm" disabled={busyId === item.id || Boolean(running)} onClick={() => void act(item, "generate")} type="button">
                  {busyId === item.id ? "Drafting…" : "Draft rewrite"}
                </button>
              ) : (
                <StatusPill tone="success">Neutral</StatusPill>
              )}
            </span>
          </li>
        ))}
      </ul>

      {open?.draft ? (
        <Drawer
          bodyWidth="full"
          eyebrow="Sector-neutral draft"
          footer={
            <>
              <button className="btn-primary" disabled={busyId === open.id} onClick={() => void act(open, "publish")} type="button">
                Publish
              </button>
              <button className="btn-secondary" disabled={busyId === open.id} onClick={() => void act(open, "generate")} type="button">
                Redraft
              </button>
              <button className="link text-sm text-danger" disabled={busyId === open.id} onClick={() => void act(open, "discard")} type="button">
                Discard
              </button>
            </>
          }
          footerNote="Publishing replaces the live text. Chapters get a new version and their drills are rebuilt."
          onClose={() => setReviewing(null)}
          open
          subtitle={`${open.draft.changes.length} changes · ${open.draft.mentionsLeft} sector-specific mentions left`}
          title={open.title}
        >
          {open.draft.changes.length ? (
            <ol className="flex flex-col gap-3">
              {open.draft.changes.map((change) => (
                <li className="overflow-hidden rounded-[12px] border border-line bg-white" key={change.path}>
                  <p className="label-caps border-b border-divider bg-bg px-4 py-2">{fieldLabel(change.path)}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <p className="m-0 border-b border-divider px-4 py-3 text-sm leading-relaxed text-ink-2 line-through decoration-danger/40 md:border-r md:border-b-0">
                      {change.before || <span className="italic">empty</span>}
                    </p>
                    <p className="m-0 bg-success-soft/50 px-4 py-3 text-sm leading-relaxed text-ink">{change.after}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">The draft is identical to the live text.</p>
          )}
        </Drawer>
      ) : null}
    </section>
  );
}
