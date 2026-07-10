"use client";

const TABS = [
 { id: "overview", label: "Overview" },
 { id: "users", label: "Users" },
 { id: "plans", label: "Plans" },
 { id: "competencies", label: "Competencies" },
 { id: "analytics", label: "Analytics" },
 { id: "ai", label: "AI & Sims" },
 { id: "corpus", label: "Corpus" },
 { id: "routing", label: "Q&A Routing" },
 { id: "audit", label: "Audit Log" },
 { id: "help", label: "Help" },
 { id: "settings", label: "Settings" },
] as const;

export type AdminTab = (typeof TABS)[number]["id"];

export function AdminTabs({
 active,
 onChange,
}: {
 active: AdminTab;
 onChange: (tab: AdminTab) => void;
}) {
 return (
 <div className="flex h-[44px] flex-shrink-0 items-center gap-[4px] overflow-x-auto border-b border-[#ECEAE6] bg-white px-[24px]">
 {TABS.map((tab) => (
 <button
 className="whitespace-nowrap px-[16px] py-[8px] text-[12px] font-semibold transition hover:bg-[#ECEAE6]"
 key={tab.id}
 onClick={() => onChange(tab.id)}
 style={active === tab.id ? { background: "#00143a", color: "white" } : { color: "#6B6860" }}
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

 return <div className="p-[22px_24px_28px]">{children}</div>;
}
