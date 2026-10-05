"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CreateTenantModal, type CreateTenantFormValues } from "@/components/platform/create-tenant-modal";
import { PlatformCommercialPanel, PlatformInviteList, PlatformSsoPanel, PlatformWebhooksPanel } from "@/components/platform/platform-tenant-ops-panels";
import { PlatformGlobalAuditPanel } from "@/components/platform/platform-global-audit-panel";
import { PlatformGlobalSearch } from "@/components/platform/platform-global-search";
import { PlatformNowPanel } from "@/components/platform/platform-now-panel";
import { PlatformOnboardingPanel } from "@/components/platform/platform-onboarding-panel";
import { PlatformOperatorDigest } from "@/components/platform/platform-operator-digest";
import { PlatformOperatorSettings } from "@/components/platform/platform-operator-settings";
import { PlatformOverviewPanel } from "@/components/platform/platform-overview-panel";
import { PlatformShadowLog } from "@/components/platform/platform-shadow-log";
import { PlatformSupportQueue } from "@/components/platform/platform-support-queue";
import { PlatformTenantEntitlements } from "@/components/platform/platform-tenant-entitlements";
import { PlatformTenantTable } from "@/components/platform/platform-tenant-table";
import { PlatformUnsavedBanner } from "@/components/platform/platform-unsaved-banner";
import { PlatformUsagePanel } from "@/components/platform/platform-usage-panel";
import { PlatformConfirmDialog } from "@/components/platform/platform-confirm-dialog";
import {
  BTN_ON_BLUE,
  BillingStatusTag,
  FIELD_HINT,
  FIELD_LABEL,
  KpiStrip,
  LineCard,
  Spinner,
  TenantStatusTag,
  formatDateTime,
} from "@/components/platform/platform-ui";
import { ActionBar } from "@/components/ui/action-bar";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import { Textarea } from "@/components/ui/textarea";
import { isFormDirty } from "@/lib/platform/use-dirty-form";
import type { MissionControlBundle } from "@/lib/platform/mission-control-types";
import {
  billingPlanForPreset,
  matchFeatureFlagPreset,
  type FeatureFlagPresetId,
} from "@/lib/platform/flag-presets";
import { PLATFORM_VIEW_PATHS, platformViewFromPath } from "@/lib/platform/platform-routes";
import type { PlatformFeatureFlags } from "@/lib/platform/settings-shared";
import type { SupportRequest, Tenant, TenantAdminInvite, TenantHealth } from "@/lib/tenant/types";

type ConsoleView =
  | "now"
  | "onboarding"
  | "shadow"
  | "overview"
  | "support"
  | "global-audit"
  | "tenant"
  | "usage"
  | "settings";

type TenantTab =
  | "entitlements"
  | "branding"
  | "provision"
  | "support"
  | "notes"
  | "audit"
  | "commercial"
  | "sso"
  | "webhooks";

type TenantDetail = {
  settings: { featureFlags: PlatformFeatureFlags; sessionIdleMinutes: number; updatedAt: string | null };
  usage: { activeUsers: number; aiCalls: number; simulationSessions: number };
};

type OverviewData = {
  summary: { tenantCount: number; totalOpenTickets: number; tenantsNeedingAttention: number };
  health: TenantHealth[];
  recentTickets: SupportRequest[];
};

const CONSOLE_VIEWS: ConsoleView[] = [
  "now",
  "onboarding",
  "shadow",
  "overview",
  "support",
  "global-audit",
  "tenant",
  "usage",
  "settings",
];

const TENANT_TABS: TenantTab[] = [
  "entitlements",
  "branding",
  "provision",
  "commercial",
  "sso",
  "webhooks",
  "support",
  "notes",
  "audit",
];

function parseConsoleView(value: string | null): ConsoleView {
  if (value && CONSOLE_VIEWS.includes(value as ConsoleView)) {
    return value as ConsoleView;
  }
  return "now";
}

export function PlatformConsole() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The route decides the view; `?view=` is only read for legacy URLs that have not redirected yet.
  const consoleView: ConsoleView =
    platformViewFromPath(pathname) ?? parseConsoleView(searchParams.get("view"));

  const replaceConsoleUrl = useCallback(
    (next: { view?: ConsoleView; tenant?: string | null; tab?: TenantTab | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("view");
      const path = next.view ? PLATFORM_VIEW_PATHS[next.view] : pathname;
      if (next.tenant === null) {
        params.delete("tenant");
      } else if (next.tenant) {
        params.set("tenant", next.tenant);
      }
      if (next.tab === null) {
        params.delete("tab");
      } else if (next.tab) {
        params.set("tab", next.tab);
      }
      const query = params.toString();
      router.replace(query ? `${path}?${query}` : path, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setConsoleView = useCallback(
    (view: ConsoleView) => {
      replaceConsoleUrl({ view });
    },
    [replaceConsoleUrl],
  );

  const selectedId = searchParams.get("tenant");
  const tabParam = searchParams.get("tab");
  const tab: TenantTab =
    tabParam && TENANT_TABS.includes(tabParam as TenantTab) ? (tabParam as TenantTab) : "entitlements";

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [invites, setInvites] = useState<TenantAdminInvite[]>([]);
  const [featureFlags, setFeatureFlags] = useState<PlatformFeatureFlags>({});
  const [savedFlags, setSavedFlags] = useState<PlatformFeatureFlags>({});
  const emptyBranding = {
    primaryColor: "#0033A1",
    logoUrl: "",
    welcomeMessage: "",
    allowedEmailDomains: "",
  };
  const [branding, setBranding] = useState(emptyBranding);
  const [savedBranding, setSavedBranding] = useState(emptyBranding);
  const [operatorNotes, setOperatorNotes] = useState("");
  const [savedOperatorNotes, setSavedOperatorNotes] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [statusConfirm, setStatusConfirm] = useState<"active" | "suspended" | null>(null);
  const [offboardConfirm, setOffboardConfirm] = useState(false);
  const [offboarding, setOffboarding] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mission, setMission] = useState<MissionControlBundle | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [missionLoading, setMissionLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [shadowing, setShadowing] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  /** Unsaved edits inside the commercial / SSO panels, which own their own form state. */
  const [childDirty, setChildDirty] = useState(false);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/platform/tenants");
    setLoading(false);
    if (!response.ok) {
      toast.error("Could not load tenants.");
      return;
    }
    const body = (await response.json()) as { tenants: Tenant[] };
    setTenants(body.tenants ?? []);
  }, []);

  const loadMission = useCallback(async () => {
    setMissionLoading(true);
    const response = await fetch("/api/platform/mission-control");
    setMissionLoading(false);
    if (!response.ok) {
      toast.error("Could not load mission control.");
      return;
    }
    const body = (await response.json()) as MissionControlBundle;
    setMission(body);
    setOverview({
      summary: {
        tenantCount: body.now.summary.tenantCount,
        totalOpenTickets: body.now.summary.openTickets,
        tenantsNeedingAttention: body.now.summary.tenantsNeedingAttention,
      },
      health: body.health,
      recentTickets: body.now.criticalTickets,
    });
  }, []);

  const loadDetail = useCallback(async (tenantId: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const [settingsRes, tenantRes] = await Promise.all([
        fetch(`/api/platform/tenants/${tenantId}/settings`),
        fetch(`/api/platform/tenants/${tenantId}`),
      ]);

      if (!settingsRes.ok) {
        toast.error("Could not load tenant settings.");
        return;
      }

      const settingsBody = (await settingsRes.json()) as TenantDetail;
      setDetail(settingsBody);
      setFeatureFlags(settingsBody.settings.featureFlags);
      setSavedFlags(settingsBody.settings.featureFlags);

      if (tenantRes.ok) {
        const tenantBody = (await tenantRes.json()) as {
          tenant: Tenant;
          invites: TenantAdminInvite[];
        };
        setSelectedTenant(tenantBody.tenant);
        setInvites(tenantBody.invites ?? []);
        const loadedBranding = {
          primaryColor: tenantBody.tenant.branding.primaryColor,
          logoUrl: tenantBody.tenant.branding.logoUrl ?? "",
          welcomeMessage: tenantBody.tenant.branding.welcomeMessage ?? "",
          allowedEmailDomains: tenantBody.tenant.branding.allowedEmailDomains.join(", "),
        };
        setBranding(loadedBranding);
        setSavedBranding(loadedBranding);
        setOperatorNotes(tenantBody.tenant.operatorNotes ?? "");
        setSavedOperatorNotes(tenantBody.tenant.operatorNotes ?? "");
        setMaintenanceMessage(tenantBody.tenant.maintenanceMessage ?? "");
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTenants();
    void loadMission();
  }, [loadTenants, loadMission]);

  useEffect(() => {
    if (selectedId && consoleView === "tenant") void loadDetail(selectedId);
    if (!selectedId) {
      setDetail(null);
      setSelectedTenant(null);
    }
  }, [selectedId, consoleView, loadDetail]);

  function openTenant(tenantId: string, options?: { tab?: TenantTab; view?: ConsoleView }) {
    replaceConsoleUrl({
      view: options?.view ?? "tenant",
      tenant: tenantId,
      tab: options?.tab ?? "entitlements",
    });
  }

  function selectOnboardingTenant(tenantId: string) {
    replaceConsoleUrl({ view: "onboarding", tenant: tenantId, tab: null });
  }

  function setTenantTab(next: TenantTab) {
    replaceConsoleUrl({ tab: next, tenant: selectedId, view: "tenant" });
  }

  async function handleCreateTenant(values: CreateTenantFormValues) {
    setCreating(true);
    const response = await fetch("/api/platform/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        slug: values.slug,
        adminEmail: values.adminEmail || undefined,
        adminFullName: values.adminFullName || undefined,
        sendAdminInvite: values.sendAdminInvite,
        branding: {
          primaryColor: values.primaryColor,
          logoUrl: values.logoUrl || null,
          welcomeMessage: values.welcomeMessage || null,
          allowedEmailDomains: values.allowedEmailDomains
            .split(",")
            .map((domain) => domain.trim().toLowerCase())
            .filter(Boolean),
        },
      }),
    });
    setCreating(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Could not create tenant.");
      return;
    }
    const body = (await response.json()) as { tenant: Tenant; inviteSent: boolean };
    toast.success(
      body.inviteSent
        ? `Tenant ${body.tenant.name} created and admin invite sent.`
        : `Tenant ${body.tenant.name} created.`,
    );
    setCreateModalOpen(false);
    openTenant(body.tenant.id);
    await Promise.all([loadTenants(), loadMission()]);
  }

  async function handleBulkAction(action: "suspend" | "activate" | "apply_preset", presetId?: string) {
    if (bulkSelected.length === 0) {
      toast.error("Select at least one tenant.");
      return;
    }
    const response = await fetch("/api/platform/tenants/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantIds: bulkSelected, action, presetId }),
    });
    if (!response.ok) {
      toast.error("Bulk action failed.");
      return;
    }
    toast.success("Bulk action completed.");
    setBulkSelected([]);
    await Promise.all([loadTenants(), loadMission()]);
  }

  async function handleMaintenanceToggle(enabled: boolean) {
    if (!selectedId) return;
    setSaving(true);
    const response = await fetch(`/api/platform/tenants/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maintenanceMode: enabled,
        maintenanceMessage: maintenanceMessage.trim() || null,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not update maintenance mode.");
      return;
    }
    toast.success(enabled ? "Maintenance mode enabled." : "Maintenance mode disabled.");
    await Promise.all([loadTenants(), loadMission(), loadDetail(selectedId)]);
  }

  async function shadowTenantById(tenantId: string, mode: "admin" | "manager" | "se" = "admin") {
    setShadowing(true);
    const response = await fetch("/api/platform/shadow", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: JSON.stringify({ tenantId, mode }),
    });
    setShadowing(false);
    if (!response.ok) {
      toast.error("Could not start shadow mode.");
      return;
    }
    const body = (await response.json()) as { redirect?: string };
    router.push(body.redirect ?? (mode === "se" ? "/dashboard" : "/admin"));
    router.refresh();
  }

  function handleApplyPackage(presetId: FeatureFlagPresetId, flags: PlatformFeatureFlags) {
    setFeatureFlags(flags);
    const plan = billingPlanForPreset(presetId);
    setTenants((current) =>
      current.map((tenant) =>
        tenant.id === selectedId ? { ...tenant, billingPlan: plan } : tenant,
      ),
    );
  }

  async function handleSaveFlags() {
    if (!selectedId) return;
    setSaving(true);
    const packageId = matchFeatureFlagPreset(featureFlags);
    const billingPlan = packageId === "custom" ? undefined : billingPlanForPreset(packageId);

    const response = await fetch(`/api/platform/tenants/${selectedId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureFlags }),
    });
    if (!response.ok) {
      setSaving(false);
      toast.error("Could not save feature flags.");
      return;
    }

    if (billingPlan) {
      const commercial = await fetch(`/api/platform/tenants/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commercial: { billingPlan } }),
      });
      if (!commercial.ok) {
        setSaving(false);
        toast.error("Flags saved, but commercial plan sync failed.");
        setSavedFlags(featureFlags);
        void loadDetail(selectedId);
        void loadMission();
        return;
      }
    }

    setSaving(false);
    toast.success(
      billingPlan
        ? `Entitlements saved · plan set to ${billingPlan}.`
        : "Entitlements saved (custom package — plan unchanged).",
    );
    setSavedFlags(featureFlags);
    void loadTenants();
    void loadDetail(selectedId);
    void loadMission();
  }

  async function handleSaveBranding() {
    if (!selectedId) return;
    setSaving(true);
    const response = await fetch(`/api/platform/tenants/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branding: {
          primaryColor: branding.primaryColor,
          logoUrl: branding.logoUrl.trim() || null,
          welcomeMessage: branding.welcomeMessage.trim() || null,
          allowedEmailDomains: branding.allowedEmailDomains
            .split(",")
            .map((domain) => domain.trim().toLowerCase())
            .filter(Boolean),
        },
      }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not save branding.");
      return;
    }
    toast.success("Tenant branding saved.");
    setSavedBranding(branding);
    void loadDetail(selectedId);
  }

  async function handleSaveOperatorNotes() {
    if (!selectedId) return;
    setSaving(true);
    const response = await fetch(`/api/platform/tenants/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorNotes: operatorNotes.trim() || null }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not save operator notes.");
      return;
    }
    toast.success("Operator notes saved.");
    setSavedOperatorNotes(operatorNotes);
    void loadDetail(selectedId);
  }

  async function handleStatusChange(next: "active" | "suspended") {
    if (!selectedId || !selected) return;
    const label = next === "suspended" ? "suspend" : "reactivate";
    setStatusUpdating(true);
    const response = await fetch(`/api/platform/tenants/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setStatusUpdating(false);
    setStatusConfirm(null);
    if (!response.ok) {
      toast.error(`Could not ${label} tenant.`);
      return;
    }
    toast.success(next === "suspended" ? "Tenant suspended." : "Tenant reactivated.");
    await Promise.all([loadTenants(), loadMission(), loadDetail(selectedId)]);
  }

  async function handleOffboard() {
    if (!selectedId) return;
    setOffboarding(true);
    const response = await fetch(`/api/platform/tenants/${selectedId}`, {
      method: "DELETE",
      headers: { "x-requested-with": "XMLHttpRequest" },
    });
    setOffboarding(false);
    setOffboardConfirm(false);
    if (!response.ok) {
      toast.error("Could not offboard tenant.");
      return;
    }
    toast.success("Tenant offboarded.");
    await Promise.all([loadTenants(), loadMission(), loadDetail(selectedId)]);
  }

  async function handleInviteAdmin() {
    if (!selectedId || !inviteEmail.trim() || !inviteName.trim()) {
      toast.error("Email and name are required.");
      return;
    }
    setInviting(true);
    const response = await fetch(`/api/platform/tenants/${selectedId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), fullName: inviteName.trim(), sendInvite: true }),
    });
    setInviting(false);
    if (!response.ok) {
      toast.error("Could not invite tenant admin.");
      return;
    }
    toast.success("Tenant admin invited.");
    setInviteEmail("");
    setInviteName("");
    void loadDetail(selectedId);
    void loadMission();
  }

  async function handleShadowTenant(mode: "admin" | "manager" | "se") {
    if (!selectedId || !selected) return;
    setShadowing(true);
    const response = await fetch("/api/platform/shadow", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: JSON.stringify({ tenantId: selectedId, mode }),
    });
    setShadowing(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Could not open tenant workspace.");
      return;
    }

    const body = (await response.json()) as { redirect?: string; tenantName?: string; mode?: string };
    const label =
      mode === "admin" ? "Tenant Admin" : mode === "manager" ? "Manager" : "Sales engineer";
    toast.success(`Opened ${label} for ${body.tenantName ?? selected.name}.`);
    router.push(
      body.redirect ??
        (mode === "se" ? "/dashboard" : mode === "manager" ? "/manager" : "/admin"),
    );
    router.refresh();
  }

  const selected = tenants.find((tenant) => tenant.id === selectedId) ?? selectedTenant;

  const tenantTabs: { id: TenantTab; label: string }[] = [
    { id: "entitlements", label: "Entitlements" },
    { id: "branding", label: "Branding" },
    { id: "provision", label: "Provision" },
    { id: "commercial", label: "Commercial" },
    { id: "sso", label: "SSO" },
    { id: "webhooks", label: "Webhooks" },
    { id: "support", label: "Support" },
    { id: "notes", label: "Notes" },
    { id: "audit", label: "Audit" },
  ];

  const brandingDirty = isFormDirty(branding, savedBranding);
  const notesDirty = isFormDirty(operatorNotes, savedOperatorNotes);
  const flagsDirty = JSON.stringify(featureFlags) !== JSON.stringify(savedFlags);
  const showDetail = consoleView === "tenant" && Boolean(selected && detail);
  // The unsaved bar carries the view's one primary; the header primary steps down while it shows.
  const tabDirty =
    showDetail &&
    ((tab === "entitlements" && flagsDirty) ||
      (tab === "branding" && brandingDirty) ||
      (tab === "notes" && notesDirty) ||
      ((tab === "commercial" || tab === "sso") && childDirty));

  const closeCreate = useCallback(() => setCreateModalOpen(false), []);

  if (loading && tenants.length === 0) {
    return <Spinner label="Loading console" />;
  }

  const search = (
    <PlatformGlobalSearch onSelectTenant={openTenant} onSelectTicket={() => setConsoleView("support")} />
  );
  const activeCount = tenants.filter((t) => t.status === "active").length;
  const shadowBlocked = !selected || selected.status === "suspended" || selected.status === "offboarded";

  let header: { eyebrow?: string; title: React.ReactNode; actions?: React.ReactNode };
  switch (consoleView) {
    case "now":
      header = { eyebrow: "Platform · mission control", title: "Now", actions: search };
      break;
    case "onboarding":
      header = {
        eyebrow: mission
          ? `${mission.onboarding.filter((e) => e.stage !== "first_activity").length} tenants still onboarding`
          : "Tenants",
        title: "Onboarding",
        actions: search,
      };
      break;
    case "shadow":
      header = {
        eyebrow: mission ? `${mission.shadowSessions.length} sessions` : "Support",
        title: "Shadow log",
        actions: search,
      };
      break;
    case "overview":
      header = { eyebrow: "Tenants", title: "Health", actions: search };
      break;
    case "support":
      header = { eyebrow: "Platform · tickets", title: "Support", actions: search };
      break;
    case "global-audit":
      header = { eyebrow: "Platform ops", title: "Global audit", actions: search };
      break;
    case "usage":
      header = { eyebrow: "Fleet · last 30 days", title: "Usage", actions: search };
      break;
    case "settings":
      header = { eyebrow: "Your operator preferences", title: "Settings", actions: search };
      break;
    case "tenant":
      header =
        showDetail && selected
          ? {
              eyebrow: `Tenants / ${selected.slug}`,
              title: selected.name,
              actions: (
                <>
                  <button
                    className={`${tabDirty ? "btn-secondary" : "btn-primary"} inline-flex items-center gap-2`}
                    disabled={shadowing || shadowBlocked}
                    onClick={() => void handleShadowTenant("admin")}
                    type="button"
                  >
                    {shadowing ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
                    Open tenant admin
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={shadowing || shadowBlocked}
                    onClick={() => void handleShadowTenant("manager")}
                    type="button"
                  >
                    Open as manager
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={shadowing || shadowBlocked}
                    onClick={() => void handleShadowTenant("se")}
                    type="button"
                  >
                    Open as SE
                  </button>
                </>
              ),
            }
          : {
              eyebrow: `${tenants.length} tenants · ${activeCount} active`,
              title: "Tenants",
              actions: (
                <>
                  {search}
                  <button className="btn-primary" onClick={() => setCreateModalOpen(true)} type="button">
                    New tenant
                  </button>
                </>
              ),
            };
      break;
  }

  return (
    <div className="flex min-h-0 flex-col">
      <PageHeader actions={header.actions} eyebrow={header.eyebrow} title={header.title} />

      <div className="min-h-0 flex-1 px-[var(--gutter)] pb-8 pt-2">
        {consoleView === "now" ? (
          <PlatformNowPanel
            data={mission?.now ?? null}
            loading={missionLoading}
            onOpenShadow={() => setConsoleView("shadow")}
            onOpenSupport={() => setConsoleView("support")}
            onSelectTenant={openTenant}
            rail={mission?.digest ? <PlatformOperatorDigest entries={mission.digest} /> : null}
          />
        ) : null}

        {consoleView === "onboarding" ? (
          missionLoading || !mission ? (
            <Spinner label="Loading onboarding" />
          ) : (
            <PlatformOnboardingPanel
              entries={mission.onboarding}
              onOpenProvision={(tenantId) => openTenant(tenantId, { tab: "provision" })}
              onOpenTenant={(tenantId) => openTenant(tenantId, { tab: "entitlements" })}
              onSelectTenant={selectOnboardingTenant}
              onShadowAdmin={(tenantId) => void shadowTenantById(tenantId)}
              onShadowSe={(tenantId) => void shadowTenantById(tenantId, "se")}
              selectedTenantId={selectedId}
            />
          )
        ) : null}

        {consoleView === "shadow" ? (
          mission ? (
            <PlatformShadowLog onSelectTenant={openTenant} sessions={mission.shadowSessions} />
          ) : (
            <Spinner label="Loading shadow log" />
          )
        ) : null}

        {consoleView === "overview" ? (
          <PlatformOverviewPanel
            data={overview}
            healthWithActivity={mission?.health}
            loading={missionLoading}
            onOpenSupport={() => setConsoleView("support")}
            onSelectTenant={openTenant}
          />
        ) : null}

        {consoleView === "support" ? (
          <PlatformSupportQueue
            onSelectTenant={openTenant}
            onShadowTenant={(tenantId) => void shadowTenantById(tenantId)}
            operators={mission?.operators ?? []}
          />
        ) : null}

        {consoleView === "global-audit" ? <PlatformGlobalAuditPanel /> : null}

        {consoleView === "usage" ? <PlatformUsagePanel onSelectTenant={(id) => openTenant(id)} /> : null}

        {consoleView === "settings" ? <PlatformOperatorSettings /> : null}

        {consoleView === "tenant" && !selectedId && !detailLoading ? (
          <div className="space-y-6">
            <KpiStrip
              items={[
                { label: "Tenants", value: tenants.length },
                { label: "Active", value: activeCount },
                {
                  label: "Need attention",
                  value: overview?.summary.tenantsNeedingAttention ?? "—",
                  tone: (overview?.summary.tenantsNeedingAttention ?? 0) > 0 ? "danger" : "blue",
                },
                { label: "Open tickets", value: overview?.summary.totalOpenTickets ?? "—" },
              ]}
            />

            <PlatformTenantTable
              bulkSelected={bulkSelected}
              onOpenTenant={(tenantId) => openTenant(tenantId, { tab })}
              onToggleBulkSelect={(tenantId, checked) =>
                setBulkSelected((current) =>
                  checked ? [...current, tenantId] : current.filter((id) => id !== tenantId),
                )
              }
              tenants={tenants}
            />

            {bulkSelected.length > 0 ? (
              <div className="sticky bottom-0 z-10 -mx-[var(--gutter)]">
                <ActionBar
                  count={`${bulkSelected.length} selected`}
                  primary={
                    <div className="flex flex-wrap gap-2">
                      <button className={BTN_ON_BLUE} onClick={() => void handleBulkAction("suspend")} type="button">
                        Suspend
                      </button>
                      <button className={BTN_ON_BLUE} onClick={() => void handleBulkAction("activate")} type="button">
                        Activate
                      </button>
                      <button
                        className={BTN_ON_BLUE}
                        onClick={() => void handleBulkAction("apply_preset", "ae-pilot")}
                        type="button"
                      >
                        Apply AE pilot package
                      </button>
                    </div>
                  }
                  secondary={
                    <button
                      className="text-sm font-bold text-white underline decoration-on-blue-muted decoration-2 underline-offset-[3px] hover:decoration-white"
                      onClick={() => setBulkSelected([])}
                      type="button"
                    >
                      Clear
                    </button>
                  }
                  summary="Bulk tenant actions"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {consoleView === "tenant" && selectedId && detailLoading ? (
          <Spinner label="Loading tenant" />
        ) : null}

        {showDetail && selected && detail ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <TenantStatusTag status={selected.status} />
                {selected.billingStatus ? <BillingStatusTag status={selected.billingStatus} /> : null}
                {selected.seatQuota != null ? (
                  <Tag>
                    {detail.usage.activeUsers}/{selected.seatQuota} seats
                  </Tag>
                ) : null}
                {selected.maintenanceMode ? <Tag tone="warning">▲ Maintenance</Tag> : null}
                {detail.settings.updatedAt ? (
                  <span className="font-mono text-xs text-muted">
                    SETTINGS UPDATED {formatDateTime(detail.settings.updatedAt).toUpperCase()}
                  </span>
                ) : null}
              </div>
              <button
                className="link inline-flex items-center gap-1 text-sm"
                onClick={() => replaceConsoleUrl({ view: "tenant", tenant: null, tab: null })}
                type="button"
              >
                <ArrowLeft aria-hidden className="h-4 w-4" />
                All tenants
              </button>
            </div>

            <KpiStrip
              items={[
                { label: "Users", value: detail.usage.activeUsers },
                { label: "AI calls 30d", value: detail.usage.aiCalls },
                { label: "Sim sessions 30d", value: detail.usage.simulationSessions },
              ]}
            />

            <LineCard meta="Access for everyone in this tenant" title="Status and maintenance">
              <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <label className={FIELD_LABEL} htmlFor="platform-maintenance-message">
                    Maintenance message
                  </label>
                  <Input
                    id="platform-maintenance-message"
                    onChange={(event) => setMaintenanceMessage(event.target.value)}
                    placeholder="Shown to users while maintenance is on (optional)"
                    value={maintenanceMessage}
                  />
                  <p className={FIELD_HINT}>
                    Maintenance is {selected.maintenanceMode ? "on" : "off"}. The message is saved when you switch it.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    className="btn-secondary"
                    disabled={saving}
                    onClick={() => void handleMaintenanceToggle(!selected.maintenanceMode)}
                    type="button"
                  >
                    {selected.maintenanceMode ? "End maintenance" : "Start maintenance"}
                  </button>
                  {selected.status === "offboarded" ? null : selected.status === "suspended" ? (
                    <button
                      className="btn-secondary"
                      disabled={statusUpdating}
                      onClick={() => setStatusConfirm("active")}
                      type="button"
                    >
                      Reactivate
                    </button>
                  ) : (
                    <button
                      className="btn-secondary"
                      disabled={statusUpdating || selected.status === "provisioning"}
                      onClick={() => setStatusConfirm("suspended")}
                      type="button"
                    >
                      Suspend
                    </button>
                  )}
                  {selected.status !== "offboarded" ? (
                    <button
                      className="rounded-full border-[1.5px] border-danger px-[18px] py-[9px] text-sm font-bold text-danger hover:bg-danger-soft disabled:opacity-60"
                      disabled={offboarding}
                      onClick={() => setOffboardConfirm(true)}
                      type="button"
                    >
                      Offboard
                    </button>
                  ) : null}
                </div>
              </div>
            </LineCard>

            <div aria-label="Tenant sections" className="flex flex-wrap gap-1.5" role="group">
              {tenantTabs.map((item) => (
                <Chip active={tab === item.id} key={item.id} onClick={() => setTenantTab(item.id)}>
                  {item.label}
                </Chip>
              ))}
            </div>

            {tab === "entitlements" ? (
              <PlatformTenantEntitlements
                billingPlan={selected?.billingPlan}
                featureFlags={featureFlags}
                onApplyPackage={handleApplyPackage}
                onChange={setFeatureFlags}
                onDiscard={() => {
                  setFeatureFlags(savedFlags);
                  // Applying a package optimistically set the tenant's plan; reload to put it back.
                  void loadTenants();
                }}
                onSave={() => void handleSaveFlags()}
                savedFlags={savedFlags}
                saving={saving}
              />
            ) : null}

            {tab === "branding" ? (
              <div>
                <LineCard meta="Tenant look and allowed sign-in domains" title="Branding and access">
                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <div>
                      <label className={FIELD_LABEL} htmlFor="platform-branding-color">
                        Primary colour
                      </label>
                      <Input
                        className="font-mono text-sm"
                        id="platform-branding-color"
                        onChange={(event) =>
                          setBranding((current) => ({ ...current, primaryColor: event.target.value }))
                        }
                        value={branding.primaryColor}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL} htmlFor="platform-branding-logo">
                        Logo URL
                      </label>
                      <Input
                        id="platform-branding-logo"
                        onChange={(event) => setBranding((current) => ({ ...current, logoUrl: event.target.value }))}
                        placeholder="https://…"
                        value={branding.logoUrl}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={FIELD_LABEL} htmlFor="platform-branding-welcome">
                        Welcome message
                      </label>
                      <Textarea
                        className="min-h-[88px]"
                        id="platform-branding-welcome"
                        onChange={(event) =>
                          setBranding((current) => ({ ...current, welcomeMessage: event.target.value }))
                        }
                        value={branding.welcomeMessage}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={FIELD_LABEL} htmlFor="platform-branding-domains">
                        Allowed email domains
                      </label>
                      <Input
                        id="platform-branding-domains"
                        onChange={(event) =>
                          setBranding((current) => ({ ...current, allowedEmailDomains: event.target.value }))
                        }
                        placeholder="acme.com, acme.io"
                        value={branding.allowedEmailDomains}
                      />
                      <p className={FIELD_HINT}>Comma-separated.</p>
                    </div>
                  </div>
                </LineCard>
                <PlatformUnsavedBanner
                  count={
                    (Object.keys(branding) as (keyof typeof branding)[]).filter(
                      (key) => branding[key] !== savedBranding[key],
                    ).length
                  }
                  onDiscard={() => setBranding(savedBranding)}
                  onSave={() => void handleSaveBranding()}
                  saveLabel="Save branding"
                  saving={saving}
                  show={brandingDirty}
                  summary="Branding and access"
                />
              </div>
            ) : null}

            {tab === "provision" ? (
              <div className="space-y-6">
                <LineCard title="Invite tenant admin">
                  <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                    <div>
                      <label className={FIELD_LABEL} htmlFor="platform-invite-email">
                        Email
                      </label>
                      <Input
                        id="platform-invite-email"
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="admin@tenant.com"
                        type="email"
                        value={inviteEmail}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL} htmlFor="platform-invite-name">
                        Full name
                      </label>
                      <Input
                        id="platform-invite-name"
                        onChange={(event) => setInviteName(event.target.value)}
                        placeholder="Jane Smith"
                        value={inviteName}
                      />
                    </div>
                    <button
                      className="btn-secondary inline-flex h-10 items-center gap-2"
                      disabled={inviting}
                      onClick={() => void handleInviteAdmin()}
                      type="button"
                    >
                      {inviting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
                      Send invite
                    </button>
                  </div>
                </LineCard>
                <LineCard meta={`${invites.length} invites`} title="Invite history">
                  <PlatformInviteList invites={invites} onChanged={() => selectedId && void loadDetail(selectedId)} />
                </LineCard>
              </div>
            ) : null}

            {tab === "commercial" && selected ? (
              <PlatformCommercialPanel
                onDirtyChange={setChildDirty}
                onSaved={(updated) => {
                  setSelectedTenant(updated);
                  setTenants((current) => current.map((t) => (t.id === updated.id ? updated : t)));
                }}
                tenant={selected}
              />
            ) : null}

            {tab === "sso" && selectedId ? <PlatformSsoPanel onDirtyChange={setChildDirty} tenantId={selectedId} /> : null}

            {tab === "webhooks" && selectedId ? <PlatformWebhooksPanel tenantId={selectedId} /> : null}

            {tab === "support" && selectedId ? (
              <PlatformSupportQueue
                onSelectTenant={openTenant}
                onShadowTenant={(tenantId) => void shadowTenantById(tenantId)}
                operators={mission?.operators ?? []}
                tenantId={selectedId}
              />
            ) : null}

            {tab === "notes" ? (
              <div>
                <LineCard meta="Visible only to platform operators" title="Operator notes">
                  <div className="p-5">
                    <label className="sr-only" htmlFor="platform-operator-notes">
                      Operator notes
                    </label>
                    <Textarea
                      className="min-h-[160px]"
                      id="platform-operator-notes"
                      onChange={(event) => setOperatorNotes(event.target.value)}
                      placeholder="Onboarding context, escalation history, contract notes"
                      value={operatorNotes}
                    />
                  </div>
                </LineCard>
                <PlatformUnsavedBanner
                  onDiscard={() => setOperatorNotes(savedOperatorNotes)}
                  onSave={() => void handleSaveOperatorNotes()}
                  saveLabel="Save notes"
                  saving={saving}
                  show={notesDirty}
                  summary="Operator notes"
                />
              </div>
            ) : null}

            {tab === "audit" && selectedId ? <PlatformGlobalAuditPanel tenantId={selectedId} /> : null}
          </div>
        ) : null}
      </div>

      <CreateTenantModal creating={creating} onClose={closeCreate} onSubmit={handleCreateTenant} open={createModalOpen} />

      <PlatformConfirmDialog
        busy={statusUpdating}
        confirmLabel={statusConfirm === "suspended" ? "Suspend" : "Reactivate"}
        description={
          statusConfirm === "suspended"
            ? `${selected?.name ?? "This tenant"} and all its users will lose access immediately. You can reactivate later.`
            : `${selected?.name ?? "This tenant"} and its users will regain access immediately.`
        }
        destructive={statusConfirm === "suspended"}
        onCancel={() => setStatusConfirm(null)}
        onConfirm={() => statusConfirm && void handleStatusChange(statusConfirm)}
        open={statusConfirm != null}
        title={statusConfirm === "suspended" ? "Suspend this tenant?" : "Reactivate this tenant?"}
      />

      <PlatformConfirmDialog
        busy={offboarding}
        confirmLabel="Offboard"
        description={`This deactivates ${selected?.name ?? "this tenant"} and marks it offboarded. It is not a suspend, and not something you'd casually undo. All its users lose access immediately.`}
        destructive
        onCancel={() => setOffboardConfirm(false)}
        onConfirm={() => void handleOffboard()}
        open={offboardConfirm}
        title={`Offboard ${selected?.name ?? "this tenant"}?`}
      />
    </div>
  );
}
