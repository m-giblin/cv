"use client";

import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
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
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#0071CE]" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-[#6B6860]">Could not load security data.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border border-[#E2DFD9] bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#0071CE]" />
            <h3 className="text-sm font-bold text-[#0D0E12]">Single sign-on</h3>
          </div>
          {data.sso?.enabled ? (
            <div>
              <p className="text-sm font-semibold text-[#0A6E45]">Enabled — {data.sso.provider?.toUpperCase()}</p>
              <p className="mt-1 text-xs text-[#6B6860]">
                {data.sso.ssoDomain ? `Enforced for @${data.sso.ssoDomain}` : "No domain restriction set."}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-[#D4810A]">Not enabled</p>
              <p className="mt-1 text-xs text-[#6B6860]">
                Users are authenticating with email/password only. SSO configuration is managed by your platform
                operator.
              </p>
            </div>
          )}
        </div>

        <div className="border border-[#E2DFD9] bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#D4810A]" />
            <h3 className="text-sm font-bold text-[#0D0E12]">Dormant accounts</h3>
          </div>
          <p className="text-2xl font-bold text-[#0D0E12]">{data.inactiveAccounts.length}</p>
          <p className="mt-1 text-xs text-[#6B6860]">
            No recorded activity in the last {data.inactiveThresholdDays} days — not a login-based signal, this
            counts accounts with no entries in the activity feed. Worth a periodic access review.
          </p>
        </div>
      </div>

      {data.inactiveAccounts.length > 0 ? (
        <div className="border border-[#E2DFD9] bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-[#0D0E12]">Accounts with no recent activity</h3>
          <div className="divide-y divide-[#F0EFEB]">
            {data.inactiveAccounts.map((account) => (
              <div className="flex items-center justify-between py-2 text-sm" key={account.id}>
                <div>
                  <p className="font-medium text-[#0D0E12]">{account.fullName}</p>
                  <p className="text-xs text-[#A09D98]">{account.email}</p>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-wide text-[#6B6860]">{account.role}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border border-[#E2DFD9] bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-[#0D0E12]">Recent admin actions</h3>
        {data.recentActions.length === 0 ? (
          <p className="text-sm text-[#6B6860]">No admin actions recorded yet.</p>
        ) : (
          <div className="divide-y divide-[#F0EFEB]">
            {data.recentActions.map((action) => (
              <div className="flex items-center justify-between py-2 text-sm" key={action.id}>
                <span className="font-mono text-xs text-[#3D3C38]">{action.action}</span>
                <span className="text-xs text-[#A09D98]">{new Date(action.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
