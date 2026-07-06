export type MeetingType =
  | "discovery"
  | "demo"
  | "exec_readout"
  | "poc_kickoff"
  | "renewal"
  | "custom";

export type DealStage = "qualify" | "demo" | "negotiate" | "close";

export const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: "discovery", label: "Discovery call" },
  { value: "demo", label: "Product demo" },
  { value: "exec_readout", label: "Executive readout" },
  { value: "poc_kickoff", label: "POC kickoff" },
  { value: "renewal", label: "Renewal / expansion" },
  { value: "custom", label: "Other meeting" },
];

export const DEAL_STAGES: { value: DealStage; label: string }[] = [
  { value: "qualify", label: "Qualify" },
  { value: "demo", label: "Demo / evaluate" },
  { value: "negotiate", label: "Negotiate" },
  { value: "close", label: "Close" },
];

export type PrepTemplate = {
  id: string;
  label: string;
  meetingType: MeetingType;
  dealStage: DealStage;
  solutions: string;
  contextHint: string;
};

export const PREP_TEMPLATES: PrepTemplate[] = [
  {
    id: "first-discovery",
    label: "First discovery call",
    meetingType: "discovery",
    dealStage: "qualify",
    solutions: "Identity Security Cloud, NHI",
    contextHint:
      "First meeting with a new prospect. Focus on pain, stakeholders, and timeline. Competitors unknown.",
  },
  {
    id: "exec-brief",
    label: "Executive business review",
    meetingType: "exec_readout",
    dealStage: "demo",
    solutions: "Identity Security Cloud",
    contextHint:
      "30-minute exec readout with CISO or CIO. Lead with business outcomes and risk reduction, not features.",
  },
  {
    id: "sled-procurement",
    label: "SLED procurement call",
    meetingType: "custom",
    dealStage: "negotiate",
    solutions: "Identity Security Cloud, AIS",
    contextHint:
      "State/local agency procurement discussion. Budget cycles, compliance drivers, and incumbent vendor concerns.",
  },
  {
    id: "renewal-expansion",
    label: "Renewal / expansion",
    meetingType: "renewal",
    dealStage: "close",
    solutions: "Identity Security Cloud, Machine Identity Security",
    contextHint:
      "Existing customer evaluating expansion into NHI or machine identity. Champion engaged; finance may push back on cost.",
  },
];

export function meetingTypeLabel(value: string | null | undefined): string {
  return MEETING_TYPES.find((item) => item.value === value)?.label ?? "Meeting";
}
