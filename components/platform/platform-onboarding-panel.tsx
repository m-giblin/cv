"use client";

import {
  EmptyLine,
  ROW_LINK,
  TABLE,
  TABLE_SCROLL,
  TABLE_WRAP,
  TD,
  TD_META,
  TD_MUTED,
  TH,
  THEAD_ROW,
  TR,
  TenantStatusTag,
  formatDate,
} from "@/components/platform/platform-ui";
import { Stamp } from "@/components/ui/stamp";
import { StatusPill } from "@/components/ui/status-pill";
import { rowHighlight } from "@/components/ui/table";
import type { OnboardingFunnelEntry, OnboardingStage } from "@/lib/platform/mission-control-types";
import { ONBOARDING_STAGE_LABELS } from "@/lib/platform/mission-control-types";
import { cn } from "@/lib/utils";

const STAGES: OnboardingStage[] = [
  "created",
  "admin_invited",
  "admin_accepted",
  "has_users",
  "first_activity",
];

const STAGE_HINTS: Record<OnboardingStage, string> = {
  created: "Tenant exists but no admin invite has been sent yet.",
  admin_invited: "Admin invite is pending acceptance.",
  admin_accepted: "Tenant admin signed in. Still waiting for SE users.",
  has_users: "Users are in the tenant. Waiting for their first practice or activity.",
  first_activity: "Onboarding complete. The tenant has real activity.",
};

function nextActions(entry: OnboardingFunnelEntry): string {
  switch (entry.stage) {
    case "created":
      return "Send a tenant admin invite from Provision.";
    case "admin_invited":
      return "Resend the invite if needed, or shadow as admin to verify setup.";
    case "admin_accepted":
      return "Shadow as admin and help them add their first SEs.";
    case "has_users":
      return "Encourage a first challenge, sim, or plan assignment.";
    case "first_activity":
      return "No blockers. Watch Health and Support as usual.";
    default: {
      const _exhaustive: never = entry.stage;
      return _exhaustive;
    }
  }
}

function StageRunway({ stageIndex }: { stageIndex: number }) {
  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, index) => (
        <span
          aria-hidden
          className={cn(
            "h-2 w-6 rounded-[2px]",
            index < stageIndex && "bg-blue",
            index === stageIndex && (stageIndex === STAGES.length - 1 ? "bg-blue" : "bg-signal outline-2 outline-ink"),
            index > stageIndex && "bg-track",
          )}
          key={stage}
        />
      ))}
      <span className="sr-only">
        Stage {stageIndex + 1} of {STAGES.length}
      </span>
    </div>
  );
}

export function PlatformOnboardingPanel({
  entries,
  selectedTenantId,
  onSelectTenant,
  onOpenProvision,
  onOpenTenant,
  onShadowAdmin,
  onShadowSe,
}: {
  entries: OnboardingFunnelEntry[];
  selectedTenantId: string | null;
  onSelectTenant: (tenantId: string) => void;
  onOpenProvision: (tenantId: string) => void;
  onOpenTenant: (tenantId: string) => void;
  onShadowAdmin: (tenantId: string) => void;
  onShadowSe: (tenantId: string) => void;
}) {
  const incomplete = entries.filter((e) => e.stage !== "first_activity");
  const selected =
    entries.find((entry) => entry.tenantId === selectedTenantId) ??
    incomplete[0] ??
    entries[0] ??
    null;

  return (
    <div className="flex flex-wrap gap-[var(--rail-gap)] min-[1100px]:grid min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
      <div className={cn(TABLE_WRAP, "min-w-0 flex-1")}>
        {entries.length === 0 ? (
          <EmptyLine>No tenants in the onboarding funnel yet.</EmptyLine>
        ) : (
          <div className={TABLE_SCROLL}>
            <table className={TABLE}>
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH} scope="col">Tenant</th>
                  <th className={TH} scope="col">Stage</th>
                  <th className={TH} scope="col">Users</th>
                  <th className={TH} scope="col">Created</th>
                  <th className={TH} scope="col">Progress</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const active = selected?.tenantId === entry.tenantId;
                  const done = entry.stage === "first_activity";
                  return (
                    <tr className={cn(TR, active && rowHighlight.selected)} key={entry.tenantId}>
                      <td className={TD}>
                        <button
                          aria-pressed={active}
                          className={ROW_LINK}
                          onClick={() => onSelectTenant(entry.tenantId)}
                          type="button"
                        >
                          {entry.name}
                        </button>
                      </td>
                      <td className={TD}>
                        <StatusPill tone={done ? "success" : "blue"}>{ONBOARDING_STAGE_LABELS[entry.stage]}</StatusPill>
                      </td>
                      <td className={`${TD_MUTED} num`}>{entry.userCount}</td>
                      <td className={TD_META}>{formatDate(entry.createdAt)}</td>
                      <td className={TD}>
                        <StageRunway stageIndex={entry.stageIndex} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <aside className="w-full min-w-0 min-[1100px]:w-auto">
        {!selected ? (
          <p className="text-[15px] text-muted">Select a tenant from the list.</p>
        ) : (
          <div className="space-y-5 rounded-[14px] border border-line bg-white p-5">
            <div>
              <p className="label-caps">Onboarding detail</p>
              <h2 className="mt-1 text-2xl leading-[1.15] font-extrabold tracking-[-0.015em] text-ink">
                {selected.name}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
                {selected.slug}
                <TenantStatusTag status={selected.status} />
              </p>
            </div>

            <ol className="space-y-2.5">
              {STAGES.map((stage, index) => {
                const done = index <= selected.stageIndex;
                const current = stage === selected.stage;
                return (
                  <li className="flex items-start gap-3" key={stage}>
                    <Stamp className="mt-0.5" size={20} state={current ? "ready" : done ? "earned" : "none"} />
                    <span className={cn("text-[15px]", current ? "font-bold text-ink" : "text-ink-2")}>
                      {ONBOARDING_STAGE_LABELS[stage]}
                      <span className="sr-only">{current ? " (current)" : done ? " (done)" : " (to do)"}</span>
                      {current ? (
                        <span className="mt-0.5 block text-sm font-normal text-muted">{STAGE_HINTS[stage]}</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="rounded-[10px] bg-signal-soft px-4 py-3 shadow-[inset_3px_0_0_var(--color-signal)]">
              <p className="label-caps text-ink">Next action</p>
              <p className="mt-1 text-[15px] text-ink">{nextActions(selected)}</p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button className="btn-primary" onClick={() => onOpenProvision(selected.tenantId)} type="button">
                Open provision
              </button>
              <button className="btn-secondary" onClick={() => onShadowAdmin(selected.tenantId)} type="button">
                Shadow as admin
              </button>
              <button className="btn-secondary" onClick={() => onShadowSe(selected.tenantId)} type="button">
                Try as SE
              </button>
            </div>
            <button className="link text-sm" onClick={() => onOpenTenant(selected.tenantId)} type="button">
              Full tenant record
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
