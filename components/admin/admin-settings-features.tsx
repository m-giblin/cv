"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LoadingState, Switch } from "@/components/admin/admin-ui";
import { ActionBar } from "@/components/ui/action-bar";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import {
  FEATURE_AREA_LABELS,
  changedFeatureIds,
  featureAudience,
  featureLabel,
  toggleFeature,
} from "@/lib/admin/feature-settings";
import {
  PLATFORM_FEATURE_FLAG_DEFS,
  isFlagEffectivelyEnabled,
  mergeFeatureFlags,
  type FeatureFlagCategory,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";
import { cn } from "@/lib/utils";

const AREAS = [...new Set(PLATFORM_FEATURE_FLAG_DEFS.map((def) => def.category))] as FeatureFlagCategory[];
const COLUMNS = "grid grid-cols-[minmax(0,1fr)_120px_150px_150px_70px] gap-3.5 px-[18px]";

/** Settings › Features (handoff 12b), generated from PLATFORM_FEATURE_FLAG_DEFS. */
export function AdminSettingsFeatures() {
  const [saved, setSaved] = useState<PlatformFeatureFlags | null>(null);
  const [draft, setDraft] = useState<PlatformFeatureFlags>({});
  const [locked, setLocked] = useState<string[]>([]);
  const [area, setArea] = useState<FeatureFlagCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/platform-settings");
    if (!response.ok) {
      toast.error("Could not load features.");
      setSaved({});
      return;
    }
    const body = (await response.json()) as {
      settings: { featureFlags: PlatformFeatureFlags };
      lockedFeatures?: string[];
    };
    const flags = mergeFeatureFlags(body.settings.featureFlags);
    setSaved(flags);
    setDraft(flags);
    setLocked(body.lockedFeatures ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = useMemo(() => (saved ? changedFeatureIds(saved, draft) : []), [draft, saved]);

  useEffect(() => {
    if (changed.length === 0) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed.length]);

  const onCount = PLATFORM_FEATURE_FLAG_DEFS.filter((def) => isFlagEffectivelyEnabled(draft, def.id)).length;
  const rows = PLATFORM_FEATURE_FLAG_DEFS.filter(
    (def) =>
      (area === "all" || def.category === area) &&
      (!query.trim() ||
        `${def.label} ${def.description}`.toLowerCase().includes(query.trim().toLowerCase())),
  );

  function toggle(id: string, enabled: boolean) {
    const next = toggleFeature(draft, id, enabled, locked);
    if (!next) {
      toast.error(`${featureLabel(id)} depends on a feature your platform plan does not include.`);
      return;
    }
    setDraft(next);
  }

  async function save() {
    setSaving(true);
    const response = await fetch("/api/admin/platform-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureFlags: draft }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(typeof body?.error === "string" ? body.error : "Could not save changes.");
      return;
    }
    const body = (await response.json()) as { settings: { featureFlags: PlatformFeatureFlags } };
    const flags = mergeFeatureFlags(body.settings.featureFlags);
    setSaved(flags);
    setDraft(flags);
    toast.success(`${changed.length} change${changed.length === 1 ? "" : "s"} saved.`);
  }

  const summary = changed
    .map((id) => `${featureLabel(id)} ${isFlagEffectivelyEnabled(draft, id) ? "on" : "off"}`)
    .join(" · ");

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        actions={
          <input
            aria-label="Search features"
            className="w-[240px] rounded-full border-[1.5px] border-ink bg-white px-4 py-2 text-sm text-ink placeholder:text-muted"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search features"
            type="search"
            value={query}
          />
        }
        className="pb-3.5"
        eyebrow={saved ? `${onCount} of ${PLATFORM_FEATURE_FLAG_DEFS.length} features on` : "Features"}
        title="Settings"
      />

      <div aria-label="Area" className="flex flex-wrap gap-1.5 px-[var(--gutter)] pb-2.5" role="group">
        <Chip active={area === "all"} onClick={() => setArea("all")}>
          All
        </Chip>
        {AREAS.map((entry) => (
          <Chip active={area === entry} key={entry} onClick={() => setArea(entry)}>
            {FEATURE_AREA_LABELS[entry]}
          </Chip>
        ))}
      </div>

      <div className="flex-1 px-[var(--gutter)] pb-10">
        {saved === null ? (
          <LoadingState label="Loading features…" />
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-line bg-white">
            <div className="overflow-x-auto">
              <div className="min-w-[760px]" role="table" aria-label="Features">
                <div role="rowgroup">
                  <div
                    className={cn(COLUMNS, "bg-blue py-[11px] font-mono text-xs text-white uppercase")}
                    role="row"
                  >
                    <span role="columnheader">Feature</span>
                    <span role="columnheader">Area</span>
                    <span role="columnheader">Who sees it</span>
                    <span role="columnheader">Depends on</span>
                    <span className="text-right" role="columnheader">
                      On
                    </span>
                  </div>
                </div>
                <div role="rowgroup">
                  {rows.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-muted">No features match.</p>
                  ) : null}
                  {rows.map((def) => {
                    const isLocked = locked.includes(def.id);
                    const isChanged = changed.includes(def.id);
                    const on = isFlagEffectivelyEnabled(draft, def.id);
                    return (
                      <div
                        className={cn(
                          COLUMNS,
                          "items-center border-b border-divider py-3 text-[15px] last:border-b-0",
                          isChanged && "bg-signal-soft",
                        )}
                        key={def.id}
                        role="row"
                      >
                        <span className="min-w-0" role="cell">
                          <span className="font-bold text-ink" title={def.description}>
                            {def.label}
                          </span>
                          {isChanged ? (
                            <span className="ml-1.5 rounded-[4px] bg-signal px-1.5 py-px font-mono text-xs text-ink uppercase">
                              Changed
                            </span>
                          ) : null}
                          <span className="sr-only">. {def.description}</span>
                        </span>
                        <span role="cell">
                          <span className="inline-block rounded-full border-[1.5px] border-line-strong px-[9px] py-0.5 font-mono text-xs whitespace-nowrap text-ink-2 uppercase">
                            {FEATURE_AREA_LABELS[def.category]}
                          </span>
                        </span>
                        <span className="text-ink-2" role="cell">
                          {featureAudience(def)}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-xs uppercase",
                            isLocked || def.dependsOn?.length ? "text-ink-2" : "text-dash",
                          )}
                          role="cell"
                        >
                          {isLocked
                            ? "Platform plan"
                            : def.dependsOn?.length
                              ? def.dependsOn.map(featureLabel).join(", ")
                              : "—"}
                        </span>
                        <span className="justify-self-end" role="cell">
                          {isLocked ? (
                            <span className="font-mono text-xs text-muted uppercase">
                              Locked<span className="sr-only">, {on ? "on" : "off"}</span>
                            </span>
                          ) : (
                            <Switch
                              changed={isChanged}
                              checked={on}
                              label={`${def.label}${isChanged ? " (changed)" : ""}`}
                              onChange={(next) => toggle(def.id, next)}
                            />
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {changed.length > 0 ? (
        <ActionBar
          count={`${changed.length} unsaved change${changed.length === 1 ? "" : "s"}`}
          primary={
            <button className="btn-primary whitespace-nowrap" disabled={saving} onClick={() => void save()} type="button">
              {saving ? "Saving…" : "Save changes"}
            </button>
          }
          secondary={
            <button
              className="text-sm font-bold text-white hover:underline"
              disabled={saving}
              onClick={() => saved && setDraft(saved)}
              type="button"
            >
              Discard
            </button>
          }
          summary={summary}
        />
      ) : null}
    </div>
  );
}
