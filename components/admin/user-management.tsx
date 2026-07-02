"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { allowedEmailDomainsLabel } from "@/lib/auth/email-domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTablePagination,
  DataTableShell,
  DataTableToolbar,
  paginate,
} from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { ProfileRole, SeLevel } from "@/lib/types";

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

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [tempPasswordShown, setTempPasswordShown] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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
    if (!query) return users;

    return users.filter((user) => {
      const managerName = user.manager_id ? managerNameById.get(user.manager_id) ?? "" : "";
      return [user.full_name, user.email, user.role, user.level, managerName]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [managerNameById, search, users]);

  const { rows, page: safePage, pageCount } = paginate(filteredUsers, page, PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

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
    void loadUsers();
  }, [loadUsers]);

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
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-sp-navy">People & hierarchy</h2>
          <p className="text-sm text-sp-navy-muted">Create accounts, assign managers, and set SE roles.</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4" />
          New user
        </Button>
      </div>

      {tempPasswordShown ? (
        <Card className="border-sp-magenta/20 bg-sp-magenta-soft/20">
          <CardHeader>
            <CardTitle className="text-sp-magenta">Temporary password</CardTitle>
            <CardDescription>Share securely. User must change it on first login and enroll MFA.</CardDescription>
          </CardHeader>
          <p className="px-5 pb-5 font-mono text-lg font-bold text-sp-navy">{tempPasswordShown}</p>
        </Card>
      ) : null}

      {(showCreate || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit user" : "New user"}</CardTitle>
            <CardDescription>Accounts must use {allowedEmailDomainsLabel()}.</CardDescription>
          </CardHeader>
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
                className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
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
                className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
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
                className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
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
        </Card>
      )}

      <DataTableToolbar
        filtered={filteredUsers.length}
        onSearchChange={setSearch}
        placeholder="Search name, email, role, manager…"
        search={search}
        total={users.length}
      />

      <DataTableShell>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-sp-blue/10 bg-sp-blue-soft/30 text-xs uppercase tracking-wide text-sp-navy-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Level</th>
              <th className="px-4 py-3 font-semibold">Manager</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sp-navy-muted" colSpan={6}>
                  No users match your search.
                </td>
              </tr>
            ) : (
              rows.map((user) => (
                <tr className="border-b border-sp-blue/5 hover:bg-sp-blue-soft/20" key={user.id}>
                  <td className="px-4 py-3 font-semibold text-sp-navy">{user.full_name}</td>
                  <td className="px-4 py-3 text-sp-navy-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone="magenta">{user.role.replaceAll("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="blue">{user.level}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sp-navy-muted">
                    {user.manager_id ? managerNameById.get(user.manager_id) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button aria-label="Edit user" onClick={() => startEdit(user)} size="sm" variant="ghost">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button aria-label="Delete user" onClick={() => void handleDelete(user)} size="sm" variant="ghost">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableShell>

      <DataTablePagination onPageChange={setPage} page={safePage} pageCount={pageCount} />
    </div>
  );
}
