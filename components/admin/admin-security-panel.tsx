"use client";

import { useEffect, useState } from "react";
import { EmptyState, LineCard, LoadingState, Mono, Notice } from "@/components/admin/admin-ui";
import { Tag } from "@/components/ui/tag";
import type { AdminSecurityData } from "@/app/api/admin/security/route";

/**
 * Tenant-admin-facing security posture view. Deliberately scoped to what's
 * actually derivable today (SSO config, recent admin actions, activity-based
 * inactivity) — MFA adoption isn't tracked anywhere in this app's own tables
 * (it lives only in Supabase Auth admin APIs) so it's explicitly left out
 * rather than faked.
 */
export function AdminSecurityPanel() {
  const [data, setData] = useState<AdminSecurityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/admin/security")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => setData(body as AdminSecurityData | null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState label="Loading security posture…" />;
  }

  if (!data) {
    return <Notice className="border-danger bg-danger-soft text-danger">Could not load security data.</Notice>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <LineCard title="Single sign-on">
          {data.sso?.enabled ? (
            <div className="flex flex-col gap-2">
              <div>
                <Tag tone="success">✓ Enabled · {data.sso.provider?.toUpperCase()}</Tag>
              </div>
              <p className="text-sm text-ink-2">
                {data.sso.ssoDomain ? `Enforced for @${data.sso.ssoDomain}` : "No domain restriction set."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div>
                <Tag tone="warning">▲ Not enabled</Tag>
              </div>
              <p className="text-sm text-ink-2">
                Users are authenticating with email/password only. SSO configuration is managed by your platform
                operator.
              </p>
            </div>
          )}
        </LineCard>

        <LineCard title="Dormant accounts">
          <p
            className={
              data.inactiveAccounts.length > 0
                ? "text-4xl leading-none font-extrabold tracking-[-0.03em] text-danger"
                : "text-4xl leading-none font-extrabold tracking-[-0.03em] text-blue"
            }
          >
            {data.inactiveAccounts.length}
          </p>
          <p className="mt-2 text-sm text-ink-2">
            No recorded activity in the last {data.inactiveThresholdDays} days — not a login-based signal, this
            counts accounts with no entries in the activity feed. Worth a periodic access review.
          </p>
        </LineCard>
      </div>

      {data.inactiveAccounts.length > 0 ? (
        <LineCard bodyClassName="p-0" meta={`${data.inactiveAccounts.length}`} title="Accounts with no recent activity">
          <ul>
            {data.inactiveAccounts.map((account) => (
              <li
                className="flex items-center justify-between gap-4 border-b border-divider px-5 py-3 last:border-b-0"
                key={account.id}
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-ink">{account.fullName}</p>
                  <p className="truncate text-[13px] text-muted">{account.email}</p>
                </div>
                <Mono>{account.role.replaceAll("_", " ")}</Mono>
              </li>
            ))}
          </ul>
        </LineCard>
      ) : null}

      <LineCard bodyClassName="p-0" title="Recent admin actions">
        {data.recentActions.length === 0 ? (
          <EmptyState>No admin actions recorded yet.</EmptyState>
        ) : (
          <ul>
            {data.recentActions.map((action) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3 last:border-b-0"
                key={action.id}
              >
                <span className="font-mono text-[13px] text-ink">{action.action}</span>
                <Mono className="text-muted">{new Date(action.createdAt).toLocaleString()}</Mono>
              </li>
            ))}
          </ul>
        )}
      </LineCard>
    </div>
  );
}
