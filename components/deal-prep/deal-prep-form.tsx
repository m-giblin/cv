"use client";

import { Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { Chip } from "@/components/ui/chip";
import {
  CARD_CLS,
  FIELD_CLS,
  H2_CLS,
  LABEL_CLS,
  SELECT_CLS,
  TEXTAREA_CLS,
} from "@/components/se/form-classes";
import {
  DEAL_PREP_PRIMARY_TEMPLATES,
  DEAL_STAGES,
  MEETING_TYPES,
  PREP_TEMPLATES,
} from "@/lib/deal-prep/templates";
import { cn } from "@/lib/utils";

export type DealPrepFormValues = {
  accountName: string;
  industry: string;
  solutions: string;
  accountContext: string;
  meetingType: string;
  dealStage: string;
  attendees: string;
  meetingDate: string;
  competitors: string;
  crmAccountId: string;
};

export const EMPTY_FORM: DealPrepFormValues = {
  accountName: "",
  industry: "",
  solutions: "ISC, NHI, Agentic Fabric",
  accountContext: "",
  meetingType: "discovery",
  dealStage: "qualify",
  attendees: "",
  meetingDate: "",
  competitors: "",
  crmAccountId: "",
};

const FIELD_WRAP_CLS = "flex flex-col gap-1.5";

export function DealPrepForm({
  values,
  onChange,
  onSubmit,
  isLoading,
}: {
  values: DealPrepFormValues;
  onChange: (values: DealPrepFormValues) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  const [activeTemplateId, setActiveTemplateId] = useState<string>("first-discovery");
  const uid = useId();
  const ids = {
    heading: `${uid}-heading`,
    templates: `${uid}-templates`,
    account: `${uid}-account`,
    industry: `${uid}-industry`,
    solutions: `${uid}-solutions`,
    stage: `${uid}-stage`,
    meeting: `${uid}-meeting`,
    attendees: `${uid}-attendees`,
    competitors: `${uid}-competitors`,
    context: `${uid}-context`,
  };

  function applyTemplate(templateId: string) {
    const template = PREP_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    setActiveTemplateId(templateId);
    onChange({
      ...values,
      meetingType: template.meetingType,
      dealStage: template.dealStage,
      solutions: template.solutions,
      accountContext: values.accountContext.trim() ? values.accountContext : template.contextHint,
    });
  }

  const primaryTemplates = PREP_TEMPLATES.filter((item) =>
    (DEAL_PREP_PRIMARY_TEMPLATES as readonly string[]).includes(item.id),
  );

  return (
    <section aria-labelledby={ids.heading} className={cn(CARD_CLS, "flex flex-col gap-5 px-6 py-[22px]")}>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-blue">Pre-flight</span>
        <h2 className={H2_CLS} id={ids.heading}>
          Build your brief
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        <span className={LABEL_CLS} id={ids.templates}>
          Template
        </span>
        <div aria-labelledby={ids.templates} className="flex flex-wrap gap-2" role="group">
          {primaryTemplates.map((template) => (
            <Chip
              active={activeTemplateId === template.id}
              className="normal-case"
              key={template.id}
              onClick={() => applyTemplate(template.id)}
            >
              {activeTemplateId === template.id ? "✓ " : ""}
              {template.displayLabel ?? template.label}
            </Chip>
          ))}
        </div>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className={FIELD_WRAP_CLS}>
          <label className={LABEL_CLS} htmlFor={ids.account}>
            Account name
          </label>
          <input
            className={FIELD_CLS}
            id={ids.account}
            onChange={(e) => onChange({ ...values, accountName: e.target.value })}
            placeholder="Northside Health"
            required
            value={values.accountName}
          />
        </div>
        <div className={FIELD_WRAP_CLS}>
          <label className={LABEL_CLS} htmlFor={ids.industry}>
            Industry
          </label>
          <input
            className={FIELD_CLS}
            id={ids.industry}
            onChange={(e) => onChange({ ...values, industry: e.target.value })}
            placeholder="Healthcare — 3,200 beds"
            required
            value={values.industry}
          />
        </div>
        <div className={FIELD_WRAP_CLS}>
          <label className={LABEL_CLS} htmlFor={ids.solutions}>
            Solutions
          </label>
          <input
            className={FIELD_CLS}
            id={ids.solutions}
            onChange={(e) => onChange({ ...values, solutions: e.target.value })}
            placeholder="ISC, NHI, Agentic Fabric"
            value={values.solutions}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className={FIELD_WRAP_CLS}>
            <label className={LABEL_CLS} htmlFor={ids.stage}>
              Deal stage
            </label>
            <select
              className={SELECT_CLS}
              id={ids.stage}
              onChange={(e) => onChange({ ...values, dealStage: e.target.value })}
              value={values.dealStage}
            >
              {DEAL_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>
          <div className={FIELD_WRAP_CLS}>
            <label className={LABEL_CLS} htmlFor={ids.meeting}>
              Meeting type
            </label>
            <select
              className={SELECT_CLS}
              id={ids.meeting}
              onChange={(e) => onChange({ ...values, meetingType: e.target.value })}
              value={values.meetingType}
            >
              {MEETING_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={FIELD_WRAP_CLS}>
          <label className={LABEL_CLS} htmlFor={ids.attendees}>
            Who you&apos;re meeting
          </label>
          <input
            className={FIELD_CLS}
            id={ids.attendees}
            onChange={(e) => onChange({ ...values, attendees: e.target.value })}
            placeholder="Director IT Security, VP Infra"
            value={values.attendees}
          />
        </div>
        <div className={FIELD_WRAP_CLS}>
          <label className={LABEL_CLS} htmlFor={ids.competitors}>
            Competitors
          </label>
          <input
            className={FIELD_CLS}
            id={ids.competitors}
            onChange={(e) => onChange({ ...values, competitors: e.target.value })}
            placeholder="Microsoft Entra"
            value={values.competitors}
          />
        </div>
        <div className={FIELD_WRAP_CLS}>
          <label className={LABEL_CLS} htmlFor={ids.context}>
            Context
          </label>
          <textarea
            className={cn(TEXTAREA_CLS, "min-h-[96px]")}
            id={ids.context}
            onChange={(e) => onChange({ ...values, accountContext: e.target.value })}
            placeholder="Recent ransomware scare — access controls flagged by board"
            required
            rows={4}
            value={values.accountContext}
          />
        </div>
        <input
          className="sr-only"
          onChange={(e) => onChange({ ...values, crmAccountId: e.target.value })}
          tabIndex={-1}
          type="hidden"
          value={values.crmAccountId}
        />

        <button
          className="btn-primary mt-1 inline-flex items-center justify-center gap-2 self-start"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          {isLoading ? "Generating brief…" : "Generate brief →"}
        </button>
      </form>
    </section>
  );
}
