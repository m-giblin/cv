"use client";

import { History, Loader2, Search, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DealPrepOutput } from "@/lib/ai/schemas";

type SavedSession = {
  id: string;
  account_name: string;
  industry: string;
  created_at: string;
};

type HistoryMeta = {
  total: number;
  scope: "recent" | "all";
  searchEnabled: boolean;
  hasOlder: boolean;
  showing: number;
};

import { PREP_SEARCH_THRESHOLD } from "@/lib/deal-prep/constants";

export function DealPrepPanel({ userLevel = "Basic" }: { userLevel?: string }) {
  const [accountName, setAccountName] = useState("");
  const [industry, setIndustry] = useState("");
  const [solutions, setSolutions] = useState("Identity Security Cloud, NHI");
  const [accountContext, setAccountContext] = useState("");
  const [result, setResult] = useState<DealPrepOutput | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedSession[]>([]);
  const [historyMeta, setHistoryMeta] = useState<HistoryMeta | null>(null);
  const [historyScope, setHistoryScope] = useState<"recent" | "all">("recent");
  const [historySearch, setHistorySearch] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = useCallback(async (scope: "recent" | "all", q: string) => {
    setHistoryLoading(true);
    const params = new URLSearchParams();
    if (scope === "all") params.set("scope", "all");
    if (q.trim()) params.set("q", q.trim());

    const response = await fetch(`/api/deal-prep/sessions?${params.toString()}`);
    setHistoryLoading(false);

    if (!response.ok) return;

    const body = (await response.json()) as {
      sessions: SavedSession[];
      total: number;
      scope: "recent" | "all";
      searchEnabled: boolean;
      hasOlder: boolean;
      showing: number;
    };

    setHistory(body.sessions);
    setHistoryMeta({
      total: body.total,
      scope: body.scope,
      searchEnabled: body.searchEnabled,
      hasOlder: body.hasOlder,
      showing: body.showing,
    });
  }, []);

  useEffect(() => {
    void loadHistory("recent", "");
  }, [loadHistory]);

  useEffect(() => {
    if (!historyMeta?.searchEnabled || !historySearch.trim()) return;

    const timer = window.setTimeout(() => {
      void loadHistory("all", historySearch);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [historySearch, historyMeta?.searchEnabled, loadHistory]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setActiveSessionId(null);

    const response = await fetch("/api/ai/deal-prep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountName,
        industry,
        solutions: solutions.split(",").map((item) => item.trim()).filter(Boolean),
        accountContext,
        level: userLevel,
      }),
    });

    if (!response.ok) {
      toast.error("Deal prep generation failed.");
      setIsLoading(false);
      return;
    }

    const body = (await response.json()) as { object: DealPrepOutput };
    setResult(body.object);

    const saveResponse = await fetch("/api/deal-prep/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountName,
        industry,
        solutions: solutions.split(",").map((item) => item.trim()).filter(Boolean),
        accountContext,
        prepOutput: body.object,
      }),
    });

    if (saveResponse.ok) {
      const saved = (await saveResponse.json()) as { id: string };
      setActiveSessionId(saved.id);
    }

    await loadHistory(historyScope, historySearch);
    setIsLoading(false);
  }

  async function loadSession(session: SavedSession) {
    const response = await fetch(`/api/deal-prep/sessions/${session.id}`);
    if (!response.ok) {
      toast.error("Could not load that prep session.");
      return;
    }

    const body = (await response.json()) as {
      session: { prep_output: DealPrepOutput; account_name: string; industry: string };
    };

    setResult(body.session.prep_output);
    setAccountName(body.session.account_name);
    setIndustry(body.session.industry);
    setActiveSessionId(session.id);
  }

  async function deleteSession(sessionId: string) {
    setDeletingId(sessionId);
    const response = await fetch(`/api/deal-prep/sessions/${sessionId}`, { method: "DELETE" });
    setDeletingId(null);

    if (!response.ok) {
      toast.error("Could not delete that prep session.");
      return;
    }

    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setResult(null);
    }

    toast.success("Prep session deleted.");
    await loadHistory(historyScope, historySearch);
  }

  function browseAllHistory() {
    setHistoryScope("all");
    void loadHistory("all", historySearch);
  }

  function backToRecent() {
    setHistoryScope("recent");
    setHistorySearch("");
    void loadHistory("recent", "");
  }

  const showSearch = (historyMeta?.total ?? 0) >= PREP_SEARCH_THRESHOLD;
  const inBrowseAll = historyScope === "all" || historySearch.trim().length > 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sp-magenta" />
              Account context
            </CardTitle>
            <CardDescription>Paste CRM notes or meeting context for account-specific prep.</CardDescription>
          </CardHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input onChange={(e) => setAccountName(e.target.value)} placeholder="Account name" required value={accountName} />
            <Input onChange={(e) => setIndustry(e.target.value)} placeholder="Industry" required value={industry} />
            <Input onChange={(e) => setSolutions(e.target.value)} placeholder="Solutions (comma-separated)" value={solutions} />
            <Textarea
              onChange={(e) => setAccountContext(e.target.value)}
              placeholder="What do you know about this account? Stakeholders, pain, timeline, competitors..."
              required
              rows={6}
              value={accountContext}
            />
            <Button className="w-full" disabled={isLoading} type="submit">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate deal prep
            </Button>
          </form>
        </Card>

        {history.length > 0 || historyMeta?.total ? (
          <Card>
            <CardHeader className="space-y-3 pb-2">
              <div>
                <CardTitle>Saved prep history</CardTitle>
                <CardDescription>
                  Private to you — delete mistakes anytime.
                  {historyMeta
                    ? inBrowseAll
                      ? ` Showing ${historyMeta.showing} of ${historyMeta.total} briefs.`
                      : ` ${historyMeta.total} saved · ${Math.min(historyMeta.total, PREP_SEARCH_THRESHOLD)} most recent below.`
                    : null}
                </CardDescription>
              </div>

              {showSearch ? (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sp-navy-muted" />
                  <Input
                    className="h-9 pl-9 pr-9 text-sm"
                    onChange={(event) => {
                      setHistorySearch(event.target.value);
                      if (event.target.value.trim()) {
                        setHistoryScope("all");
                      }
                    }}
                    placeholder="Search account or industry…"
                    value={historySearch}
                  />
                  {historySearch ? (
                    <button
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-sp-navy-muted hover:bg-sp-blue-soft/50"
                      onClick={() => {
                        setHistorySearch("");
                        if (historyScope === "all" && !historyMeta?.hasOlder) {
                          setHistoryScope("recent");
                        }
                        void loadHistory("recent", "");
                      }}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ) : null}

              {historyMeta?.hasOlder && !historySearch ? (
                <Button className="w-full" onClick={browseAllHistory} size="sm" variant="outline">
                  <History className="h-4 w-4" />
                  Browse all history ({historyMeta.total})
                </Button>
              ) : null}

              {inBrowseAll && !historySearch && historyMeta && historyMeta.total > PREP_SEARCH_THRESHOLD ? (
                <button
                  className="text-xs font-semibold text-sp-blue hover:text-sp-blue-deep"
                  onClick={backToRecent}
                  type="button"
                >
                  ← Back to recent only
                </button>
              ) : null}
            </CardHeader>

            <div
              className={`space-y-2 px-1 ${inBrowseAll ? "max-h-[min(20rem,45vh)] overflow-y-auto" : ""}`}
            >
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-sp-blue" />
                </div>
              ) : history.length === 0 ? (
                <p className="py-6 text-center text-sm text-sp-navy-muted">No matches for that search.</p>
              ) : (
                history.map((session) => (
                  <PrepHistoryRow
                    activeSessionId={activeSessionId}
                    deletingId={deletingId}
                    key={session.id}
                    onDelete={() => void deleteSession(session.id)}
                    onOpen={() => void loadSession(session)}
                    session={session}
                  />
                ))
              )}
            </div>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{result?.accountName ?? "Prep brief"}</CardTitle>
          <CardDescription>{result?.executiveSummary ?? "Structured output appears here."}</CardDescription>
        </CardHeader>
        {result ? (
          <div className="space-y-5">
            <Section title="Discovery questions" items={result.discoveryQuestions} />
            <Section title="Likely objections" items={result.likelyObjections} />
            <Section title="Talk track outline" items={result.talkTrackOutline} />
          </div>
        ) : (
          <p className="text-sm text-sp-navy-muted">Generate prep before your next customer call.</p>
        )}
      </Card>
    </div>
  );
}

function PrepHistoryRow({
  session,
  activeSessionId,
  deletingId,
  onOpen,
  onDelete,
}: {
  session: SavedSession;
  activeSessionId: string | null;
  deletingId: string | null;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const isActive = activeSessionId === session.id;

  return (
    <div
      className={`flex items-stretch gap-1 rounded-xl border transition ${
        isActive ? "border-sp-blue/30 bg-sp-blue-soft/25" : "border-sp-blue/10"
      }`}
    >
      <button
        className="min-w-0 flex-1 p-3 text-left text-sm transition hover:bg-sp-blue-soft/20"
        onClick={onOpen}
        type="button"
      >
        <p className="font-semibold text-sp-navy">{session.account_name}</p>
        <p className="text-xs text-sp-navy-muted">
          {session.industry} • {new Date(session.created_at).toLocaleDateString()}
        </p>
      </button>
      <button
        aria-label={`Delete prep for ${session.account_name}`}
        className="flex shrink-0 items-center px-3 text-sp-navy-muted transition hover:bg-red-50 hover:text-red-600"
        disabled={deletingId === session.id}
        onClick={onDelete}
        type="button"
      >
        {deletingId === session.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-bold text-sp-navy">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-sp-navy-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
