"use client";

import { cn } from "@/lib/utils";

const tabs = [
  { id: "users", label: "People" },
  { id: "plans", label: "Plans" },
  { id: "competencies", label: "Competencies" },
  { id: "ai", label: "AI & prompts" },
  { id: "content", label: "Content" },
  { id: "audit", label: "Audit log" },
  { id: "analytics", label: "Analytics" },
] as const;

export type AdminTab = (typeof tabs)[number]["id"];

export function AdminTabs({
  active,
  onChange,
}: {
  active: AdminTab;
  onChange: (tab: AdminTab) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-sp-blue/10 pb-4">
      {tabs.map((tab) => (
        <button
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold transition",
            active === tab.id
              ? "bg-sp-blue text-white shadow-sm"
              : "bg-sp-blue-soft/50 text-sp-blue-deep hover:bg-sp-blue-soft",
          )}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function AdminTabPanel({ active, tab, children }: { active: AdminTab; tab: AdminTab; children: React.ReactNode }) {
  if (active !== tab) {
    return null;
  }

  return <div>{children}</div>;
}
