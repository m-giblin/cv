"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Field, LineCard, LoadingState, TextInput } from "@/components/admin/admin-ui";
import {
  DEFAULT_SESSION_IDLE_MINUTES,
  MAX_SESSION_IDLE_MINUTES,
  MIN_SESSION_IDLE_MINUTES,
} from "@/lib/platform/settings-shared";
import { PRODUCT_NAME, PRODUCT_TAGLINE, PRODUCT_TEXT_MAX_LENGTH } from "@/lib/tenant/shell-branding-shared";

type BrandingBody = { productName: string | null; productTagline: string | null };

export function AdminSettingsBasicSection() {
  const id = useId();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionIdleMinutes, setSessionIdleMinutes] = useState(DEFAULT_SESSION_IDLE_MINUTES);
  const [productName, setProductName] = useState("");
  const [productTagline, setProductTagline] = useState("");
  const [savedBranding, setSavedBranding] = useState({ productName: "", productTagline: "" });

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
      const next = { productName: branding.productName ?? "", productTagline: branding.productTagline ?? "" };
      setProductName(next.productName);
      setProductTagline(next.productTagline);
      setSavedBranding(next);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const brandingChanged =
      productName.trim() !== savedBranding.productName || productTagline.trim() !== savedBranding.productTagline;
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
            body: JSON.stringify({ productName: productName.trim() || null, productTagline: productTagline.trim() || null }),
          })
        : null,
    ]);
    setSaving(false);
    if (!settingsResponse.ok || (brandingResponse && !brandingResponse.ok)) {
      toast.error("Could not save general settings.");
      return;
    }
    if (brandingResponse) {
      setSavedBranding({ productName: productName.trim(), productTagline: productTagline.trim() });
      // The header and page titles come from the server layout, so refresh it to show the new name.
      router.refresh();
    }
    toast.success("General settings saved.");
  }

  if (loading) {
    return <LoadingState label="Loading platform settings…" />;
  }

  return (
    <form className="flex max-w-3xl flex-col gap-6" onSubmit={handleSave}>
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
              onChange={(event) => setProductName(event.target.value)}
              placeholder={PRODUCT_NAME}
              value={productName}
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
              onChange={(event) => setProductTagline(event.target.value)}
              placeholder={PRODUCT_TAGLINE}
              value={productTagline}
            />
          </Field>
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
  );
}
