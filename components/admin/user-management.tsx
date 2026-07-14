"use client";

import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminStatStrip } from "@/components/admin/admin-ui-primitives";
import { allowedEmailDomainsLabel } from "@/lib/auth/email-domain";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import { Button } from "@/components/ui/button";
import { DataTablePagination, paginate } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { ProfileRole, SeLevel } from "@/lib/types";
import { initials } from "@/lib/utils";

type AdminUser = {
 id: string;
 email: string;
 full_name: string;
 role: ProfileRole;
 level: SeLevel;
 manager_id: string | null;
 created_at: string;
};

const ROLES: ProfileRole[] = [
 "basic_se",
 "senior_se",
 "advisory_solutions_consultant",
 "mentor",
 "manager",
 "director",
 "admin",
];

const LEVELS: SeLevel[] = ["Basic", "Senior", "Advisory"];

const ROLE_FILTER_OPTIONS = ["SE", "Manager", "Admin", "Mentor", "Director"] as const;

const emptyForm = {
 fullName: "",
 email: "",
 password: "",
 role: "basic_se" as ProfileRole,
 level: "Basic" as SeLevel,
 managerId: "",
 sendInvite: true,
};

const PAGE_SIZE = 25;
const USER_COLS = "1fr 90px 110px 140px 90px 120px";

function roleBadge(role: ProfileRole) {
 const map: Partial<Record<ProfileRole, { bg: string; color: string; label: string }>> = {
 basic_se: { bg: "#e8f2fc", color: "#0057a8", label: "SE" },
 senior_se: { bg: "#e8f2fc", color: "#0057a8", label: "SE" },
 advisory_solutions_consultant: { bg: "#e8f2fc", color: "#0057a8", label: "SE" },
 mentor: { bg: "#ede9fe", color: "#5b21b6", label: "Mentor" },
 manager: { bg: "#fdf0fa", color: "#a51e8e", label: "Manager" },
 director: { bg: "#fdf0fa", color: "#a51e8e", label: "Director" },
 admin: { bg: "#ECEAE6", color: "#3D3C38", label: "Admin" },
 };
 return map[role] ?? { bg: "#ECEAE6", color: "#6B6860", label: role.replaceAll("_", " ") };
}

function matchesRoleFilter(role: ProfileRole, filter: string) {
 if (filter === "All roles") return true;
 const badge = roleBadge(role);
 return badge.label === filter;
}

function matchesLevelFilter(level: SeLevel, filter: string) {
 if (filter === "All levels") return true;
 const map: Record<string, SeLevel> = {
 "Basic SE": "Basic",
 "Senior SE": "Senior",
 "Advisory SC": "Advisory",
 };
 return level === map[filter];
}

export function UserManagement({ initialUsers }: { initialUsers?: AdminUser[] }) {
 const [users, setUsers] = useState<AdminUser[]>(initialUsers ?? []);
 const [isLoading, setIsLoading] = useState(!initialUsers?.length);
 const [isSaving, setIsSaving] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [showCreate, setShowCreate] = useState(false);
 const [form, setForm] = useState(emptyForm);
 const [tempPasswordShown, setTempPasswordShown] = useState<string | null>(null);
 const [search, setSearch] = useState("");
 const [roleFilter, setRoleFilter] = useState("All roles");
 const [levelFilter, setLevelFilter] = useState("All levels");
 const [managerFilter, setManagerFilter] = useState("All managers");
 const [page, setPage] = useState(1);

 const managers = useMemo(
 () => users.filter((user) => ["manager", "mentor", "director", "admin"].includes(user.role)),
 [users],
 );

 const managerNameById = useMemo(() => {
 const map = new Map<string, string>();
 for (const user of users) {
 map.set(user.id, user.full_name);
 }
 return map;
 }, [users]);

 const filteredUsers = useMemo(() => {
 const query = search.trim().toLowerCase();

 return users.filter((user) => {
 const managerName = user.manager_id ? managerNameById.get(user.manager_id) ?? "" : "";
 const matchesSearch =
 !query ||
 [user.full_name, user.email, user.role, user.level, managerName].join(" ").toLowerCase().includes(query);
 const matchesRole = matchesRoleFilter(user.role, roleFilter);
 const matchesLevel = matchesLevelFilter(user.level, levelFilter);
 const matchesManager =
 managerFilter === "All managers" || managerName === managerFilter;
 return matchesSearch && matchesRole && matchesLevel && matchesManager;
 });
 }, [managerFilter, managerNameById, levelFilter, roleFilter, search, users]);

 const { rows, page: safePage, pageCount } = paginate(filteredUsers, page, PAGE_SIZE);

 const userStats = useMemo(() => {
  const seCount = users.filter((u) =>
    ["basic_se", "senior_se", "advisory_solutions_consultant"].includes(u.role),
  ).length;
  const managerCount = users.filter((u) => ["manager", "director", "mentor"].includes(u.role)).length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  return { total: users.length, seCount, managerCount, adminCount };
 }, [users]);

 useEffect(() => {
 setPage(1);
 }, [search, roleFilter, levelFilter, managerFilter]);

 const loadUsers = useCallback(async () => {
 setIsLoading(true);
 const response = await fetch("/api/admin/users");

 if (!response.ok) {
 const body = (await response.json()) as { error?: string };
 toast.error(body.error ?? "Failed to load users.");
 setIsLoading(false);
 return;
 }

 const body = (await response.json()) as { users: AdminUser[] };
 setUsers(body.users);
 setIsLoading(false);
 }, []);

 useEffect(() => {
 if (initialUsers?.length) {
 return;
 }
 void loadUsers();
 }, [initialUsers, loadUsers]);

 function startEdit(user: AdminUser) {
 setEditingId(user.id);
 setShowCreate(false);
 setForm({
 fullName: user.full_name,
 email: user.email,
 password: "",
 role: user.role,
 level: user.level,
 managerId: user.manager_id ?? "",
 sendInvite: false,
 });
 }

 function startCreate() {
 setEditingId(null);
 setShowCreate(true);
 setForm(emptyForm);
 setTempPasswordShown(null);
 }

 async function handleCreate(event: React.FormEvent) {
 event.preventDefault();
 setIsSaving(true);

 const response = await fetch("/api/admin/users", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 fullName: form.fullName,
 email: form.email,
 password: form.password || undefined,
 role: form.role,
 level: form.level,
 managerId: form.managerId || null,
 sendInvite: form.sendInvite,
 }),
 });

 const body = (await response.json()) as {
 error?: string;
 temporaryPassword?: string;
 inviteSent?: boolean;
 };

 if (!response.ok) {
 toast.error(typeof body.error === "string" ? body.error : "Create failed.");
 setIsSaving(false);
 return;
 }

 if (body.inviteSent) {
 toast.success("User created. Password reset invite sent.");
 } else if (body.temporaryPassword) {
 setTempPasswordShown(body.temporaryPassword);
 toast.success("User created. Copy the temporary password below.");
 }

 setShowCreate(false);
 setForm(emptyForm);
 await loadUsers();
 setIsSaving(false);
 }

 async function handleUpdate(event: React.FormEvent) {
 event.preventDefault();

 if (!editingId) {
 return;
 }

 setIsSaving(true);

 const response = await fetch(`/api/admin/users/${editingId}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 fullName: form.fullName,
 email: form.email,
 role: form.role,
 level: form.level,
 managerId: form.managerId || null,
 }),
 });

 const body = (await response.json()) as { error?: string };

 if (!response.ok) {
 toast.error(typeof body.error === "string" ? body.error : "Update failed.");
 setIsSaving(false);
 return;
 }

 toast.success("User updated.");
 setEditingId(null);
 setForm(emptyForm);
 await loadUsers();
 setIsSaving(false);
 }

 async function handleDelete(user: AdminUser) {
 if (!confirm(`Delete ${user.full_name}? This removes their login permanently.`)) {
 return;
 }

 const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
 const body = (await response.json()) as { error?: string };

 if (!response.ok) {
 toast.error(body.error ?? "Delete failed.");
 return;
 }

 toast.success("User deleted.");
 await loadUsers();
 }

 if (isLoading) {
 return (
 <div className="flex justify-center py-12">
 <Loader2 className="h-6 w-6 animate-spin text-sp-blue" />
 </div>
 );
 }

 return (
 <div className="space-y-4">
 <AdminStatStrip
  items={[
   { label: "Total users", value: userStats.total },
   { label: "Active SEs", value: userStats.seCount },
   { label: "Managers", value: userStats.managerCount },
   { label: "Admins", value: userStats.adminCount },
  ]}
 />

 <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
 <div />
 <Button onClick={startCreate}>
 <Plus className="h-4 w-4" />
 Invite user
 </Button>
 </div>

 {tempPasswordShown ? (
 <div className="border border-[#E2DFD9] bg-[#fdf0fa] p-[18px_22px]">
 <p className="text-[12.5px] font-bold text-[#a51e8e]">Temporary password</p>
 <p className="mt-[2px] text-[11px] text-[#6B6860]">
 Share securely. User must change it on first login and enroll MFA.
 </p>
 <p className="mt-[10px] font-mono text-lg font-bold text-[#0D0E12]">{tempPasswordShown}</p>
 </div>
 ) : null}

 {(showCreate || editingId) && (
 <div className="border border-[#E2DFD9] bg-white p-[18px_22px]">
 <p className="text-[12.5px] font-bold text-[#0D0E12]">{editingId ? "Edit user" : "New user"}</p>
 <p className="mb-[14px] mt-[2px] text-[11px] text-[#6B6860]">
 Accounts must use {allowedEmailDomainsLabel()}.
 </p>
 <form className="grid gap-4 md:grid-cols-2" onSubmit={editingId ? handleUpdate : handleCreate}>
 <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
 Full name
 <Input
 onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
 required
 value={form.fullName}
 />
 </label>
 <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
 Email
 <Input
 onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
 placeholder="name@sailpoint.com"
 required
 type="email"
 value={form.email}
 />
 </label>
 <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
 Role
 <select
 className="h-10 w-full border border-sp-blue/15 bg-white px-3 text-sm"
 onChange={(event) =>
 setForm((current) => ({ ...current, role: event.target.value as ProfileRole }))
 }
 value={form.role}
 >
 {ROLES.map((role) => (
 <option key={role} value={role}>
 {role.replaceAll("_", " ")}
 </option>
 ))}
 </select>
 </label>
 <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
 SE level
 <select
 className="h-10 w-full border border-sp-blue/15 bg-white px-3 text-sm"
 onChange={(event) =>
 setForm((current) => ({ ...current, level: event.target.value as SeLevel }))
 }
 value={form.level}
 >
 {LEVELS.map((level) => (
 <option key={level} value={level}>
 {level}
 </option>
 ))}
 </select>
 </label>
 <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted md:col-span-2">
 Manager
 <select
 className="h-10 w-full border border-sp-blue/15 bg-white px-3 text-sm"
 onChange={(event) => setForm((current) => ({ ...current, managerId: event.target.value }))}
 value={form.managerId}
 >
 <option value="">No manager</option>
 {managers.map((manager) => (
 <option key={manager.id} value={manager.id}>
 {manager.full_name} ({manager.role.replaceAll("_", " ")})
 </option>
 ))}
 </select>
 </label>
 {showCreate ? (
 <>
 <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
 Password (optional)
 <Input
 minLength={8}
 onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
 placeholder="Auto-generated if blank"
 type="password"
 value={form.password}
 />
 </label>
 <label className="flex items-center gap-2 self-end text-sm text-sp-navy-muted">
 <input
 checked={form.sendInvite}
 onChange={(event) => setForm((current) => ({ ...current, sendInvite: event.target.checked }))}
 type="checkbox"
 />
 Email password setup link instead of showing temp password
 </label>
 </>
 ) : null}
 <div className="flex gap-2 md:col-span-2">
 <Button disabled={isSaving} type="submit">
 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
 {editingId ? "Save changes" : "Create user"}
 </Button>
 <Button
 onClick={() => {
 setEditingId(null);
 setShowCreate(false);
 setForm(emptyForm);
 }}
 type="button"
 variant="outline"
 >
 Cancel
 </Button>
 </div>
 </form>
 </div>
 )}

 <div className="mb-[14px] flex items-center gap-[10px]">
 <div className="flex max-w-[280px] flex-1 items-center gap-[7px] border-[1.5px] border-[#E2DFD9] bg-white px-[12px] py-[6px]">
 <svg fill="none" height="13" stroke="#A09D98" strokeLinecap="round" strokeWidth="1.3" viewBox="0 0 14 14" width="13">
 <circle cx="6" cy="6" r="4.5" />
 <line x1="9.5" x2="12.5" y1="9.5" y2="12.5" />
 </svg>
 <input
 className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#A09D98]"
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search by name or email..."
 value={search}
 />
 </div>
 <select
 className="cursor-pointer border-[1.5px] border-[#E2DFD9] bg-white px-[10px] py-[6px] text-[12px] text-[#374151] outline-none"
 onChange={(e) => setRoleFilter(e.target.value)}
 value={roleFilter}
 >
 <option>All roles</option>
 {ROLE_FILTER_OPTIONS.map((option) => (
 <option key={option}>{option}</option>
 ))}
 </select>
 <select
 className="cursor-pointer border-[1.5px] border-[#E2DFD9] bg-white px-[10px] py-[6px] text-[12px] text-[#374151] outline-none"
 onChange={(e) => setLevelFilter(e.target.value)}
 value={levelFilter}
 >
 <option>All levels</option>
 <option>Basic SE</option>
 <option>Senior SE</option>
 <option>Advisory SC</option>
 </select>
 <select
 className="cursor-pointer border-[1.5px] border-[#E2DFD9] bg-white px-[10px] py-[6px] text-[12px] text-[#374151] outline-none"
 onChange={(e) => setManagerFilter(e.target.value)}
 value={managerFilter}
 >
 <option>All managers</option>
 {managers.map((manager) => (
 <option key={manager.id}>{manager.full_name}</option>
 ))}
 </select>
 </div>

 <div className="overflow-hidden border border-[#E2DFD9] bg-white">
 <div
 className="grid border-b border-[#ECEAE6] bg-[#F9F8F6] px-[18px] py-[10px]"
 style={{ gridTemplateColumns: USER_COLS }}
 >
 {["User", "Role", "Level", "Manager", "Joined", ""].map((header) => (
 <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#A09D98]" key={header}>
 {header}
 </span>
 ))}
 </div>
 {rows.length === 0 ? (
 <p className="px-4 py-8 text-center text-sp-navy-muted">No users match your search.</p>
 ) : (
 rows.map((user) => {
 const badge = roleBadge(user.role);
 return (
 <div
 className="grid cursor-pointer items-center border-b border-[#f9fafb] px-[18px] py-[10px] transition hover:bg-[#f7fafd]"
 key={user.id}
 style={{ gridTemplateColumns: USER_COLS }}
 >
 <div className="flex items-center gap-[10px]">
 <div
 className="flex h-[32px] w-[32px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
 style={{ background: avatarGradientForId(user.id) }}
 >
 {initials(user.full_name)}
 </div>
 <div>
 <p className="text-[12px] font-semibold text-[#3D3C38]">{user.full_name}</p>
 <p className="text-[10.5px] text-[#A09D98]">{user.email}</p>
 </div>
 </div>
 <span
 className="w-fit font-mono text-[8px] uppercase tracking-[0.08em] px-[8px] py-[2px] text-[9.5px] font-bold"
 style={{ background: badge.bg, color: badge.color }}
 >
 {badge.label}
 </span>
 <span className="text-[12px] text-[#3D3C38]">{user.level}</span>
 <span className="truncate text-[12px] text-[#3D3C38]">
 {user.manager_id ? managerNameById.get(user.manager_id) ?? "—" : "—"}
 </span>
 <span className="text-[11.5px] text-[#A09D98]">{new Date(user.created_at).toLocaleDateString()}</span>
 <div className="flex gap-[6px]">
 <button
 className="inline-flex items-center border border-[#E2DFD9] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#3D3C38]"
 onClick={() => startEdit(user)}
 type="button"
 >
 Edit
 </button>
 <button
 className="inline-flex items-center px-[10px] py-[5px] text-[11px] font-semibold"
 onClick={() => void handleDelete(user)}
 style={{ background: "#fee2e2", border: "1.5px solid #fecaca", color: "#dc2626" }}
 type="button"
 >
 Remove
 </button>
 </div>
 </div>
 );
 })
 )}
 </div>

 <DataTablePagination onPageChange={setPage} page={safePage} pageCount={pageCount} />
 </div>
 );
}
