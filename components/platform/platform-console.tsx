"use client";

import {
  Activity,
  Ban,
  CheckCircle,
  Eye,
  GraduationCap,
  Loader2,
  Plus,
  Route,
  Save,
  ScrollText,
  Search,
  Settings,
  Ticket,
  UserCog,
  UserPlus,
  Users,
  Wrench,
  Zap,
  BarChart2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { PlatformUsagePanel } from "@/components/platform/platform-usage-panel";
import { Button } from "@/components/ui/button";
import type { MissionControlBundle } from "@/lib/platform/mission-control-types";
import {
  billingPlanForPreset,
  matchFeatureFlagPreset,
  type FeatureFlagPresetId,
} from "@/lib/platform/flag-presets";
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

const BILLING_STATUS_COLORS: Record<string, string> = {
  trial: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  past_due: "bg-red-100 text-red-800",
  canceled: "bg-neutral-100 text-neutral-600",
  exempt: "bg-sky-100 text-sky-800",
};

export function PlatformConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consoleView = parseConsoleView(searchParams.get("view"));

  const replaceConsoleUrl = useCallback(
    (next: { view?: ConsoleView; tenant?: string | null; tab?: TenantTab | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.view) params.set("view", next.view);
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
      router.replace(`/platform?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
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
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [invites, setInvites] = useState<TenantAdminInvite[]>([]);
  const [featureFlags, setFeatureFlags] = useState<PlatformFeatureFlags>({});
  const [savedFlags, setSavedFlags] = useState<PlatformFeatureFlags>({});
  const [branding, setBranding] = useState({
    primaryColor: "#0071ce",
    logoUrl: "",
    welcomeMessage: "",
    allowedEmailDomains: "",
  });
  const [operatorNotes, setOperatorNotes] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
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

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tenants;
    return tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(query) ||
        tenant.slug.toLowerCase().includes(query) ||
        tenant.status.toLowerCase().includes(query),
    );
  }, [search, tenants]);

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
        setBranding({
          primaryColor: tenantBody.tenant.branding.primaryColor,
          logoUrl: tenantBody.tenant.branding.logoUrl ?? "",
          welcomeMessage: tenantBody.tenant.branding.welcomeMessage ?? "",
          allowedEmailDomains: tenantBody.tenant.branding.allowedEmailDomains.join(", "),
        });
        setOperatorNotes(tenantBody.tenant.operatorNotes ?? "");
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

  // Auto-select first tenant when in tenant view with no selection
  useEffect(() => {
    if (consoleView === "tenant" && !selectedId && !loading && tenants.length > 0) {
      replaceConsoleUrl({ view: "tenant", tenant: tenants[0].id, tab: "entitlements" });
    }
  }, [consoleView, selectedId, loading, tenants, replaceConsoleUrl]);

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
    void loadDetail(selectedId);
  }

  async function handleStatusChange(next: "active" | "suspended") {
    if (!selectedId || !selected) return;
    const label = next === "suspended" ? "suspend" : "reactivate";
    if (!window.confirm(`Are you sure you want to ${label} ${selected.name}?`)) return;
    setStatusUpdating(true);
    const response = await fetch(`/api/platform/tenants/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setStatusUpdating(false);
    if (!response.ok) {
      toast.error(`Could not ${label} tenant.`);
      return;
    }
    toast.success(next === "suspended" ? "Tenant suspended." : "Tenant reactivated.");
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
      mode === "admin" ? "Tenant Admin" : mode === "manager" ? "Manager" : "User";
    toast.success(`Opened ${label} for ${body.tenantName ?? selected.name}.`);
    router.push(
      body.redirect ??
        (mode === "se" ? "/dashboard" : mode === "manager" ? "/manager?section=command" : "/admin"),
    );
    router.refresh();
  }

  const selected = tenants.find((tenant) => tenant.id === selectedId) ?? selectedTenant;

  const topNav: { id: ConsoleView; label: string; icon: React.ReactNode }[] = [
    { id: "now", label: "Now", icon: <Zap className="h-3.5 w-3.5" /> },
    { id: "onboarding", label: "Onboarding", icon: <Route className="h-3.5 w-3.5" /> },
    { id: "support", label: "Support", icon: <Ticket className="h-3.5 w-3.5" /> },
    { id: "shadow", label: "Shadow", icon: <Eye className="h-3.5 w-3.5" /> },
    { id: "overview", label: "Health", icon: <Activity className="h-3.5 w-3.5" /> },
    { id: "usage", label: "Usage", icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { id: "tenant", label: "Tenants", icon: <UserCog className="h-3.5 w-3.5" /> },
    { id: "global-audit", label: "Audit", icon: <ScrollText className="h-3.5 w-3.5" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-3.5 w-3.5" /> },
  ];

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

  if (loading && tenants.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-[#0071ce]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      {/* Compact console header */}
      <div className="flex items-center justify-between border-b border-[#E2DFD9] bg-[#00143a] px-4 py-2">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-sm font-bold tracking-tight text-white">Platform console</span>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[#0071ce]">
            Super Admin
          </span>
        </div>
        <button
          className="flex items-center gap-1.5 rounded border border-[#0033a1] bg-[#0033a1] px-2 py-1 text-xs font-medium text-white hover:bg-[#0071ce] transition"
          onClick={() => setCreateModalOpen(true)}
          type="button"
        >
          <Plus className="h-3 w-3" />
          New tenant
        </button>
      </div>

      {/* Slim toolbar: search + underline tabs */}
      <div className="flex items-stretch border-b border-[#E2DFD9] bg-white">
        <div className="flex items-center border-r border-[#E2DFD9] px-2">
          <PlatformGlobalSearch
            onSelectTenant={openTenant}
            onSelectTicket={() => setConsoleView("support")}
          />
        </div>
        <nav className="flex min-w-0 flex-1 overflow-x-auto" aria-label="Console navigation">
          {topNav.map((item) => (
            <button
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                consoleView === item.id
                  ? "border-[#0071ce] text-[#0033a1]"
                  : "border-transparent text-[#6B6860] hover:border-[#C9C7C2] hover:text-[#3D3C38]"
              }`}
              key={item.id}
              onClick={() => setConsoleView(item.id)}
              type="button"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="min-h-0 flex-1 p-4">
        {consoleView === "now" ? (
          <div className="space-y-4">
            <PlatformNowPanel
              data={mission?.now ?? null}
              loading={missionLoading}
              onOpenShadow={() => setConsoleView("shadow")}
              onOpenSupport={() => setConsoleView("support")}
              onSelectTenant={openTenant}
            />
            {mission?.digest ? <PlatformOperatorDigest entries={mission.digest} /> : null}
          </div>
        ) : null}

        {consoleView === "onboarding" ? (
          missionLoading || !mission ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-[#0071ce]" />
            </div>
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

        {consoleView === "shadow" && mission ? (
          <PlatformShadowLog onSelectTenant={openTenant} sessions={mission.shadowSessions} />
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

        {consoleView === "usage" ? (
          <PlatformUsagePanel onSelectTenant={(id) => openTenant(id)} />
        ) : null}

        {consoleView === "settings" ? <PlatformOperatorSettings /> : null}

        {consoleView === "tenant" ? (
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* Tenant list sidebar */}
            <aside className="flex flex-col gap-0 border border-[#E2DFD9] bg-white">
              {/* Sidebar header with counts */}
              <div className="flex items-center justify-between border-b border-[#E2DFD9] px-3 py-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6860]">
                  {tenants.length} tenant{tenants.length === 1 ? "" : "s"}
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#A09D98]" />
                  <input
                    className="w-36 border border-[#E2DFD9] py-1 pl-6 pr-2 text-xs"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Filter…"
                    value={search}
                  />
                </div>
              </div>

              {/* Tenant rows */}
              <div className="flex-1 overflow-y-auto">
                {filteredTenants.map((tenant) => {
                  const isSelected = tenant.id === selectedId;
                  return (
                    <div
                      className={`flex items-center gap-1.5 border-b border-[#F0EFEB] px-2 py-0 transition ${
                        isSelected ? "bg-[#00143a]" : "hover:bg-[#F0F7FF]"
                      }`}
                      key={tenant.id}
                    >
                      <input
                        checked={bulkSelected.includes(tenant.id)}
                        className="shrink-0"
                        onChange={(event) =>
                          setBulkSelected((current) =>
                            event.target.checked
                              ? [...current, tenant.id]
                              : current.filter((id) => id !== tenant.id),
                          )
                        }
                        type="checkbox"
                      />
                      <button
                        className="flex-1 py-2 text-left"
                        onClick={() => openTenant(tenant.id, { tab })}
                        type="button"
                      >
                        <p className={`text-xs font-semibold leading-tight ${isSelected ? "text-white" : "text-[#0D0E12]"}`}>
                          {tenant.name}
                        </p>
                        <p className={`mt-0.5 font-mono text-[10px] leading-tight ${isSelected ? "text-white/60" : "text-[#A09D98]"}`}>
                          {tenant.slug}
                          {" · "}
                          <span className={
                            tenant.status === "suspended"
                              ? isSelected ? "text-red-300" : "text-red-600"
                              : tenant.status === "provisioning"
                                ? isSelected ? "text-amber-300" : "text-amber-600"
                                : ""
                          }>
                            {tenant.status}
                          </span>
                          {tenant.billingStatus && tenant.billingStatus !== "active"
                            ? ` · ${tenant.billingStatus}`
                            : ""}
                          {tenant.maintenanceMode ? " · maint" : ""}
                        </p>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bulk actions */}
              {bulkSelected.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 border-t border-[#E2DFD9] p-2">
                  <Button onClick={() => void handleBulkAction("suspend")} size="sm" type="button" variant="outline">
                    Suspend ({bulkSelected.length})
                  </Button>
                  <Button onClick={() => void handleBulkAction("activate")} size="sm" type="button" variant="outline">
                    Activate
                  </Button>
                  <Button
                    onClick={() => void handleBulkAction("apply_preset", "ae-pilot")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    AE pilot
                  </Button>
                </div>
              ) : null}
            </aside>

            <CreateTenantModal
              creating={creating}
              onClose={() => setCreateModalOpen(false)}
              onSubmit={handleCreateTenant}
              open={createModalOpen}
            />

            {/* Tenant detail */}
            <section className="min-w-0 space-y-3">
              {/* Fleet summary strip — shown when no tenant selected */}
              {!selectedId && !detailLoading ? (
                <div className="space-y-3">
                  {/* KPI strip */}
                  <div className="grid gap-px bg-[#E2DFD9] sm:grid-cols-4">
                    {[
                      {
                        label: "Tenants",
                        value: tenants.length,
                      },
                      {
                        label: "Open tickets",
                        value: overview?.summary.totalOpenTickets ?? "—",
                      },
                      {
                        label: "Need attention",
                        value: overview?.summary.tenantsNeedingAttention ?? "—",
                      },
                      {
                        label: "Active",
                        value: tenants.filter((t) => t.status === "active").length,
                      },
                    ].map((kpi) => (
                      <div className="bg-white px-4 py-3" key={kpi.label}>
                        <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#A09D98]">
                          {kpi.label}
                        </p>
                        <p className="mt-0.5 font-display text-2xl font-extrabold tracking-tight text-[#0D0E12]">
                          {kpi.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {mission?.now?.summary ? (
                    <div className="border border-[#E2DFD9] bg-white px-4 py-3 text-sm text-[#6B6860]">
                      {mission.now.summary.tenantsNeedingAttention > 0 ? (
                        <span className="font-medium text-amber-700">
                          {mission.now.summary.tenantsNeedingAttention} tenant
                          {mission.now.summary.tenantsNeedingAttention === 1 ? "" : "s"} need attention.{" "}
                        </span>
                      ) : (
                        <span className="font-medium text-emerald-700">All tenants healthy. </span>
                      )}
                      {mission.now.summary.openTickets > 0
                        ? `${mission.now.summary.openTickets} open support ticket${mission.now.summary.openTickets === 1 ? "" : "s"}.`
                        : "No open tickets."}
                    </div>
                  ) : null}
                  <p className="text-xs text-[#A09D98]">Select a tenant to manage it.</p>
                </div>
              ) : null}

              {selected && detail ? (
                <>
                  {/* Tenant header */}
                  <div className="border border-[#E2DFD9] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-bold text-[#0D0E12]">{selected.name}</h2>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${
                              selected.status === "suspended"
                                ? "bg-red-100 text-red-700"
                                : selected.status === "provisioning"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {selected.status}
                          </span>
                          {selected.billingStatus ? (
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${
                                BILLING_STATUS_COLORS[selected.billingStatus] ?? "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {selected.billingStatus}
                            </span>
                          ) : null}
                          {selected.seatQuota != null ? (
                            <span className="rounded border border-[#E2DFD9] px-1.5 py-0.5 font-mono text-[9px] text-[#6B6860]">
                              {detail.usage.activeUsers}/{selected.seatQuota} seats
                            </span>
                          ) : null}
                          {selected.maintenanceMode ? (
                            <span className="rounded bg-orange-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-orange-700">
                              maintenance
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-[#A09D98]">
                          {selected.slug}
                          {detail.settings.updatedAt
                            ? ` · settings ${new Date(detail.settings.updatedAt).toLocaleString()}`
                            : null}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {selected.status === "suspended" ? (
                          <Button
                            disabled={statusUpdating}
                            onClick={() => void handleStatusChange("active")}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {statusUpdating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5" />
                            )}
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            disabled={statusUpdating || selected.status === "provisioning"}
                            onClick={() => void handleStatusChange("suspended")}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {statusUpdating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                            Suspend
                          </Button>
                        )}
                        <Button
                          disabled={shadowing || selected.status === "suspended"}
                          onClick={() => void handleShadowTenant("admin")}
                          size="sm"
                          type="button"
                        >
                          {shadowing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserCog className="h-3.5 w-3.5" />
                          )}
                          Open Tenant Admin
                        </Button>
                        <Button
                          disabled={shadowing || selected.status === "suspended"}
                          onClick={() => void handleShadowTenant("manager")}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {shadowing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Users className="h-3.5 w-3.5" />
                          )}
                          Open as Manager
                        </Button>
                        <Button
                          disabled={shadowing || selected.status === "suspended"}
                          onClick={() => void handleShadowTenant("se")}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {shadowing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <GraduationCap className="h-3.5 w-3.5" />
                          )}
                          Open as User
                        </Button>
                        <Button
                          disabled={saving}
                          onClick={() => void handleMaintenanceToggle(!selected.maintenanceMode)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Wrench className="h-3.5 w-3.5" />
                          {selected.maintenanceMode ? "End maint." : "Maintenance"}
                        </Button>
                      </div>
                    </div>

                    {/* Maintenance message input */}
                    <div className="mt-3">
                      <input
                        className="w-full border border-[#E2DFD9] px-3 py-1.5 text-xs"
                        onChange={(event) => setMaintenanceMessage(event.target.value)}
                        placeholder="Maintenance message shown to users (optional)"
                        value={maintenanceMessage}
                      />
                    </div>

                    {/* Dense KPI strip */}
                    <div className="mt-3 grid gap-px bg-[#E2DFD9] sm:grid-cols-3">
                      {[
                        { label: "Users", value: detail.usage.activeUsers },
                        { label: "AI calls 30d", value: detail.usage.aiCalls },
                        { label: "Sim sessions 30d", value: detail.usage.simulationSessions },
                      ].map((kpi) => (
                        <div className="bg-[#F9F8F6] px-3 py-2" key={kpi.label}>
                          <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">
                            {kpi.label}
                          </p>
                          <p className="mt-0.5 text-xl font-bold tabular-nums text-[#0D0E12]">{kpi.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Underline tenant tabs */}
                  <div className="flex overflow-x-auto border-b border-[#E2DFD9]">
                    {tenantTabs.map((item) => (
                      <button
                        className={`shrink-0 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                          tab === item.id
                            ? "border-[#0071ce] text-[#0033a1]"
                            : "border-transparent text-[#6B6860] hover:border-[#C9C7C2] hover:text-[#3D3C38]"
                        }`}
                        key={item.id}
                        onClick={() => setTenantTab(item.id)}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {tab === "entitlements" ? (
                    <PlatformTenantEntitlements
                      billingPlan={selected?.billingPlan}
                      featureFlags={featureFlags}
                      onApplyPackage={handleApplyPackage}
                      onChange={setFeatureFlags}
                      onSave={() => void handleSaveFlags()}
                      savedFlags={savedFlags}
                      saving={saving}
                    />
                  ) : null}

                  {tab === "branding" ? (
                    <div className="border border-[#E2DFD9] bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-[#0D0E12]">Branding &amp; access</h3>
                          <p className="text-xs text-[#6B6860]">
                            Tenant-specific look and allowed email domains.
                          </p>
                        </div>
                        <Button disabled={saving} onClick={() => void handleSaveBranding()} size="sm" type="button">
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Save
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs">
                          <span className="mb-1 block font-medium text-[#3D3C38]">Primary color</span>
                          <input
                            className="w-full border border-[#E2DFD9] px-3 py-1.5 text-sm"
                            onChange={(event) =>
                              setBranding((current) => ({ ...current, primaryColor: event.target.value }))
                            }
                            value={branding.primaryColor}
                          />
                        </label>
                        <label className="block text-xs">
                          <span className="mb-1 block font-medium text-[#3D3C38]">Logo URL</span>
                          <input
                            className="w-full border border-[#E2DFD9] px-3 py-1.5 text-sm"
                            onChange={(event) =>
                              setBranding((current) => ({ ...current, logoUrl: event.target.value }))
                            }
                            placeholder="https://..."
                            value={branding.logoUrl}
                          />
                        </label>
                        <label className="block text-xs sm:col-span-2">
                          <span className="mb-1 block font-medium text-[#3D3C38]">Welcome message</span>
                          <textarea
                            className="min-h-[64px] w-full border border-[#E2DFD9] px-3 py-1.5 text-sm"
                            onChange={(event) =>
                              setBranding((current) => ({ ...current, welcomeMessage: event.target.value }))
                            }
                            value={branding.welcomeMessage}
                          />
                        </label>
                        <label className="block text-xs sm:col-span-2">
                          <span className="mb-1 block font-medium text-[#3D3C38]">Allowed email domains</span>
                          <input
                            className="w-full border border-[#E2DFD9] px-3 py-1.5 text-sm"
                            onChange={(event) =>
                              setBranding((current) => ({
                                ...current,
                                allowedEmailDomains: event.target.value,
                              }))
                            }
                            placeholder="acme.com, acme.io"
                            value={branding.allowedEmailDomains}
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {tab === "provision" ? (
                    <div className="space-y-3">
                      <div className="border border-[#E2DFD9] bg-white p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <UserPlus className="h-3.5 w-3.5 text-[#0071ce]" />
                          <h3 className="text-sm font-bold text-[#0D0E12]">Invite tenant admin</h3>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            className="border border-[#E2DFD9] px-3 py-1.5 text-sm"
                            onChange={(event) => setInviteEmail(event.target.value)}
                            placeholder="admin@tenant.com"
                            value={inviteEmail}
                          />
                          <input
                            className="border border-[#E2DFD9] px-3 py-1.5 text-sm"
                            onChange={(event) => setInviteName(event.target.value)}
                            placeholder="Full name"
                            value={inviteName}
                          />
                        </div>
                        <Button
                          className="mt-2"
                          disabled={inviting}
                          onClick={() => void handleInviteAdmin()}
                          size="sm"
                          type="button"
                        >
                          {inviting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                          Send invite
                        </Button>
                      </div>
                      <div className="border border-[#E2DFD9] bg-white p-4">
                        <h3 className="mb-3 text-sm font-bold text-[#0D0E12]">Invite history</h3>
                        <PlatformInviteList
                          invites={invites}
                          onChanged={() => selectedId && void loadDetail(selectedId)}
                        />
                      </div>
                    </div>
                  ) : null}

                  {tab === "commercial" && selected ? (
                    <PlatformCommercialPanel
                      tenant={selected}
                      onSaved={(updated) => {
                        setSelectedTenant(updated);
                        setTenants((current) =>
                          current.map((t) => (t.id === updated.id ? updated : t)),
                        );
                      }}
                    />
                  ) : null}

                  {tab === "sso" && selectedId ? (
                    <PlatformSsoPanel tenantId={selectedId} />
                  ) : null}

                  {tab === "webhooks" && selectedId ? (
                    <PlatformWebhooksPanel tenantId={selectedId} />
                  ) : null}

                  {tab === "support" && selectedId ? (
                    <PlatformSupportQueue
                      onSelectTenant={openTenant}
                      onShadowTenant={(tenantId) => void shadowTenantById(tenantId)}
                      operators={mission?.operators ?? []}
                      tenantId={selectedId}
                    />
                  ) : null}

                  {tab === "notes" ? (
                    <div className="border border-[#E2DFD9] bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-[#0D0E12]">Operator notes</h3>
                          <p className="text-xs text-[#6B6860]">
                            Internal notes visible only to platform operators.
                          </p>
                        </div>
                        <Button
                          disabled={saving}
                          onClick={() => void handleSaveOperatorNotes()}
                          size="sm"
                          type="button"
                        >
                          {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          Save
                        </Button>
                      </div>
                      <textarea
                        className="min-h-[140px] w-full border border-[#E2DFD9] px-3 py-2 text-sm"
                        onChange={(event) => setOperatorNotes(event.target.value)}
                        placeholder="Onboarding context, escalation history, contract notes..."
                        value={operatorNotes}
                      />
                    </div>
                  ) : null}

                  {tab === "audit" && selectedId ? (
                    <PlatformGlobalAuditPanel tenantId={selectedId} />
                  ) : null}
                </>
              ) : selectedId && detailLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 className="h-7 w-7 animate-spin text-[#0071ce]" />
                  <p className="text-sm text-[#6B6860]">Loading tenant…</p>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
