"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
 AdminTable,
 Field,
 KpiStrip,
 LinkButton,
 LoadingState,
 Meta,
 Notice,
 SecondaryButton,
 SelectInput,
 Td,
 TextInput,
 Th,
} from "@/components/admin/admin-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { PersonCell, rowHighlight } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { allowedEmailDomainsLabel } from "@/lib/auth/email-domain";
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

type RoleTone = "blue" | "neutral" | "signal";

function roleBadge(role: ProfileRole): { tone: RoleTone; label: string } {
 const map: Partial<Record<ProfileRole, { tone: RoleTone; label: string }>> = {
 basic_se: { tone: "blue", label: "SE" },
 senior_se: { tone: "blue", label: "SE" },
 advisory_solutions_consultant: { tone: "blue", label: "SE" },
 mentor: { tone: "neutral", label: "Mentor" },
 manager: { tone: "neutral", label: "Manager" },
 director: { tone: "neutral", label: "Director" },
 admin: { tone: "signal", label: "Admin" },
 };
 return map[role] ?? { tone: "neutral", label: role.replaceAll("_", " ") };
}

function sentenceCase(value: string) {
 return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDay(value: string) {
 const date = new Date(value);
 if (Number.isNaN(date.getTime())) return "—";
 const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
 if (date.getFullYear() !== new Date().getFullYear()) options.year = "numeric";
 return date.toLocaleDateString("en-US", options);
}

function paginate<T>(items: T[], page: number, pageSize: number) {
 const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
 const safePage = Math.min(Math.max(1, page), pageCount);
 const start = (safePage - 1) * pageSize;
 return { page: safePage, pageCount, rows: items.slice(start, start + pageSize) };
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


 function closeForm() {
 setEditingId(null);
 setShowCreate(false);
 setForm(emptyForm);
 }

 if (isLoading) {
 return <LoadingState label="Loading users…" />;
 }

 const formOpen = showCreate || Boolean(editingId);

 return (
 <div className="flex flex-col gap-6">
 <KpiStrip
 items={[
 { label: "Total users", value: userStats.total },
 { label: "Active SEs", value: userStats.seCount },
 { label: "Managers", value: userStats.managerCount },
 { label: "Admins", value: userStats.adminCount },
 ]}
 />

 {tempPasswordShown ? (
 <Notice className="border-signal bg-signal-soft">
 <p className="text-sm font-bold text-ink">Temporary password</p>
 <p className="mt-0.5 text-[13px] text-ink-2">
 Share it securely. They must change it on first sign-in and enroll in MFA.
 </p>
 <p className="mt-2.5 text-lg font-bold tracking-[0.02em] text-ink select-all">{tempPasswordShown}</p>
 </Notice>
 ) : null}

 <div className="flex flex-col gap-4">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by role">
 {["All roles", ...ROLE_FILTER_OPTIONS].map((option) => (
 <Chip
 active={roleFilter === option}
 count={users.filter((user) => matchesRoleFilter(user.role, option)).length}
 key={option}
 onClick={() => setRoleFilter(option)}
 >
 {option === "All roles" ? "All" : option}
 </Chip>
 ))}
 </div>
 <button className="btn-primary" onClick={startCreate} type="button">
 Invite user
 </button>
 </div>
 <div className="flex flex-wrap items-center gap-3">
 <TextInput
 aria-label="Search users"
 className="max-w-[320px] flex-1"
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search by name or email"
 type="search"
 value={search}
 />
 <SelectInput
 aria-label="Filter by level"
 className="w-auto"
 onChange={(e) => setLevelFilter(e.target.value)}
 value={levelFilter}
 >
 <option>All levels</option>
 <option>Basic SE</option>
 <option>Senior SE</option>
 <option>Advisory SC</option>
 </SelectInput>
 <SelectInput
 aria-label="Filter by manager"
 className="w-auto"
 onChange={(e) => setManagerFilter(e.target.value)}
 value={managerFilter}
 >
 <option>All managers</option>
 {managers.map((manager) => (
 <option key={manager.id}>{manager.full_name}</option>
 ))}
 </SelectInput>
 <span className="ml-auto text-sm text-muted">
 Showing {filteredUsers.length} of {users.length} users
 </span>
 </div>
 </div>

 <AdminTable caption="Users" minWidth={900}>
 <thead>
 <tr>
 <Th>Name</Th>
 <Th>Email</Th>
 <Th>Role</Th>
 <Th>Level</Th>
 <Th>Manager</Th>
 <Th>Joined</Th>
 <Th className="text-right">
 <span className="sr-only">Actions</span>
 </Th>
 </tr>
 </thead>
 <tbody>
 {rows.length === 0 ? (
 <tr>
 <td colSpan={7}>
 <p className="px-5 py-8 text-center text-sm text-muted">No users match your search.</p>
 </td>
 </tr>
 ) : (
 rows.map((user) => {
 const badge = roleBadge(user.role);
 return (
 <tr className={editingId === user.id ? rowHighlight.selected : "hover:bg-bg"} key={user.id}>
 <Td>
 <PersonCell initials={initials(user.full_name)} name={user.full_name} subline={sentenceCase(user.role.replaceAll("_", " "))} />
 </Td>
 <Td className="text-sm text-ink-2">{user.email}</Td>
 <Td>
 <Tag tone={badge.tone}>{badge.label}</Tag>
 </Td>
 <Td className="text-sm">{user.level}</Td>
 <Td className="max-w-[180px] truncate text-sm">
 {user.manager_id ? managerNameById.get(user.manager_id) ?? "—" : "—"}
 </Td>
 <Td>
 <Meta>{formatDay(user.created_at)}</Meta>
 </Td>
 <Td>
 <div className="flex justify-end gap-4">
 <LinkButton aria-label={`Edit ${user.full_name}`} onClick={() => startEdit(user)}>
 Edit
 </LinkButton>
 <LinkButton
 aria-label={`Remove ${user.full_name}`}
 onClick={() => void handleDelete(user)}
 tone="danger"
 >
 Remove
 </LinkButton>
 </div>
 </Td>
 </tr>
 );
 })
 )}
 </tbody>
 </AdminTable>

 {pageCount > 1 ? (
 <nav aria-label="Users pagination" className="flex items-center justify-between gap-3">
 <SecondaryButton disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
 Previous
 </SecondaryButton>
 <Meta>
 Page {safePage} of {pageCount}
 </Meta>
 <SecondaryButton disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
 Next
 </SecondaryButton>
 </nav>
 ) : null}

 <Drawer
   size="form"
 footer={
 <>
 <button className="btn-primary" disabled={isSaving} form="admin-user-form" type="submit">
 {isSaving ? "Saving…" : editingId ? "Save changes" : "Create user"}
 </button>
 <SecondaryButton onClick={closeForm}>Cancel</SecondaryButton>
 </>
 }
 onClose={closeForm}
 open={formOpen}
 title={editingId ? "Edit user" : "New user"}
 >
 <p className="mb-5 text-sm text-muted">Accounts must use {allowedEmailDomainsLabel()}.</p>
 <form
 className="flex flex-col gap-4"
 id="admin-user-form"
 onSubmit={editingId ? handleUpdate : handleCreate}
 >
 <Field htmlFor="admin-user-name" label="Full name">
 <TextInput
 id="admin-user-name"
 onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
 required
 value={form.fullName}
 />
 </Field>
 <Field htmlFor="admin-user-email" label="Email">
 <TextInput
 id="admin-user-email"
 onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
 required
 type="email"
 value={form.email}
 />
 </Field>
 <Field htmlFor="admin-user-role" label="Role">
 <SelectInput
 id="admin-user-role"
 onChange={(event) =>
 setForm((current) => ({ ...current, role: event.target.value as ProfileRole }))
 }
 value={form.role}
 >
 {ROLES.map((role) => (
 <option key={role} value={role}>
 {sentenceCase(role.replaceAll("_", " "))}
 </option>
 ))}
 </SelectInput>
 </Field>
 <Field htmlFor="admin-user-level" label="SE level">
 <SelectInput
 id="admin-user-level"
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
 </SelectInput>
 </Field>
 <Field htmlFor="admin-user-manager" label="Manager">
 <SelectInput
 id="admin-user-manager"
 onChange={(event) => setForm((current) => ({ ...current, managerId: event.target.value }))}
 value={form.managerId}
 >
 <option value="">No manager</option>
 {managers.map((manager) => (
 <option key={manager.id} value={manager.id}>
 {manager.full_name} ({manager.role.replaceAll("_", " ")})
 </option>
 ))}
 </SelectInput>
 </Field>
 {showCreate ? (
 <>
 <Field htmlFor="admin-user-password" label="Password (optional)">
 <TextInput
 autoComplete="new-password"
 id="admin-user-password"
 minLength={8}
 onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
 placeholder="Auto-generated if blank"
 type="password"
 value={form.password}
 />
 </Field>
 <label className="flex items-start gap-2.5 text-sm text-ink-2" htmlFor="admin-user-invite">
 <Checkbox
 checked={form.sendInvite}
 className="mt-0.5"
 id="admin-user-invite"
 onChange={(event) => setForm((current) => ({ ...current, sendInvite: event.target.checked }))}
 />
 Email a password setup link instead of showing a temporary password
 </label>
 </>
 ) : null}
 </form>
 </Drawer>
 </div>
 );
}
