"use client";

import { ChevronDown, ChevronRight, History, Loader2, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { PREP_SEARCH_THRESHOLD } from "@/lib/deal-prep/constants";
import { meetingTypeLabel } from "@/lib/deal-prep/templates";

type SavedSession = {
  id: string;
  account_name: string;
  industry: string;
  version_number?: number;
  meeting_type?: string | null;
  created_at: string;
};

type AccountGroup = {
  accountKey: string;
  accountName: string;
  industry: string;
  latestSessionId: string;
  latestAt: string;
  versionCount: number;
  sharedWithManager: boolean;
  versions: SavedSession[];
};

type HistoryMeta = {
  total: number;
  scope: "recent" | "all";
  searchEnabled: boolean;
  hasOlder: boolean;
  showing: number;
};

export function DealPrepHistory({
  activeSessionId,
  onLoadSession,
  onDeleteSession,
  refreshToken,
}: {
  activeSessionId: string | null;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  refreshToken: number;
}) {
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [historyMeta, setHistoryMeta] = useState<HistoryMeta | null>(null);
  const [historyScope, setHistoryScope] = useState<"recent" | "all">("recent");
  const [historySearch, setHistorySearch] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const loadHistory = useCallback(async (scope: "recent" | "all", q: string) => {
    setHistoryLoading(true);
    const params = new URLSearchParams({ group: "account" });
    if (scope === "all") params.set("scope", "all");
    if (q.trim()) params.set("q", q.trim());

    const response = await fetch(`/api/deal-prep/sessions?${params.toString()}`);
    setHistoryLoading(false);

    if (!response.ok) return;

    const body = (await response.json()) as {
      groups: AccountGroup[];
      total: number;
      scope: "recent" | "all";
      searchEnabled: boolean;
      hasOlder: boolean;
      showing: number;
    };

    setGroups(body.groups);
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
  }, [loadHistory, refreshToken]);

  useEffect(() => {
    if (!historyMeta?.searchEnabled || !historySearch.trim()) return;

    const timer = window.setTimeout(() => {
      void loadHistory("all", historySearch);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [historySearch, historyMeta?.searchEnabled, loadHistory]);

  async function handleDelete(sessionId: string) {
    setDeletingId(sessionId);
    await onDeleteSession(sessionId);
    setDeletingId(null);
    await loadHistory(historyScope, historySearch);
  }

  const showSearch = (historyMeta?.total ?? 0) >= PREP_SEARCH_THRESHOLD;
  const inBrowseAll = historyScope === "all" || historySearch.trim().length > 0;
  const hasHistory = groups.length > 0 || (historyMeta?.total ?? 0) > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
      <div className="space-y-3 border-b border-[#f1f5f9] p-[16px_18px]">
        <div>
          <p className="text-[15px] font-bold text-[#0a1628]">Saved prep by account</p>
          <p className="text-[12px] text-[#64748b]">
            {hasHistory
              ? "Private to you — grouped by account with version history."
              : "Saved briefs appear here after you generate prep."}
            {historyMeta && hasHistory
              ? inBrowseAll
                ? ` Showing ${historyMeta.showing} accounts · ${historyMeta.total} total briefs.`
                : ` ${historyMeta.total} saved briefs across your accounts.`
              : null}
          </p>
        </div>

        {!hasHistory && !historyLoading ? (
          <p className="rounded-xl border border-dashed border-sp-blue/15 bg-sp-blue-soft/20 px-4 py-6 text-center text-sm text-sp-navy-muted">
            No saved preps yet. Generate a brief and it will show up here.
          </p>
        ) : null}

        {hasHistory && showSearch ? (
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
              placeholder="Search account, industry, or competitor…"
              value={historySearch}
            />
            {historySearch ? (
              <button
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-sp-navy-muted hover:bg-sp-blue-soft/50"
                onClick={() => {
                  setHistorySearch("");
                  setHistoryScope("recent");
                  void loadHistory("recent", "");
                }}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}

        {hasHistory && historyMeta?.hasOlder && !historySearch ? (
          <button
            className={`${SP_OUTLINE_BTN} w-full justify-center`}
            onClick={() => {
              setHistoryScope("all");
              void loadHistory("all", historySearch);
            }}
            type="button"
          >
            <History className="h-4 w-4" />
            Browse all history ({historyMeta.total})
          </button>
        ) : null}
      </div>

      {hasHistory ? (
      <div className={`space-y-2 p-[12px_16px] pb-4 ${inBrowseAll ? "max-h-[min(24rem,50vh)] overflow-y-auto" : ""}`}>
        {historyLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-sp-blue" />
          </div>
        ) : groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-sp-navy-muted">No matches for that search.</p>
        ) : (
          groups.map((group) => {
            const expanded = expandedAccounts.has(group.accountKey);
            const isActive = activeSessionId === group.latestSessionId;

            return (
              <div
                className={`rounded-xl border transition ${isActive ? "border-sp-blue/30 bg-sp-blue-soft/25" : "border-sp-blue/10"}`}
                key={group.accountKey}
              >
                <div className="flex items-stretch gap-1">
                  {group.versionCount > 1 ? (
                    <button
                      aria-label={expanded ? "Collapse versions" : "Expand versions"}
                      className="flex shrink-0 items-center px-2 text-sp-navy-muted"
                      onClick={() => {
                        setExpandedAccounts((current) => {
                          const next = new Set(current);
                          if (next.has(group.accountKey)) {
                            next.delete(group.accountKey);
                          } else {
                            next.add(group.accountKey);
                          }
                          return next;
                        });
                      }}
                      type="button"
                    >
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  ) : null}
                  <button
                    className="min-w-0 flex-1 p-3 text-left text-sm transition hover:bg-sp-blue-soft/20"
                    onClick={() => onLoadSession(group.latestSessionId)}
                    type="button"
                  >
                    <p className="font-semibold text-sp-navy">{group.accountName}</p>
                    <p className="text-xs text-sp-navy-muted">
                      {group.industry} • v{group.versions[0]?.version_number ?? 1}
                      {group.versionCount > 1 ? ` · ${group.versionCount} versions` : ""}
                      {group.sharedWithManager ? " · shared" : ""}
                    </p>
                  </button>
                  <button
                    aria-label={`Delete latest prep for ${group.accountName}`}
                    className="flex shrink-0 items-center px-3 text-sp-navy-muted transition hover:bg-red-50 hover:text-red-600"
                    disabled={deletingId === group.latestSessionId}
                    onClick={() => void handleDelete(group.latestSessionId)}
                    type="button"
                  >
                    {deletingId === group.latestSessionId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {expanded && group.versionCount > 1 ? (
                  <div className="border-t border-sp-blue/10 px-3 py-2">
                    {group.versions.map((version) => (
                      <button
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs hover:bg-sp-blue-soft/20 ${
                          activeSessionId === version.id ? "bg-sp-blue-soft/30 font-semibold" : "text-sp-navy-muted"
                        }`}
                        key={version.id}
                        onClick={() => onLoadSession(version.id)}
                        type="button"
                      >
                        <span>
                          v{version.version_number ?? 1} · {meetingTypeLabel(version.meeting_type)}
                        </span>
                        <span>{new Date(version.created_at).toLocaleDateString()}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      ) : null}
    </div>
  );
}
