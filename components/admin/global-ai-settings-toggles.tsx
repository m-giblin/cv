"use client";

import { useState } from "react";
import { LineCard, LineRow, Switch } from "@/components/admin/admin-ui";

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
    <LineCard bodyClassName="p-0" title="Global AI settings">
      {settings.map((item) => {
        const initial = GLOBAL_AI_TOGGLES.find((row) => row.id === item.id)?.enabled;
        return (
          <LineRow className="flex items-center justify-between gap-4" key={item.id}>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-ink">{item.label}</p>
              <p className="mt-0.5 text-sm text-muted">{item.description}</p>
            </div>
            <Switch
              changed={initial !== item.enabled}
              checked={item.enabled}
              label={item.label}
              onChange={(enabled) =>
                setSettings((current) => current.map((row) => (row.id === item.id ? { ...row, enabled } : row)))
              }
            />
          </LineRow>
        );
      })}
    </LineCard>
  );
}
