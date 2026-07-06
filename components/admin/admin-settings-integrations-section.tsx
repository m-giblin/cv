"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { GongConnectPanel } from "@/components/integrations/gong-connect-panel";

type IntegrationRow = {
  id: string;
  name: string;
  statusText: string;
  stat: string;
  statBg: string;
  statColor: string;
  iconBg: string;
  iconColor: string;
};

const STATIC_INTEGRATIONS: IntegrationRow[] = [
  {
    id: "supabase",
    name: "Supabase",
    statusText: "Auth, profiles, and encrypted platform settings",
    stat: "Active",
    statBg: "#dcfce7",
    statColor: "#15803d",
    iconBg: "#dcfce7",
    iconColor: "#15803d",
  },
  {
    id: "vercel",
    name: "Vercel",
    statusText: "Hosting and deployment pipeline",
    stat: "Active",
    statBg: "#dcfce7",
    statColor: "#15803d",
    iconBg: "#f1f5f9",
    iconColor: "#64748b",
  },
];

export function AdminSettingsIntegrationsSection() {
  const [loading, setLoading] = useState(true);
  const [gongConnected, setGongConnected] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);

  useEffect(() => {
    void fetch("/api/integrations/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { configured?: { gong?: boolean; slack?: boolean } } | null) => {
        setGongConnected(Boolean(body?.configured?.gong));
        setSlackConnected(Boolean(body?.configured?.slack));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const dynamicRows: IntegrationRow[] = [
    {
      id: "gong",
      name: "Gong",
      statusText: "Pre-call intel and call briefs in Deal Prep",
      stat: gongConnected ? "Connected" : "Not connected",
      statBg: gongConnected ? "#dcfce7" : "#fef3c7",
      statColor: gongConnected ? "#15803d" : "#b45309",
      iconBg: "#e8f2fc",
      iconColor: "#0071ce",
    },
    {
      id: "slack",
      name: "Slack",
      statusText: "Q&A routing and SME escalations",
      stat: slackConnected ? "Connected" : "Configure token",
      statBg: slackConnected ? "#dcfce7" : "#fef3c7",
      statColor: slackConnected ? "#15803d" : "#b45309",
      iconBg: "#e8f2fc",
      iconColor: "#0071ce",
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#0033a1]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <p className="text-base font-bold text-[#0a1628]">Integrations</p>
        <p className="text-xs text-[#64748b]">
          Workspace connections and environment-backed services. OAuth and API keys are configured per integration.
        </p>
      </div>

      <GongConnectPanel />

      <div className="rounded-xl border border-[#e2eaf5] bg-white p-[18px_22px]">
        <div className="space-y-[10px]">
          {[...dynamicRows, ...STATIC_INTEGRATIONS].map((integration) => (
            <div
              className="flex items-center gap-[12px] rounded-[9px] border border-[#e2eaf5] bg-[#f8fafd] px-[12px] py-[10px]"
              key={integration.id}
            >
              <div
                className="flex h-[32px] w-[32px] flex-shrink-0 items-center justify-center rounded-lg"
                style={{ background: integration.iconBg }}
              >
                <svg fill="none" height="15" stroke={integration.iconColor} strokeLinecap="round" strokeWidth="1.5" viewBox="0 0 16 16" width="15">
                  <rect height="10" rx="2" width="10" x="3" y="3" />
                  <path d="M6 8h4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-[#1e293b]">{integration.name}</p>
                <p className="text-[10.5px] text-[#94a3b8]">{integration.statusText}</p>
              </div>
              <span
                className="rounded-full px-[8px] py-[2px] text-[9.5px] font-bold"
                style={{ background: integration.statBg, color: integration.statColor }}
              >
                {integration.stat}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
