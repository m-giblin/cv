"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { AuditLogPanel } from "@/components/admin/audit-log-panel";
import { AdminTab, AdminTabPanel, AdminTabs } from "@/components/admin/admin-tabs";
import { BulkUserImport } from "@/components/admin/bulk-user-import";
import { CompetencyManagement } from "@/components/admin/competency-management";
import { SimulationTemplateManagement } from "@/components/admin/simulation-template-management";
import { ContentAssetManagement } from "@/components/admin/content-asset-management";
import { UserManagement } from "@/components/admin/user-management";
import { PlanManagementPanel } from "@/components/plans/plan-management";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Profile } from "@/lib/types";

export function AdminConsole({
  assignees,
  mentors,
}: {
  assignees: Profile[];
  mentors: Profile[];
}) {
  const [tab, setTab] = useState<AdminTab>("users");

  return (
    <div className="space-y-6">
      <AdminTabs active={tab} onChange={setTab} />

      <AdminTabPanel active={tab} tab="users">
        <div className="space-y-6">
          <UserManagement />
          <BulkUserImport />
        </div>
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="plans">
        <PlanManagementPanel assignees={assignees} mentors={mentors} />
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="competencies">
        <CompetencyManagement />
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="ai">
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-sp-magenta" />
                AI provider settings
              </CardTitle>
              <CardDescription>Set keys in Vercel / `.env.local`. See `docs/DEPLOY.md` for production setup.</CardDescription>
            </CardHeader>
            <div className="space-y-3 text-sm text-sp-navy-muted">
              <p>
                <strong className="text-sp-navy">XAI_API_KEY</strong> or <strong className="text-sp-navy">OPENAI_API_KEY</strong>
              </p>
              <Input defaultValue="grok-3-mini" placeholder="Model name" readOnly />
            </div>
          </Card>

          <SimulationTemplateManagement />
        </section>
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="content">
        <ContentAssetManagement />
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="audit">
        <AuditLogPanel />
      </AdminTabPanel>

      <AdminTabPanel active={tab} tab="analytics">
        <AnalyticsDashboard />
        <p className="mt-4 text-sm">
          <a className="font-semibold text-sp-blue hover:text-sp-blue-deep" href="/api/admin/analytics?format=csv">
            Export analytics CSV
          </a>
        </p>
      </AdminTabPanel>
    </div>
  );
}
