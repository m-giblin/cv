"use client";

import { useState } from "react";
import { Toggle } from "@/components/admin/admin-toggle";

type ToggleRow = {
 id: string;
 label: string;
 description: string;
 enabled: boolean;
};

export const GLOBAL_AI_TOGGLES: ToggleRow[] = [
 {
 id: "sim-suggestions",
 label: "Simulation prompt suggestions",
 description: "Allow AI to generate prompt variants for simulation templates.",
 enabled: true,
 },
 {
 id: "auto-routing",
 label: "Auto-route Q&A to SMEs",
 description: "Use semantic tags to route unresolved Q&A to the best channel.",
 enabled: true,
 },
 {
 id: "coaching-summaries",
 label: "Coaching summary cards",
 description: "Generate concise coaching recaps for managers after reviews.",
 enabled: false,
 },
 {
 id: "market-pulse",
 label: "Market pulse insights",
 description: "Generate weekly market pulse summaries and quiz prompts for SE teams.",
 enabled: true,
 },
];

export function GlobalAiSettingsToggles() {
 const [settings, setSettings] = useState(GLOBAL_AI_TOGGLES);

 return (
 <div className="border border-[#E2DFD9] bg-white p-[18px_22px]">
 <p className="mb-[14px] text-[12.5px] font-bold text-[#0D0E12]">Global AI settings</p>
 <div className="space-y-[14px]">
 {settings.map((item) => (
 <div className="flex items-center justify-between border-b border-[#ECEAE6] py-[10px]" key={item.id}>
 <div className="pr-4">
 <p className="text-[12px] font-semibold text-[#3D3C38]">{item.label}</p>
 <p className="mt-[1px] text-[11px] text-[#A09D98]">{item.description}</p>
 </div>
 <Toggle
 checked={item.enabled}
 onChange={(enabled) =>
 setSettings((current) => current.map((row) => (row.id === item.id ? { ...row, enabled } : row)))
 }
 />
 </div>
 ))}
 </div>
 </div>
 );
}
