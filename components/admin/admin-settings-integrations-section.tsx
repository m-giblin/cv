"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LineCard, LineRow, LoadingState } from "@/components/admin/admin-ui";
import { Tag } from "@/components/ui/tag";

type StatusBody = {
  signals?: Array<{ provider: string; status: string }>;
  configured?: { gong?: boolean; slack?: boolean };
};

type IntegrationRow = {
  name: string;
  description: string;
  connected: boolean;
  statusLabel: string;
  action?: React.ReactNode;
};

export function AdminSettingsIntegrationsSection() {
  const [loading, setLoading] = useState(true);
  const [gongConnected, setGongConnected] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    void fetch("/api/integrations/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: StatusBody | null) => {
        const gong = body?.signals?.find((signal) => signal.provider === "gong");
        setGongConnected(gong?.status === "connected");
        setSlackConnected(Boolean(body?.configured?.slack));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function connectGong() {
    setConnecting(true);
    const response = await fetch("/api/integrations/gong/oauth/start");
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { hint?: string };
      toast.message("Gong workspace key or OAuth required", {
        description: body.hint ?? "Ask your admin to set GONG_API_KEY or complete Gong OAuth app registration.",
      });
      setConnecting(false);
      return;
    }

    const body = (await response.json()) as { authorizeUrl: string };
    window.location.href = body.authorizeUrl;
  }

  if (loading) {
    return <LoadingState label="Checking integrations…" />;
  }

  const rows: IntegrationRow[] = [
    {
      name: "Gong",
      description: gongConnected
        ? "Pre-call intel and call briefs in Deal Prep. Briefs merge into prep when you generate."
        : "Pre-call intel and call briefs in Deal Prep.",
      connected: gongConnected,
      statusLabel: gongConnected ? "Connected" : "Not connected",
      action: gongConnected ? undefined : (
        <button className="btn-primary" disabled={connecting} onClick={() => void connectGong()} type="button">
          {connecting ? "Connecting…" : "Connect Gong"}
        </button>
      ),
    },
    {
      name: "Slack",
      description: "Q&A routing and SME escalations.",
      connected: slackConnected,
      statusLabel: slackConnected ? "Connected" : "Configure token",
    },
    {
      name: "Supabase",
      description: "Auth, profiles, encrypted settings.",
      connected: true,
      statusLabel: "Active",
    },
    {
      name: "Vercel",
      description: "Hosting and deployment pipeline.",
      connected: true,
      statusLabel: "Active",
    },
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <LineCard bodyClassName="p-0" meta="Workspace and environment" title="Connections">
        {rows.map((row) => (
          <LineRow className="flex flex-wrap items-center gap-x-4 gap-y-2" key={row.name}>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-ink">{row.name}</p>
              <p className="mt-0.5 text-sm text-muted">{row.description}</p>
            </div>
            <Tag tone={row.connected ? "success" : "warning"}>
              {row.connected ? "✓" : "▲"} {row.statusLabel}
            </Tag>
            {row.action}
          </LineRow>
        ))}
      </LineCard>
    </div>
  );
}
