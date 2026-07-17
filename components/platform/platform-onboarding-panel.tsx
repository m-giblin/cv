"use client";

import { GraduationCap, Route, UserCog, UserPlus } from "lucide-react";
import type { OnboardingFunnelEntry, OnboardingStage } from "@/lib/platform/mission-control-types";
import { ONBOARDING_STAGE_LABELS } from "@/lib/platform/mission-control-types";
import { Button } from "@/components/ui/button";

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
  admin_accepted: "Tenant admin signed in — still waiting for SE users.",
  has_users: "Users are in the tenant — waiting for first practice/activity.",
  first_activity: "Onboarding complete — tenant has real activity.",
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
      return "No blockers — monitor Health and Support as usual.";
    default: {
      const _exhaustive: never = entry.stage;
      return _exhaustive;
    }
  }
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
    <div className="space-y-4">
      <p className="text-sm text-[#6B6860]">
        {incomplete.length} tenant{incomplete.length === 1 ? "" : "s"} still onboarding. Click a
        row to work that tenant — no second picker.
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="overflow-x-auto border border-[#E2DFD9] bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E2DFD9] text-xs uppercase tracking-wide text-[#A09D98]">
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Progress</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-[#A09D98]" colSpan={5}>
                    No tenants in the onboarding funnel yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const active = selected?.tenantId === entry.tenantId;
                  return (
                    <tr
                      className={`cursor-pointer border-b border-[#f8fafc] ${
                        active ? "bg-[#F0F7FF]" : "hover:bg-[#F9F8F6]"
                      }`}
                      key={entry.tenantId}
                      onClick={() => onSelectTenant(entry.tenantId)}
                    >
                      <td className="px-4 py-3 font-medium text-[#0D0E12]">{entry.name}</td>
                      <td className="px-4 py-3 text-[#6B6860]">
                        {ONBOARDING_STAGE_LABELS[entry.stage]}
                      </td>
                      <td className="px-4 py-3 text-[#6B6860]">{entry.userCount}</td>
                      <td className="px-4 py-3 text-[#6B6860]">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {STAGES.map((stage, index) => (
                            <span
                              className={`h-2 w-6 rounded-full ${
                                index <= entry.stageIndex ? "bg-[#0071ce]" : "bg-[#E2DFD9]"
                              }`}
                              key={stage}
                              title={ONBOARDING_STAGE_LABELS[stage]}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <aside className="border border-[#E2DFD9] bg-white p-5">
          {!selected ? (
            <p className="text-sm text-[#A09D98]">Select a tenant from the list.</p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#A09D98]">
                  Onboarding detail
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#0D0E12]">{selected.name}</h2>
                <p className="mt-1 text-sm text-[#6B6860]">
                  {selected.slug} · {selected.status} · {ONBOARDING_STAGE_LABELS[selected.stage]}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#A09D98]">
                  Checklist
                </p>
                <ol className="space-y-2">
                  {STAGES.map((stage, index) => {
                    const done = index <= selected.stageIndex;
                    const current = stage === selected.stage;
                    return (
                      <li
                        className={`flex items-start gap-2.5 text-sm ${
                          current ? "font-semibold text-[#0D0E12]" : "text-[#6B6860]"
                        }`}
                        key={stage}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                            done ? "bg-[#0071ce] text-white" : "bg-[#E2DFD9] text-[#A09D98]"
                          }`}
                        >
                          {done ? "✓" : index + 1}
                        </span>
                        <span>
                          {ONBOARDING_STAGE_LABELS[stage]}
                          {current ? (
                            <span className="mt-0.5 block text-xs font-normal text-[#6B6860]">
                              {STAGE_HINTS[stage]}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="border border-[#E2DFD9] bg-[#F9F8F6] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#A09D98]">
                  Next action
                </p>
                <p className="mt-1 text-sm text-[#0D0E12]">{nextActions(selected)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onOpenProvision(selected.tenantId)} type="button">
                  <UserPlus className="h-4 w-4" />
                  Open provision
                </Button>
                <Button
                  onClick={() => onShadowAdmin(selected.tenantId)}
                  type="button"
                  variant="outline"
                >
                  <UserCog className="h-4 w-4" />
                  Shadow as admin
                </Button>
                <Button
                  onClick={() => onShadowSe(selected.tenantId)}
                  type="button"
                  variant="outline"
                >
                  <GraduationCap className="h-4 w-4" />
                  Try as SE
                </Button>
                <Button
                  onClick={() => onOpenTenant(selected.tenantId)}
                  type="button"
                  variant="outline"
                >
                  <Route className="h-4 w-4" />
                  Full tenant record
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
