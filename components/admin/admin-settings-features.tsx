"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LoadingState, Notice } from "@/components/admin/admin-ui";
import { AdminSettingsHeader } from "@/components/admin/admin-settings-header";
import { ActionBar } from "@/components/ui/action-bar";
import { Toggle } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { TableCard, rowHighlight, tdCls, thCls } from "@/components/ui/table";
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

/**
 * Settings › Features (handoff 12b), generated from PLATFORM_FEATURE_FLAG_DEFS. Feature flags stay operator-managed:
 * while TENANT_ADMINS_CAN_EDIT_FEATURES is false the API reports every feature as locked and rejects changes.
 */
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

  const summaryParts = changed.map((id, index) => {
    const label = featureLabel(id);
    const text = `${index === 0 ? label : label.charAt(0).toLowerCase() + label.slice(1)} ${isFlagEffectivelyEnabled(draft, id) ? "on" : "off"}`;
    return text;
  });
  const summary = summaryParts.length ? `${summaryParts.join(", ")}.` : "";
  const allLocked = saved !== null && locked.length >= PLATFORM_FEATURE_FLAG_DEFS.length;
  const areaCount = (entry: FeatureFlagCategory | "all") =>
    entry === "all" ? PLATFORM_FEATURE_FLAG_DEFS.length : PLATFORM_FEATURE_FLAG_DEFS.filter((def) => def.category === entry).length;

  return (
    <div className={cn("flex min-h-full flex-col", changed.length > 0 && "pb-0")}>
      <AdminSettingsHeader
        active="flags"
        subtitle={
          saved
            ? `${onCount} of ${PLATFORM_FEATURE_FLAG_DEFS.length} features are on.`
            : "Loading features…"
        }
      />

      <div className="flex flex-1 flex-col gap-[22px] px-[var(--page-pad-x)] pb-10 max-sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <div aria-label="Area" className="flex flex-wrap gap-2" role="group">
            <Chip active={area === "all"} count={areaCount("all")} onClick={() => setArea("all")}>
              All
            </Chip>
            {AREAS.map((entry) => (
              <Chip active={area === entry} count={areaCount(entry)} key={entry} onClick={() => setArea(entry)}>
                {FEATURE_AREA_LABELS[entry]}
              </Chip>
            ))}
          </div>
          <input
            aria-label="Search features"
            className="ml-auto w-[220px] rounded-full border border-line-strong bg-white px-4 py-[7px] text-sm text-ink placeholder:text-muted max-sm:ml-0 max-sm:w-full"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search features"
            type="search"
            value={query}
          />
        </div>

        {allLocked ? (
          <Notice>
            Your platform operator manages which features are on for this tenant, so every switch here is locked. Ask them
            through Help if something should change.
          </Notice>
        ) : null}

        {saved === null ? (
          <LoadingState label="Loading features…" />
        ) : (
          <TableCard minWidth={760}>
            <caption className="sr-only">Features</caption>
            <thead>
              <tr>
                <th className={thCls} scope="col">
                  Feature
                </th>
                <th className={cn(thCls, "w-[130px]")} scope="col">
                  Area
                </th>
                <th className={cn(thCls, "w-[150px]")} scope="col">
                  Who sees it
                </th>
                <th className={cn(thCls, "w-[160px]")} scope="col">
                  Depends on
                </th>
                <th className={cn(thCls, "w-[96px] text-right")} scope="col">
                  On
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-sm text-muted" colSpan={5}>
                    No features match.
                  </td>
                </tr>
              ) : null}
              {rows.map((def, index) => {
                const isLocked = locked.includes(def.id);
                const isChanged = changed.includes(def.id);
                const on = isFlagEffectivelyEnabled(draft, def.id);
                const cell = cn(tdCls, "py-3", index === 0 && "border-t-0");
                return (
                  <tr className={isChanged ? rowHighlight.ready : undefined} key={def.id}>
                    <td className={cell}>
                      <span className="flex min-w-0 flex-col gap-[3px]">
                        <span className="text-[15px] font-bold text-ink">{def.label}</span>
                        <span className="text-[13px] text-muted">{def.description}</span>
                      </span>
                    </td>
                    <td className={cn(cell, "text-sm text-ink-2")}>{FEATURE_AREA_LABELS[def.category]}</td>
                    <td className={cn(cell, "text-sm text-ink-2")}>{featureAudience(def)}</td>
                    <td className={cn(cell, "text-sm", def.dependsOn?.length ? "text-ink-2" : "text-muted")}>
                      {def.dependsOn?.length ? def.dependsOn.map(featureLabel).join(", ") : "None"}
                    </td>
                    <td className={cn(cell, "text-right")}>
                      {isLocked ? (
                        <span className="text-[13px] whitespace-nowrap text-muted">
                          {on ? "On" : "Off"}, locked
                        </span>
                      ) : (
                        <span className="inline-flex justify-end">
                          <Toggle
                            changed={isChanged}
                            checked={on}
                            label={`${def.label}${isChanged ? " (changed)" : ""}`}
                            onChange={(next) => toggle(def.id, next)}
                          />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableCard>
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
              className="text-sm font-bold text-white underline decoration-white decoration-2 underline-offset-4 hover:decoration-signal"
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
