"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTablePagination, DataTableShell, DataTableToolbar, paginate } from "@/components/ui/data-table";
import type { Tenant } from "@/lib/tenant/types";

type SortKey = "name" | "billingPlan" | "seatQuota" | "billingStatus" | "updatedAt";
type SortDir = "asc" | "desc";

const BILLING_STATUS_COLORS: Record<string, string> = {
  trial: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  past_due: "bg-red-100 text-red-800",
  canceled: "bg-neutral-100 text-neutral-600",
  exempt: "bg-sky-100 text-sky-800",
};

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "billingPlan", label: "Plan" },
  { key: "seatQuota", label: "Seats" },
  { key: "billingStatus", label: "Billing status" },
  { key: "updatedAt", label: "Last updated" },
];

const PAGE_SIZE = 25;

function sortValue(tenant: Tenant, key: SortKey): string | number {
  switch (key) {
    case "name":
      return tenant.name.toLowerCase();
    case "billingPlan":
      return (tenant.billingPlan ?? "").toLowerCase();
    case "seatQuota":
      return tenant.seatQuota ?? -1;
    case "billingStatus":
      return tenant.billingStatus ?? "";
    case "updatedAt":
      return tenant.updatedAt ?? "";
  }
}

export function PlatformTenantTable({
  tenants,
  bulkSelected,
  onToggleBulkSelect,
  onOpenTenant,
}: {
  tenants: Tenant[];
  bulkSelected: string[];
  onToggleBulkSelect: (tenantId: string, checked: boolean) => void;
  onOpenTenant: (tenantId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tenants;
    return tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(query) ||
        tenant.slug.toLowerCase().includes(query) ||
        tenant.status.toLowerCase().includes(query),
    );
  }, [search, tenants]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const { rows, pageCount, page: safePage } = paginate(sorted, page, PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  return (
    <div className="space-y-3">
      <DataTableToolbar
        filtered={filtered.length}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder="Filter by name, slug, or status…"
        search={search}
        total={tenants.length}
      />
      <DataTableShell>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#E2DFD9] bg-[#F9F8F6] text-[10px] uppercase tracking-wide text-[#6B6860]">
            <tr>
              <th className="w-10 px-3 py-2" />
              {COLUMNS.map((column) => (
                <th className="px-3 py-2 font-semibold" key={column.key}>
                  <button
                    className="flex items-center gap-1 hover:text-[#0071CE]"
                    onClick={() => toggleSort(column.key)}
                    type="button"
                  >
                    {column.label}
                    {sortKey === column.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-[#D4D1CB]" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EFEB]">
            {rows.map((tenant) => (
              <tr className="hover:bg-[#F0F7FF]" key={tenant.id}>
                <td className="px-3 py-2.5">
                  <input
                    checked={bulkSelected.includes(tenant.id)}
                    onChange={(event) => onToggleBulkSelect(tenant.id, event.target.checked)}
                    onClick={(event) => event.stopPropagation()}
                    type="checkbox"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <button className="text-left" onClick={() => onOpenTenant(tenant.id)} type="button">
                    <p className="text-sm font-semibold text-[#0D0E12]">{tenant.name}</p>
                    <p className="font-mono text-[10px] text-[#A09D98]">
                      {tenant.slug}
                      {" · "}
                      <span
                        className={
                          tenant.status === "offboarded"
                            ? "text-neutral-500"
                            : tenant.status === "suspended"
                              ? "text-red-600"
                              : tenant.status === "provisioning"
                                ? "text-amber-600"
                                : ""
                        }
                      >
                        {tenant.status}
                      </span>
                      {tenant.maintenanceMode ? " · maint" : ""}
                    </p>
                  </button>
                </td>
                <td className="px-3 py-2.5 text-[#3D3C38]">{tenant.billingPlan ?? "—"}</td>
                <td className="px-3 py-2.5 tabular-nums text-[#3D3C38]">{tenant.seatQuota ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${
                      BILLING_STATUS_COLORS[tenant.billingStatus] ?? "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {tenant.billingStatus}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-[#6B6860]">
                  {tenant.updatedAt ? new Date(tenant.updatedAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-[#A09D98]" colSpan={COLUMNS.length + 1}>
                  No tenants match “{search}”.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </DataTableShell>
      <DataTablePagination onPageChange={setPage} page={safePage} pageCount={pageCount} />
    </div>
  );
}
