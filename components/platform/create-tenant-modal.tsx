"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { FIELD_HINT, FIELD_LABEL } from "@/components/platform/platform-ui";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type CreateTenantFormValues = {
 name: string;
 slug: string;
 primaryColor: string;
 logoUrl: string;
 welcomeMessage: string;
 allowedEmailDomains: string;
 adminEmail: string;
 adminFullName: string;
 sendAdminInvite: boolean;
};

const EMPTY_FORM: CreateTenantFormValues = {
 name: "",
 slug: "",
 primaryColor: "#0071ce",
 logoUrl: "",
 welcomeMessage: "",
 allowedEmailDomains: "",
 adminEmail: "",
 adminFullName: "",
 sendAdminInvite: true,
};

function slugify(value: string) {
 return value
 .trim()
 .toLowerCase()
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/^-+|-+$/g, "")
 .slice(0, 64);
}

type CreateTenantModalProps = {
 open: boolean;
 creating: boolean;
 onClose: () => void;
 onSubmit: (values: CreateTenantFormValues) => void | Promise<void>;
};

/** Create-tenant form in the side drawer: focus-trapped, Esc closes, focus returns to "New tenant". */
export function CreateTenantModal({ open, creating, onClose, onSubmit }: CreateTenantModalProps) {
  const id = useId();
  const [form, setForm] = useState<CreateTenantFormValues>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setSlugTouched(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (!creating) onClose();
  }, [creating, onClose]);

  function update<K extends keyof CreateTenantFormValues>(key: K, value: CreateTenantFormValues[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && !slugTouched) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!canSubmit || creating) return;
    void onSubmit({
      ...form,
      name: form.name.trim(),
      slug: form.slug.trim(),
      logoUrl: form.logoUrl.trim(),
      welcomeMessage: form.welcomeMessage.trim(),
      allowedEmailDomains: form.allowedEmailDomains.trim(),
      adminEmail: form.adminEmail.trim(),
      adminFullName: form.adminFullName.trim(),
    });
  }

  const adminEmailProvided = form.adminEmail.length > 0;
  const canSubmit =
    form.name.trim().length >= 2 &&
    form.slug.trim().length >= 2 &&
    (!adminEmailProvided || (form.adminFullName.trim().length >= 2 && form.adminEmail.includes("@")));

  const field = (name: string) => `${id}-${name}`;

  return (
    <Drawer
      footer={
        <>
          <button
            className="btn-primary inline-flex items-center gap-2"
            disabled={creating || !canSubmit}
            form={field("form")}
            type="submit"
          >
            {creating ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            {creating ? "Creating…" : "Create tenant"}
          </button>
          <button className="btn-secondary" disabled={creating} onClick={handleClose} type="button">
            Cancel
          </button>
        </>
      }
      onClose={handleClose}
      open={open}
      title="New tenant"
    >
      <form className="space-y-7" id={field("form")} onSubmit={handleSubmit}>
        <section className="space-y-4">
          <h3 className="label-mono">Organization</h3>
          <div>
            <label className={FIELD_LABEL} htmlFor={field("name")}>
              Organization name <span className="font-normal text-muted">(required)</span>
            </label>
            <Input
              aria-describedby={field("name-hint")}
              id={field("name")}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Acme Corp"
              required
              value={form.name}
            />
            <p className={FIELD_HINT} id={field("name-hint")}>
              Display name shown across the platform.
            </p>
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor={field("slug")}>
              Tenant slug
            </label>
            <Input
              aria-describedby={field("slug-hint")}
              className="font-mono text-sm"
              id={field("slug")}
              onChange={(event) => {
                setSlugTouched(true);
                update("slug", slugify(event.target.value));
              }}
              placeholder="acme-corp"
              value={form.slug}
            />
            <p className={FIELD_HINT} id={field("slug-hint")}>
              URL-safe identifier, generated from the name.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="label-mono">Access and branding</h3>
          <div>
            <label className={FIELD_LABEL} htmlFor={field("domains")}>
              Allowed email domains
            </label>
            <Input
              aria-describedby={field("domains-hint")}
              id={field("domains")}
              onChange={(event) => update("allowedEmailDomains", event.target.value)}
              placeholder="acme.com, acme.io"
              value={form.allowedEmailDomains}
            />
            <p className={FIELD_HINT} id={field("domains-hint")}>
              Comma-separated. Only these domains can sign in to this tenant.
            </p>
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor={field("color")}>
              Primary colour
            </label>
            <div className="flex gap-2">
              <input
                aria-label="Pick primary colour"
                className="h-10 w-12 shrink-0 cursor-pointer rounded-[10px] border-[1.5px] border-ink bg-white p-1"
                onChange={(event) => update("primaryColor", event.target.value)}
                type="color"
                value={form.primaryColor}
              />
              <Input
                className="font-mono text-sm"
                id={field("color")}
                onChange={(event) => update("primaryColor", event.target.value)}
                placeholder="#0033A1"
                value={form.primaryColor}
              />
            </div>
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor={field("logo")}>
              Logo URL
            </label>
            <Input
              id={field("logo")}
              onChange={(event) => update("logoUrl", event.target.value)}
              placeholder="https://cdn.example.com/logo.svg"
              type="url"
              value={form.logoUrl}
            />
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor={field("welcome")}>
              Welcome message
            </label>
            <Textarea
              className="min-h-[88px]"
              id={field("welcome")}
              onChange={(event) => update("welcomeMessage", event.target.value)}
              placeholder="Welcome to Acme SE Enablement"
              value={form.welcomeMessage}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="label-mono">First tenant admin</h3>
          <p className="text-sm text-ink-2">Optional. Invite the person who will manage users and settings.</p>
          <div>
            <label className={FIELD_LABEL} htmlFor={field("admin-email")}>
              Admin email
            </label>
            <Input
              id={field("admin-email")}
              onChange={(event) => update("adminEmail", event.target.value)}
              placeholder="admin@acme.com"
              type="email"
              value={form.adminEmail}
            />
          </div>
          <div>
            <label className={FIELD_LABEL} htmlFor={field("admin-name")}>
              Admin full name
              {adminEmailProvided ? <span className="font-normal text-muted"> (required)</span> : null}
            </label>
            <Input
              id={field("admin-name")}
              onChange={(event) => update("adminFullName", event.target.value)}
              placeholder="Jane Smith"
              required={adminEmailProvided}
              value={form.adminFullName}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-[15px] text-ink" htmlFor={field("invite")}>
            <input
              checked={form.sendAdminInvite}
              className="mt-1 h-4 w-4 accent-[var(--color-blue)]"
              id={field("invite")}
              onChange={(event) => update("sendAdminInvite", event.target.checked)}
              type="checkbox"
            />
            Send the new admin a password-set invite email
          </label>
        </section>
      </form>
    </Drawer>
  );
}
