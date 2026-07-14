"use client";

import {
 Activity,
 Loader2,
 Plus,
 Save,
 ScrollText,
 Search,
 Ticket,
 UserCog,
 UserPlus,
 GraduationCap,
 Ban,
 CheckCircle,
 Zap,
 Route,
 Eye,
 Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateTenantModal, type CreateTenantFormValues } from "@/components/platform/create-tenant-modal";
import { PlatformGlobalAuditPanel } from "@/components/platform/platform-global-audit-panel";
import { PlatformGlobalSearch } from "@/components/platform/platform-global-search";
import { PlatformNowPanel } from "@/components/platform/platform-now-panel";
import { PlatformOnboardingPanel } from "@/components/platform/platform-onboarding-panel";
import { PlatformOperatorDigest } from "@/components/platform/platform-operator-digest";
import { PlatformOverviewPanel } from "@/components/platform/platform-overview-panel";
import { PlatformShadowLog } from "@/components/platform/platform-shadow-log";
import { PlatformSupportQueue } from "@/components/platform/platform-support-queue";
import { PlatformTenantEntitlements } from "@/components/platform/platform-tenant-entitlements";
import { Button } from "@/components/ui/button";
import type { MissionControlBundle } from "@/lib/platform/mission-control-types";
import type { PlatformFeatureFlags } from "@/lib/platform/settings-shared";
import type { SupportRequest, Tenant, TenantAdminInvite, TenantHealth } from "@/lib/tenant/types";

type ConsoleView = "now" | "onboarding" | "shadow" | "overview" | "support" | "global-audit" | "tenant";
type TenantTab = "entitlements" | "branding" | "provision" | "support" | "audit" | "notes";

type TenantDetail = {
 settings: { featureFlags: PlatformFeatureFlags; sessionIdleMinutes: number; updatedAt: string | null };
 usage: { activeUsers: number; aiCalls: number; simulationSessions: number };
};

type OverviewData = {
 summary: { tenantCount: number; totalOpenTickets: number; tenantsNeedingAttention: number };
 health: TenantHealth[];
 recentTickets: SupportRequest[];
};

export function PlatformConsole() {
 const router = useRouter();
 const [consoleView, setConsoleView] = useState<ConsoleView>("now");
 const [tenants, setTenants] = useState<Tenant[]>([]);
 const [search, setSearch] = useState("");
 const [selectedId, setSelectedId] = useState<string | null>(null);
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
 const [tab, setTab] = useState<TenantTab>("entitlements");
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
 const tenantBody = (await tenantRes.json()) as { tenant: Tenant; invites: TenantAdminInvite[] };
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
 }, []);

 useEffect(() => {
 void loadTenants();
 void loadMission();
 }, [loadTenants, loadMission]);

 useEffect(() => {
 if (selectedId && consoleView === "tenant") void loadDetail(selectedId);
 }, [selectedId, consoleView, loadDetail]);

 function openTenant(tenantId: string) {
 setSelectedId(tenantId);
 setConsoleView("tenant");
 setTab("entitlements");
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

 async function shadowTenantById(tenantId: string) {
 setShadowing(true);
 const response = await fetch("/api/platform/shadow", {
 method: "POST",
 headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest" },
 body: JSON.stringify({ tenantId, mode: "admin" }),
 });
 setShadowing(false);
 if (!response.ok) {
 toast.error("Could not start shadow mode.");
 return;
 }
 const body = (await response.json()) as { redirect?: string };
 router.push(body.redirect ?? "/admin");
 router.refresh();
 }

 async function handleSaveFlags() {
 if (!selectedId) return;
 setSaving(true);
 const response = await fetch(`/api/platform/tenants/${selectedId}/settings`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ featureFlags }),
 });
 setSaving(false);
 if (!response.ok) {
 toast.error("Could not save feature flags.");
 return;
 }
 toast.success("Tenant feature flags saved.");
 setSavedFlags(featureFlags);
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

 async function handleShadowTenant(mode: "admin" | "se") {
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
 toast.error(body?.error ?? "Could not start shadow mode.");
 return;
 }

 const body = (await response.json()) as { redirect?: string; tenantName?: string; mode?: string };
 const label = body.mode === "se" ? "SE training view" : "tenant admin";
 toast.success(`Shadowing ${body.tenantName ?? selected.name} (${label}).`);
 router.push(body.redirect ?? (mode === "se" ? "/dashboard" : "/admin"));
 router.refresh();
 }

 const selected = tenants.find((tenant) => tenant.id === selectedId) ?? selectedTenant;

 const topNav: { id: ConsoleView; label: string; icon: React.ReactNode }[] = [
 { id: "now", label: "Now", icon: <Zap className="h-4 w-4" /> },
 { id: "onboarding", label: "Onboarding", icon: <Route className="h-4 w-4" /> },
 { id: "support", label: "Support", icon: <Ticket className="h-4 w-4" /> },
 { id: "shadow", label: "Shadow log", icon: <Eye className="h-4 w-4" /> },
 { id: "overview", label: "Health", icon: <Activity className="h-4 w-4" /> },
 { id: "global-audit", label: "Global audit", icon: <ScrollText className="h-4 w-4" /> },
 { id: "tenant", label: "Tenants", icon: <UserCog className="h-4 w-4" /> },
 ];

 const tenantTabs: { id: TenantTab; label: string }[] = [
 { id: "entitlements", label: "Entitlements" },
 { id: "branding", label: "Branding" },
 { id: "provision", label: "Provision" },
 { id: "support", label: "Support" },
 { id: "notes", label: "Operator notes" },
 { id: "audit", label: "Audit log" },
 ];

 if (loading && tenants.length === 0) {
 return (
 <div className="flex justify-center py-20">
 <Loader2 className="h-7 w-7 animate-spin text-[#0071ce]" />
 </div>
 );
 }

 return (
 <div className="space-y-5">
 <PlatformGlobalSearch
 onSelectTenant={openTenant}
 onSelectTicket={() => setConsoleView("support")}
 />

 <div className="flex flex-wrap gap-2">
 {topNav.map((item) => (
 <button
 className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition ${
 consoleView === item.id ? "bg-[#0071ce] text-white" : "border border-[#E2DFD9] bg-white text-[#3D3C38]"
 }`}
 key={item.id}
 onClick={() => setConsoleView(item.id)}
 type="button"
 >
 {item.icon}
 {item.label}
 </button>
 ))}
 </div>

 {consoleView === "now" ? (
 <div className="space-y-5">
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

 {consoleView === "onboarding" && mission ? (
 <PlatformOnboardingPanel entries={mission.onboarding} onSelectTenant={openTenant} />
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

 {consoleView === "tenant" ? (
 <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
 <aside className="space-y-4 border border-[#E2DFD9] bg-white p-4 ">
 <div>
 <p className="text-xs font-bold uppercase tracking-wider text-[#6B6860]">Tenants</p>
 <p className="mt-1 text-sm text-[#3D3C38]">
 {tenants.length} organization{tenants.length === 1 ? "" : "s"}
 </p>
 </div>
 <div className="relative">
 <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[#A09D98]" />
 <input
 className="w-full border border-[#E2DFD9] py-2 pl-8 pr-3 text-sm"
 onChange={(event) => setSearch(event.target.value)}
 placeholder="Search tenants..."
 value={search}
 />
 </div>
 <div className="max-h-[360px] space-y-1 overflow-y-auto">
 {filteredTenants.map((tenant) => (
 <div className="flex items-start gap-2" key={tenant.id}>
 <input
 checked={bulkSelected.includes(tenant.id)}
 className="mt-3"
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
 className={`w-full px-3 py-2 text-left text-sm transition ${
 tenant.id === selectedId ? "bg-[#0071ce] text-white" : "hover:bg-[#ECEAE6] text-[#0D0E12]"
 }`}
 onClick={() => setSelectedId(tenant.id)}
 type="button"
 >
 <p className="font-semibold">{tenant.name}</p>
 <p className={`text-xs ${tenant.id === selectedId ? "text-white/80" : "text-[#A09D98]"}`}>
 {tenant.slug} · {tenant.status}
 {tenant.maintenanceMode ? " · maintenance" : ""}
 </p>
 </button>
 </div>
 ))}
 </div>
 {bulkSelected.length > 0 ? (
 <div className="flex flex-wrap gap-2 border-t border-[#E2DFD9] pt-3">
 <Button onClick={() => void handleBulkAction("suspend")} type="button" variant="outline">
 Suspend ({bulkSelected.length})
 </Button>
 <Button onClick={() => void handleBulkAction("activate")} type="button" variant="outline">
 Activate
 </Button>
 <Button onClick={() => void handleBulkAction("apply_preset", "ae-pilot")} type="button" variant="outline">
 AE pilot preset
 </Button>
 </div>
 ) : null}
 <div className="border-t border-[#E2DFD9] pt-4">
 <Button className="w-full" onClick={() => setCreateModalOpen(true)} type="button">
 <Plus className="h-4 w-4" />
 Create tenant
 </Button>
 </div>
 </aside>

 <CreateTenantModal
 creating={creating}
 onClose={() => setCreateModalOpen(false)}
 onSubmit={handleCreateTenant}
 open={createModalOpen}
 />

 <section className="space-y-5">
 {selected && detail ? (
 <>
 <div className="border border-[#E2DFD9] bg-white p-5 ">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 <h2 className="text-xl font-bold text-[#0D0E12]">{selected.name}</h2>
 <p className="mt-1 text-sm text-[#6B6860]">
 {selected.slug} · {selected.status}
 {detail.settings.updatedAt
 ? ` · settings updated ${new Date(detail.settings.updatedAt).toLocaleString()}`
 : null}
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 {selected.status === "suspended" ? (
 <Button disabled={statusUpdating} onClick={() => void handleStatusChange("active")} type="button" variant="outline">
 {statusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
 Reactivate
 </Button>
 ) : (
 <Button
 disabled={statusUpdating || selected.status === "provisioning"}
 onClick={() => void handleStatusChange("suspended")}
 type="button"
 variant="outline"
 >
 {statusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
 Suspend
 </Button>
 )}
 <Button
 disabled={shadowing || selected.status === "suspended"}
 onClick={() => void handleShadowTenant("admin")}
 type="button"
 variant="outline"
 >
 {shadowing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
 Shadow as admin
 </Button>
 <Button
 disabled={shadowing || selected.status === "suspended"}
 onClick={() => void handleShadowTenant("se")}
 type="button"
 variant="outline"
 >
 {shadowing ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
 Try as SE
 </Button>
 <Button
 disabled={saving}
 onClick={() => void handleMaintenanceToggle(!selected.maintenanceMode)}
 type="button"
 variant="outline"
 >
 <Wrench className="h-4 w-4" />
 {selected.maintenanceMode ? "End maintenance" : "Maintenance"}
 </Button>
 </div>
 </div>
 {selected.maintenanceMode || !selected.maintenanceMode ? (
 <div className="mt-4 border border-[#E2DFD9] bg-[#F9F8F6] p-3">
 <label className="block text-sm">
 <span className="mb-1 block font-medium text-[#3D3C38]">Maintenance message (shown to users)</span>
 <input
 className="w-full border border-[#E2DFD9] px-3 py-2 text-sm"
 onChange={(event) => setMaintenanceMessage(event.target.value)}
 placeholder="Scheduled upgrade in progress…"
 value={maintenanceMessage}
 />
 </label>
 </div>
 ) : null}
 <div className="mt-4 grid gap-3 sm:grid-cols-3">
 <div className="bg-[#F9F8F6] p-3">
 <p className="text-2xl font-bold text-[#0D0E12]">{detail.usage.activeUsers}</p>
 <p className="text-xs text-[#6B6860]">Users</p>
 </div>
 <div className="bg-[#F9F8F6] p-3">
 <p className="text-2xl font-bold text-[#0D0E12]">{detail.usage.aiCalls}</p>
 <p className="text-xs text-[#6B6860]">AI calls (30d)</p>
 </div>
 <div className="bg-[#F9F8F6] p-3">
 <p className="text-2xl font-bold text-[#0D0E12]">{detail.usage.simulationSessions}</p>
 <p className="text-xs text-[#6B6860]">Sim assignments (30d)</p>
 </div>
 </div>
 </div>

 <div className="flex flex-wrap gap-2">
 {tenantTabs.map((item) => (
 <button
 className={`px-3 py-1.5 text-sm font-medium transition ${
 tab === item.id ? "bg-[#0071ce] text-white" : "bg-white text-[#3D3C38] border border-[#E2DFD9]"
 }`}
 key={item.id}
 onClick={() => setTab(item.id)}
 type="button"
 >
 {item.label}
 </button>
 ))}
 </div>

 {tab === "entitlements" ? (
 <PlatformTenantEntitlements
 featureFlags={featureFlags}
 onChange={setFeatureFlags}
 onSave={() => void handleSaveFlags()}
 savedFlags={savedFlags}
 saving={saving}
 />
 ) : null}

 {tab === "branding" ? (
 <div className="border border-[#E2DFD9] bg-white p-5 ">
 <div className="mb-4 flex items-center justify-between gap-3">
 <div>
 <h3 className="text-base font-bold text-[#0D0E12]">Branding & access</h3>
 <p className="text-sm text-[#6B6860]">Tenant-specific look and allowed email domains.</p>
 </div>
 <Button disabled={saving} onClick={() => void handleSaveBranding()} type="button">
 {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
 Save branding
 </Button>
 </div>
 <div className="grid gap-3 sm:grid-cols-2">
 <label className="block text-sm">
 <span className="mb-1 block font-medium text-[#3D3C38]">Primary color</span>
 <input
 className="w-full border border-[#E2DFD9] px-3 py-2"
 onChange={(event) => setBranding((current) => ({ ...current, primaryColor: event.target.value }))}
 value={branding.primaryColor}
 />
 </label>
 <label className="block text-sm">
 <span className="mb-1 block font-medium text-[#3D3C38]">Logo URL</span>
 <input
 className="w-full border border-[#E2DFD9] px-3 py-2"
 onChange={(event) => setBranding((current) => ({ ...current, logoUrl: event.target.value }))}
 placeholder="https://..."
 value={branding.logoUrl}
 />
 </label>
 <label className="block text-sm sm:col-span-2">
 <span className="mb-1 block font-medium text-[#3D3C38]">Welcome message</span>
 <textarea
 className="min-h-[80px] w-full border border-[#E2DFD9] px-3 py-2"
 onChange={(event) =>
 setBranding((current) => ({ ...current, welcomeMessage: event.target.value }))
 }
 value={branding.welcomeMessage}
 />
 </label>
 <label className="block text-sm sm:col-span-2">
 <span className="mb-1 block font-medium text-[#3D3C38]">Allowed email domains</span>
 <input
 className="w-full border border-[#E2DFD9] px-3 py-2"
 onChange={(event) =>
 setBranding((current) => ({ ...current, allowedEmailDomains: event.target.value }))
 }
 placeholder="acme.com, acme.io"
 value={branding.allowedEmailDomains}
 />
 </label>
 </div>
 </div>
 ) : null}

 {tab === "provision" ? (
 <div className="space-y-4">
 <div className="border border-[#E2DFD9] bg-white p-5 ">
 <div className="mb-4 flex items-center gap-2">
 <UserPlus className="h-4 w-4 text-[#0071ce]" />
 <h3 className="text-base font-bold text-[#0D0E12]">Invite tenant admin</h3>
 </div>
 <div className="grid gap-3 sm:grid-cols-2">
 <input
 className="border border-[#E2DFD9] px-3 py-2 text-sm"
 onChange={(event) => setInviteEmail(event.target.value)}
 placeholder="admin@tenant.com"
 value={inviteEmail}
 />
 <input
 className="border border-[#E2DFD9] px-3 py-2 text-sm"
 onChange={(event) => setInviteName(event.target.value)}
 placeholder="Full name"
 value={inviteName}
 />
 </div>
 <Button className="mt-3" disabled={inviting} onClick={() => void handleInviteAdmin()} type="button">
 {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
 Send invite
 </Button>
 </div>
 <div className="border border-[#E2DFD9] bg-white p-5 ">
 <h3 className="mb-3 text-base font-bold text-[#0D0E12]">Provisioning history</h3>
 {invites.length === 0 ? (
 <p className="text-sm text-[#6B6860]">No admin invites yet.</p>
 ) : (
 <div className="space-y-2">
 {invites.map((invite) => (
 <div
 className="flex items-center justify-between border border-[#ECEAE6] px-3 py-2 text-sm"
 key={invite.id}
 >
 <div>
 <p className="font-medium text-[#0D0E12]">{invite.fullName}</p>
 <p className="text-xs text-[#A09D98]">{invite.email}</p>
 </div>
 <span className="text-xs font-medium uppercase text-[#6B6860]">{invite.status}</span>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
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
 <div className="border border-[#E2DFD9] bg-white p-5 ">
 <div className="mb-4 flex items-center justify-between gap-3">
 <div>
 <h3 className="text-base font-bold text-[#0D0E12]">Operator notes</h3>
 <p className="text-sm text-[#6B6860]">Internal notes visible only to platform operators.</p>
 </div>
 <Button disabled={saving} onClick={() => void handleSaveOperatorNotes()} type="button">
 {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
 Save notes
 </Button>
 </div>
 <textarea
 className="min-h-[160px] w-full border border-[#E2DFD9] px-3 py-2 text-sm"
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
 ) : (
 <p className="text-sm text-[#6B6860]">Select a tenant to manage entitlements and view usage.</p>
 )}
 </section>
 </div>
 ) : null}
 </div>
 );
}
