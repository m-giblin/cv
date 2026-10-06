"use client";

import { useEffect, useState } from "react";
import { EmptyState, LineCard, LoadingState, Meta, Notice } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/ui/status-pill";
import type { AdminSecurityData } from "@/app/api/admin/security/route";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = "numeric";
  const day = date.toLocaleDateString("en-US", options);
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

function humanize(value: string) {
  const text = value.replaceAll(/[._:-]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "—";
}

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
    return <Notice className="border-danger bg-danger-soft text-danger" role="alert">
        Security data could not be loaded. Try again in a few minutes.
      </Notice>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <LineCard title="Single sign-on">
          {data.sso?.enabled ? (
            <div className="flex flex-col gap-2">
              <div>
                <StatusPill tone="success">
                  Enabled{data.sso.provider ? ` with ${data.sso.provider.toUpperCase()}` : ""}
                </StatusPill>
              </div>
              <p className="text-sm text-ink-2">
                {data.sso.ssoDomain ? `Enforced for @${data.sso.ssoDomain}.` : "No domain restriction is set."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div>
                <StatusPill tone="warning">Not enabled</StatusPill>
              </div>
              <p className="text-sm text-ink-2">
                Users sign in with email and password only. Your platform operator manages SSO configuration.
              </p>
            </div>
          )}
        </LineCard>

        <LineCard title="Dormant accounts">
          <p
            className={
              data.inactiveAccounts.length > 0
                ? "num text-4xl leading-none font-extrabold tracking-[-0.03em] text-danger"
                : "num text-4xl leading-none font-extrabold tracking-[-0.03em] text-blue"
            }
          >
            {data.inactiveAccounts.length}
          </p>
          <p className="mt-2 text-sm text-ink-2">
            Accounts with no recorded activity in the last {data.inactiveThresholdDays} days. This counts accounts with
            no entries in the activity feed, not sign-ins. Worth a periodic access review.
          </p>
        </LineCard>
      </div>

      {data.inactiveAccounts.length > 0 ? (
        <LineCard bodyClassName="p-0" meta={`${data.inactiveAccounts.length} ${data.inactiveAccounts.length === 1 ? "account" : "accounts"}`} title="Accounts with no recent activity">
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
                <Meta>{humanize(account.role)}</Meta>
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
                <span className="text-sm text-ink" title={action.action}>
                  {humanize(action.action)}
                </span>
                <Meta className="text-muted">{formatDateTime(action.createdAt)}</Meta>
              </li>
            ))}
          </ul>
        )}
      </LineCard>
    </div>
  );
}
