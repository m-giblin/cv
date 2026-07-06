export type IntegrationSignal = {
  id: string;
  provider: "gong" | "slack";
  label: string;
  status: "connected" | "stub" | "disconnected";
  lastSync: string | null;
  signalCount: number;
  description: string;
};

export const INTEGRATION_SIGNALS: IntegrationSignal[] = [
  {
    id: "gong-calls",
    provider: "gong",
    label: "Gong call intelligence",
    status: "stub",
    lastSync: null,
    signalCount: 0,
    description:
      "Surface discovery quality and talk-time ratios from recorded calls into manager coaching context. Wire OAuth when Gong workspace is approved.",
  },
  {
    id: "slack-activity",
    provider: "slack",
    label: "Slack enablement digest",
    status: "stub",
    lastSync: null,
    signalCount: 0,
    description:
      "Post trophy earned, revision needed, and 48h manager SLA reminders to team channels. Connect bot token in admin when ready.",
  },
];

export function integrationStatusLabel(status: IntegrationSignal["status"]) {
  switch (status) {
    case "connected":
      return "Connected";
    case "stub":
      return "Ready to connect";
    default:
      return "Disconnected";
  }
}
