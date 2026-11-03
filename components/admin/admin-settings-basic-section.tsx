"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Field, LineCard, LoadingState, TextInput } from "@/components/admin/admin-ui";
import { JobTitlesSettings } from "@/components/admin/job-titles-settings";
import {
  DEFAULT_SESSION_IDLE_MINUTES,
  MAX_SESSION_IDLE_MINUTES,
  MIN_SESSION_IDLE_MINUTES,
} from "@/lib/platform/settings-shared";
import { DEFAULT_LEARNER_TERMS, LEARNER_TERM_MAX_LENGTH } from "@/lib/tenant/learner-terms";
import { PRODUCT_NAME, PRODUCT_TAGLINE, PRODUCT_TEXT_MAX_LENGTH } from "@/lib/tenant/shell-branding-shared";

type BrandingBody = { productName: string | null; productTagline: string | null; learnerTerm?: string | null; learnerTermPlural?: string | null };
type BrandingForm = { productName: string; productTagline: string; learnerTerm: string; learnerTermPlural: string };
const EMPTY_BRANDING: BrandingForm = { productName: "", productTagline: "", learnerTerm: "", learnerTermPlural: "" };

export function AdminSettingsBasicSection() {
  const id = useId();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionIdleMinutes, setSessionIdleMinutes] = useState(DEFAULT_SESSION_IDLE_MINUTES);
  const [brand, setBrand] = useState<BrandingForm>(EMPTY_BRANDING);
  const [savedBranding, setSavedBranding] = useState<BrandingForm>(EMPTY_BRANDING);
  const setField = (field: keyof BrandingForm) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setBrand((current) => ({ ...current, [field]: event.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    const [settingsResponse, brandingResponse] = await Promise.all([
      fetch("/api/admin/platform-settings"),
      fetch("/api/admin/branding"),
    ]);
    setLoading(false);
    if (!settingsResponse.ok) {
      toast.error("Could not load platform settings.");
      return;
    }
    const body = (await settingsResponse.json()) as { settings: { sessionIdleMinutes: number } };
    setSessionIdleMinutes(body.settings.sessionIdleMinutes);
    if (brandingResponse.ok) {
      const branding = (await brandingResponse.json()) as BrandingBody;
      const next: BrandingForm = {
        productName: branding.productName ?? "",
        productTagline: branding.productTagline ?? "",
        learnerTerm: branding.learnerTerm ?? "",
        learnerTermPlural: branding.learnerTermPlural ?? "",
      };
      setBrand(next);
      setSavedBranding(next);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const trimmed: BrandingForm = {
      productName: brand.productName.trim(),
      productTagline: brand.productTagline.trim(),
      learnerTerm: brand.learnerTerm.trim(),
      learnerTermPlural: brand.learnerTermPlural.trim(),
    };
    const brandingChanged = (Object.keys(trimmed) as (keyof BrandingForm)[]).some((field) => trimmed[field] !== savedBranding[field]);
    const [settingsResponse, brandingResponse] = await Promise.all([
      fetch("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIdleMinutes }),
      }),
      brandingChanged
        ? fetch("/api/admin/branding", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productName: trimmed.productName || null,
              productTagline: trimmed.productTagline || null,
              learnerTerm: trimmed.learnerTerm || null,
              learnerTermPlural: trimmed.learnerTermPlural || null,
            }),
          })
        : null,
    ]);
    setSaving(false);
    if (!settingsResponse.ok || (brandingResponse && !brandingResponse.ok)) {
      toast.error("Could not save general settings.");
      return;
    }
    if (brandingResponse) {
      setSavedBranding(trimmed);
      // The header, page titles and page text come from the server layout, so refresh it to show the new names.
      router.refresh();
    }
    toast.success("General settings saved.");
  }

  if (loading) {
    return <LoadingState label="Loading platform settings…" />;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <form className="flex flex-col gap-6" onSubmit={handleSave}>
        <LineCard meta="Header, page titles and emails" title="App name">
          <div className="flex flex-col gap-4">
            <Field
              hint={`Shown top left for everyone in this tenant. Leave blank to use "${PRODUCT_NAME}".`}
              htmlFor={`${id}-product-name`}
              label="Title"
            >
              <TextInput
                className="max-w-sm"
                id={`${id}-product-name`}
                maxLength={PRODUCT_TEXT_MAX_LENGTH}
                onChange={setField("productName")}
                placeholder={PRODUCT_NAME}
                value={brand.productName}
              />
            </Field>
            <Field
              hint={`The smaller line under the title. Leave blank to use "${PRODUCT_TAGLINE}".`}
              htmlFor={`${id}-product-tagline`}
              label="Subtitle"
            >
              <TextInput
                className="max-w-sm"
                id={`${id}-product-tagline`}
                maxLength={PRODUCT_TEXT_MAX_LENGTH}
                onChange={setField("productTagline")}
                placeholder={PRODUCT_TAGLINE}
                value={brand.productTagline}
              />
            </Field>
            <div className="flex flex-wrap gap-4">
              <Field
                hint={`Used across pages, help and emails. Blank uses "${DEFAULT_LEARNER_TERMS.one}".`}
                htmlFor={`${id}-learner-term`}
                label="What you call the people you train"
              >
                <TextInput
                  className="max-w-40"
                  id={`${id}-learner-term`}
                  maxLength={LEARNER_TERM_MAX_LENGTH}
                  onChange={setField("learnerTerm")}
                  placeholder={DEFAULT_LEARNER_TERMS.one}
                  value={brand.learnerTerm}
                />
              </Field>
              <Field hint="Blank adds an s." htmlFor={`${id}-learner-term-plural`} label="More than one">
                <TextInput
                  className="max-w-40"
                  id={`${id}-learner-term-plural`}
                  maxLength={LEARNER_TERM_MAX_LENGTH}
                  onChange={setField("learnerTermPlural")}
                  placeholder={brand.learnerTerm.trim() ? `${brand.learnerTerm.trim()}s` : DEFAULT_LEARNER_TERMS.many}
                  value={brand.learnerTermPlural}
                />
              </Field>
            </div>
          </div>
        </LineCard>
        <LineCard meta="Applies to every signed-in user" title="Sessions">
          <Field
            hint={`Users are signed out after this much inactivity. The default is ${DEFAULT_SESSION_IDLE_MINUTES} minutes; raise it for UAT. Allowed range is ${MIN_SESSION_IDLE_MINUTES} to ${MAX_SESSION_IDLE_MINUTES}.`}
            htmlFor={`${id}-idle`}
            label="Session idle timeout (minutes)"
          >
            <TextInput
              className="max-w-40"
              id={`${id}-idle`}
              max={MAX_SESSION_IDLE_MINUTES}
              min={MIN_SESSION_IDLE_MINUTES}
              onChange={(event) => setSessionIdleMinutes(Number(event.target.value))}
              type="number"
              value={sessionIdleMinutes}
            />
          </Field>
        </LineCard>
        <div>
          <button className="btn-primary" disabled={saving} type="submit">
            {saving ? "Saving…" : "Save general settings"}
          </button>
        </div>
      </form>
      {/* Saved on its own: it's a list, not part of the general settings form. */}
      <JobTitlesSettings />
    </div>
  );
}
