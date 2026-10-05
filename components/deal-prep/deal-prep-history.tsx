"use client";

import { ChevronDown, ChevronRight, History, Loader2, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FIELD_CLS, LINE_CARD_CLS } from "@/components/se/form-classes";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold text-ink">Saved prep by account</p>
        <p className="text-sm leading-[1.5] text-muted" role="status">
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
        <p className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-center text-[15px] text-muted">
          No saved preps yet. Generate a brief and it will show up here.
        </p>
      ) : null}

      {hasHistory && showSearch ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-ink" htmlFor="deal-prep-history-search">
            Search past briefs
          </label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className={cn(FIELD_CLS, "pl-9 pr-10")}
              id="deal-prep-history-search"
              onChange={(event) => {
                setHistorySearch(event.target.value);
                if (event.target.value.trim()) {
                  setHistoryScope("all");
                }
              }}
              placeholder="Account, industry, or competitor…"
              type="search"
              value={historySearch}
            />
            {historySearch ? (
              <button
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-blue-soft hover:text-ink"
                onClick={() => {
                  setHistorySearch("");
                  setHistoryScope("recent");
                  void loadHistory("recent", "");
                }}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasHistory && historyMeta?.hasOlder && !historySearch ? (
        <button
          className="btn-secondary inline-flex items-center justify-center gap-2"
          onClick={() => {
            setHistoryScope("all");
            void loadHistory("all", historySearch);
          }}
          type="button"
        >
          <History aria-hidden className="h-4 w-4" />
          Browse all history ({historyMeta.total})
        </button>
      ) : null}

      {hasHistory ? (
        historyLoading ? (
          <p
            className="flex items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-center text-[15px] text-muted"
            role="status"
          >
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            Loading past briefs…
          </p>
        ) : groups.length === 0 ? (
          <p className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-center text-[15px] text-muted">
            No matches for that search.
          </p>
        ) : (
          <ul className={cn(LINE_CARD_CLS, "divide-y divide-divider overflow-hidden")}>
            {groups.map((group) => {
              const expanded = expandedAccounts.has(group.accountKey);
              const isActive = activeSessionId === group.latestSessionId;
              const versionsId = `deal-prep-versions-${group.accountKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

              return (
                <li className={isActive ? "bg-blue-soft" : undefined} key={group.accountKey}>
                  <div className="flex items-stretch">
                    {group.versionCount > 1 ? (
                      <button
                        aria-controls={versionsId}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Collapse" : "Expand"} versions for ${group.accountName}`}
                        className="flex shrink-0 items-center pl-3 pr-1 text-muted hover:text-ink"
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
                        {expanded ? (
                          <ChevronDown aria-hidden className="h-4 w-4" />
                        ) : (
                          <ChevronRight aria-hidden className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                    <button
                      aria-current={isActive ? "true" : undefined}
                      className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 text-left hover:bg-blue-soft"
                      onClick={() => onLoadSession(group.latestSessionId)}
                      type="button"
                    >
                      <span className="text-[15px] font-semibold text-ink">{group.accountName}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                        <span>{group.industry}</span>
                        <span className="font-mono text-xs uppercase">
                          v{group.versions[0]?.version_number ?? 1}
                          {group.versionCount > 1 ? ` · ${group.versionCount} versions` : ""}
                        </span>
                        {group.sharedWithManager ? <Tag tone="blue">✓ Shared</Tag> : null}
                        {isActive ? <Tag tone="signal">● Open</Tag> : null}
                      </span>
                    </button>
                    <button
                      aria-label={`Delete latest prep for ${group.accountName}`}
                      className="flex shrink-0 items-center px-3 text-muted transition hover:bg-danger-soft hover:text-danger"
                      disabled={deletingId === group.latestSessionId}
                      onClick={() => void handleDelete(group.latestSessionId)}
                      type="button"
                    >
                      {deletingId === group.latestSessionId ? (
                        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 aria-hidden className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {expanded && group.versionCount > 1 ? (
                    <ul className="border-t border-divider py-1 pl-9 pr-3" id={versionsId}>
                      {group.versions.map((version) => (
                        <li key={version.id}>
                          <button
                            aria-current={activeSessionId === version.id ? "true" : undefined}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-[10px] px-2 py-2 text-left text-sm hover:bg-blue-soft",
                              activeSessionId === version.id ? "font-semibold text-ink" : "text-ink-2",
                            )}
                            onClick={() => onLoadSession(version.id)}
                            type="button"
                          >
                            <span>
                              v{version.version_number ?? 1} · {meetingTypeLabel(version.meeting_type)}
                            </span>
                            <span className="font-mono text-xs text-muted">
                              {new Date(version.created_at).toLocaleDateString()}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </div>
  );
}
