"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
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

const FIELD_LABEL_CLS =
  "mb-1 block font-mono text-[8px] uppercase tracking-[0.1em] text-[#B0ADA8]";
const FIELD_INPUT_CLS =
  "w-full border border-[#E2DFD9] bg-white px-2.5 py-1.5 text-[11.5px] text-[#0D0E12] outline-none placeholder:text-[#B0ADA8] focus:border-[#D4810A]/50";

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
    <div className="flex h-full flex-col overflow-y-auto bg-[#F9F8F6] p-4">
      <p className="mb-3.5 font-display text-[13px] font-bold text-[#0D0E12]">Build your brief</p>

      <div className="mb-3.5">
        <p className={FIELD_LABEL_CLS}>Template</p>
        <div className="flex flex-col gap-1">
          {primaryTemplates.map((template) => {
            const active = activeTemplateId === template.id;
            return (
              <button
                className={cn(
                  "flex items-center justify-between border px-2.5 py-1.5 text-left transition",
                  active
                    ? "border-[#00143A] bg-[#00143A] text-white"
                    : "border-[#E2DFD9] bg-white text-[#0D0E12] hover:border-[#B0ADA8]",
                )}
                key={template.id}
                onClick={() => applyTemplate(template.id)}
                type="button"
              >
                <span className={cn("text-[11.5px]", active ? "font-semibold text-white" : "font-medium")}>
                  {template.displayLabel ?? template.label}
                </span>
                {active ? (
                  <span className="bg-[#D4810A] px-1.5 py-0.5 font-mono text-[8px] font-medium uppercase tracking-[0.06em] text-white">
                    Active
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <form
        className="flex flex-col gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label>
          <span className={FIELD_LABEL_CLS}>Account name</span>
          <input
            className={FIELD_INPUT_CLS}
            onChange={(e) => onChange({ ...values, accountName: e.target.value })}
            placeholder="Northside Health"
            required
            value={values.accountName}
          />
        </label>
        <label>
          <span className={FIELD_LABEL_CLS}>Industry</span>
          <input
            className={FIELD_INPUT_CLS}
            onChange={(e) => onChange({ ...values, industry: e.target.value })}
            placeholder="Healthcare — 3,200 beds"
            required
            value={values.industry}
          />
        </label>
        <label>
          <span className={FIELD_LABEL_CLS}>Solutions</span>
          <input
            className={FIELD_INPUT_CLS}
            onChange={(e) => onChange({ ...values, solutions: e.target.value })}
            placeholder="ISC, NHI, Agentic Fabric"
            value={values.solutions}
          />
        </label>
        <label>
          <span className={FIELD_LABEL_CLS}>Deal stage</span>
          <select
            className={FIELD_INPUT_CLS}
            onChange={(e) => onChange({ ...values, dealStage: e.target.value })}
            value={values.dealStage}
          >
            {DEAL_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={FIELD_LABEL_CLS}>Meeting type</span>
          <select
            className={FIELD_INPUT_CLS}
            onChange={(e) => onChange({ ...values, meetingType: e.target.value })}
            value={values.meetingType}
          >
            {MEETING_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={FIELD_LABEL_CLS}>Attendees</span>
          <input
            className={FIELD_INPUT_CLS}
            onChange={(e) => onChange({ ...values, attendees: e.target.value })}
            placeholder="Director IT Security, VP Infra"
            value={values.attendees}
          />
        </label>
        <label>
          <span className={FIELD_LABEL_CLS}>Competitors</span>
          <input
            className={FIELD_INPUT_CLS}
            onChange={(e) => onChange({ ...values, competitors: e.target.value })}
            placeholder="Microsoft Entra"
            value={values.competitors}
          />
        </label>
        <label>
          <span className={FIELD_LABEL_CLS}>Context</span>
          <textarea
            className={cn(FIELD_INPUT_CLS, "min-h-[72px] resize-none leading-relaxed")}
            onChange={(e) => onChange({ ...values, accountContext: e.target.value })}
            placeholder="Recent ransomware scare — access controls flagged by board"
            required
            rows={3}
            value={values.accountContext}
          />
        </label>
        <input
          className="sr-only"
          onChange={(e) => onChange({ ...values, crmAccountId: e.target.value })}
          tabIndex={-1}
          type="hidden"
          value={values.crmAccountId}
        />

        <button
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 bg-[#D4810A] px-3 py-2.5 text-[11.5px] font-semibold text-white hover:bg-[#b86d08] disabled:opacity-50"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Generate brief →
        </button>
      </form>
    </div>
  );
}
