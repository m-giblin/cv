"use client";

import { Loader2, Sparkles } from "lucide-react";
import { SP_BLUE_BTN, SP_INPUT_CLS, SP_SELECT_CLS, SP_TEXTAREA_CLS } from "@/components/se/sp-form-primitives";
import { DEAL_STAGES, MEETING_TYPES, PREP_TEMPLATES } from "@/lib/deal-prep/templates";

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
  solutions: "Identity Security Cloud, NHI",
  accountContext: "",
  meetingType: "discovery",
  dealStage: "qualify",
  attendees: "",
  meetingDate: "",
  competitors: "",
  crmAccountId: "",
};

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
  function applyTemplate(templateId: string) {
    const template = PREP_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    onChange({
      ...values,
      meetingType: template.meetingType,
      dealStage: template.dealStage,
      solutions: template.solutions,
      accountContext: values.accountContext.trim() ? values.accountContext : template.contextHint,
    });
  }

  return (
    <div className="rounded-xl border border-[#e2eaf5] bg-white p-[18px]">
      <div className="mb-4">
        <p className="flex items-center gap-2 text-[15px] font-bold text-[#0a1628]">
          <Sparkles className="h-4 w-4 text-sp-magenta" />
          Call details
        </p>
        <p className="mt-1 text-[12px] text-[#64748b]">Paste CRM notes or pick a starter template for account-specific prep.</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {PREP_TEMPLATES.map((template) => (
            <button
              className="rounded-full border border-sp-blue/15 px-3 py-1 text-xs font-semibold text-sp-navy-muted hover:border-sp-blue/30 hover:bg-sp-blue-soft/20"
              key={template.id}
              onClick={() => applyTemplate(template.id)}
              type="button"
            >
              {template.label}
            </button>
          ))}
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="block">
            <span className="mb-[5px] block text-[11px] font-semibold text-[#475569]">Account name *</span>
            <input
              className={SP_INPUT_CLS}
              onChange={(e) => onChange({ ...values, accountName: e.target.value })}
              placeholder="Account name"
              required
              value={values.accountName}
            />
          </label>
          <label className="block">
            <span className="mb-[5px] block text-[11px] font-semibold text-[#475569]">
              CRM account ID (optional)
            </span>
            <input
              className={SP_INPUT_CLS}
              onChange={(e) => onChange({ ...values, crmAccountId: e.target.value })}
              placeholder="Salesforce / HubSpot account ID"
              value={values.crmAccountId}
            />
          </label>
          <label className="block">
            <span className="mb-[5px] block text-[11px] font-semibold text-[#475569]">Industry *</span>
            <input
              className={SP_INPUT_CLS}
              onChange={(e) => onChange({ ...values, industry: e.target.value })}
              placeholder="Industry"
              required
              value={values.industry}
            />
          </label>
          <label className="block">
            <span className="mb-[5px] block text-[11px] font-semibold text-[#475569]">Solutions</span>
            <input
              className={SP_INPUT_CLS}
              onChange={(e) => onChange({ ...values, solutions: e.target.value })}
              placeholder="Solutions (comma-separated)"
              value={values.solutions}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-[5px] block text-[11px] font-semibold text-[#475569]">Meeting type</span>
              <select
                className={SP_SELECT_CLS}
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
            <label className="block">
              <span className="mb-[5px] block text-[11px] font-semibold text-[#475569]">Deal stage</span>
              <select
                className={SP_SELECT_CLS}
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
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-[5px] block text-[11px] font-semibold text-[#475569]">Meeting date</span>
              <input
                className={SP_INPUT_CLS}
                onChange={(e) => onChange({ ...values, meetingDate: e.target.value })}
                placeholder="Meeting date"
                type="date"
                value={values.meetingDate}
              />
            </label>
            <label className="block">
              <span className="mb-[5px] block text-[11px] font-semibold text-[#475569]">Attendees</span>
              <input
                className={SP_INPUT_CLS}
                onChange={(e) => onChange({ ...values, attendees: e.target.value })}
                placeholder="e.g. CISO, IAM lead"
                value={values.attendees}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-[5px] block text-[11px] font-semibold text-[#475569]">Known competitors (optional)</span>
            <input
              className={SP_INPUT_CLS}
              onChange={(e) => onChange({ ...values, competitors: e.target.value })}
              placeholder="Known competitors"
              value={values.competitors}
            />
          </label>

          <label className="block">
            <span className="mb-[5px] block text-[11px] font-semibold text-[#475569]">Pain hypothesis / account context *</span>
            <textarea
              className={SP_TEXTAREA_CLS}
              onChange={(e) => onChange({ ...values, accountContext: e.target.value })}
              placeholder="What do you know about this account? Pain, timeline, stakeholders, CRM notes…"
              required
              rows={6}
              value={values.accountContext}
            />
          </label>

          <button className={`${SP_BLUE_BTN} w-full justify-center`} disabled={isLoading} type="submit">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate deal prep
          </button>
        </form>
      </div>
    </div>
  );
}
