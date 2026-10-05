"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  BillingStatusTag,
  TABLE,
  TD,
  TD_MONO,
  TD_MUTED,
  TH,
  THEAD_ROW,
  TR,
  TenantStatusTag,
  formatDate,
} from "@/components/platform/platform-ui";
import { DataTablePagination, DataTableShell, DataTableToolbar, paginate } from "@/components/ui/data-table";
import type { Tenant } from "@/lib/tenant/types";
import { cn } from "@/lib/utils";

type SortKey = "name" | "billingPlan" | "seatQuota" | "billingStatus" | "updatedAt";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "billingPlan", label: "Plan" },
  { key: "seatQuota", label: "Seats" },
  { key: "billingStatus", label: "Billing" },
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
        <table className={TABLE}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={cn(TH, "w-12")} scope="col">
                <span className="sr-only">Select</span>
              </th>
              {COLUMNS.map((column) => {
                const active = sortKey === column.key;
                return (
                  <th
                    aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    className={TH}
                    key={column.key}
                    scope="col"
                  >
                    <button
                      className="inline-flex items-center gap-1 font-mono text-xs uppercase hover:text-on-blue"
                      onClick={() => toggleSort(column.key)}
                      type="button"
                    >
                      {column.label}
                      {active ? (
                        sortDir === "asc" ? (
                          <ArrowUp aria-hidden className="h-3.5 w-3.5 text-signal" />
                        ) : (
                          <ArrowDown aria-hidden className="h-3.5 w-3.5 text-signal" />
                        )
                      ) : (
                        <ArrowUpDown aria-hidden className="h-3.5 w-3.5 text-on-blue-muted" />
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((tenant) => {
              const checked = bulkSelected.includes(tenant.id);
              return (
                <tr className={cn(TR, checked && "bg-blue-soft")} key={tenant.id}>
                  <td className="py-3 pl-[18px]">
                    <input
                      aria-label={`Select ${tenant.name}`}
                      checked={checked}
                      className="h-4 w-4 accent-[var(--color-blue)]"
                      onChange={(event) => onToggleBulkSelect(tenant.id, event.target.checked)}
                      type="checkbox"
                    />
                  </td>
                  <td className={TD}>
                    <button className="link text-left" onClick={() => onOpenTenant(tenant.id)} type="button">
                      {tenant.name}
                    </button>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs text-muted">{tenant.slug}</span>
                      {tenant.status !== "active" ? <TenantStatusTag status={tenant.status} /> : null}
                      {tenant.maintenanceMode ? <span className="font-mono text-xs text-warning">▲ MAINTENANCE</span> : null}
                    </div>
                  </td>
                  <td className={TD_MUTED}>{tenant.billingPlan ?? "—"}</td>
                  <td className={`${TD_MUTED} tabular-nums`}>{tenant.seatQuota ?? "—"}</td>
                  <td className={TD}>
                    <BillingStatusTag status={tenant.billingStatus} />
                  </td>
                  <td className={TD_MONO}>{formatDate(tenant.updatedAt)}</td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td className="px-[18px] py-8 text-center text-sm text-muted" colSpan={COLUMNS.length + 1}>
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
