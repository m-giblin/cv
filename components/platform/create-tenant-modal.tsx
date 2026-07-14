"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
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

function FieldLabel({
 children,
 hint,
 required,
}: {
 children: React.ReactNode;
 hint?: string;
 required?: boolean;
}) {
 return (
 <div className="space-y-1">
 <span className="block text-sm font-medium text-[#3D3C38]">
 {children}
 {required ? <span className="text-[#dc2626]"> *</span> : null}
 </span>
 {hint ? <p className="text-xs text-[#A09D98]">{hint}</p> : null}
 </div>
 );
}

const inputClassName =
 "w-full border border-[#E2DFD9] bg-white px-3 py-2 text-sm text-[#0D0E12] focus:border-[#0071ce] focus:outline-none focus:ring-2 focus:ring-[#0071ce]/20";

export function CreateTenantModal({ open, creating, onClose, onSubmit }: CreateTenantModalProps) {
 const [form, setForm] = useState<CreateTenantFormValues>(EMPTY_FORM);
 const [slugTouched, setSlugTouched] = useState(false);
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
 setMounted(true);
 }, []);

 useEffect(() => {
 if (!open) {
 setForm(EMPTY_FORM);
 setSlugTouched(false);
 }
 }, [open]);

 useEffect(() => {
 if (!open) return;
 function onKeyDown(event: KeyboardEvent) {
 if (event.key === "Escape" && !creating) onClose();
 }
 window.addEventListener("keydown", onKeyDown);
 const previousOverflow = document.body.style.overflow;
 document.body.style.overflow = "hidden";
 return () => {
 window.removeEventListener("keydown", onKeyDown);
 document.body.style.overflow = previousOverflow;
 };
 }, [open, creating, onClose]);

 if (!open || !mounted) return null;

 function update<K extends keyof CreateTenantFormValues>(key: K, value: CreateTenantFormValues[K]) {
 setForm((current) => {
 const next = { ...current, [key]: value };
 if (key === "name" && !slugTouched) {
 next.slug = slugify(String(value));
 }
 return next;
 });
 }

 function handleSubmit() {
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

 return createPortal(
 <div className="fixed inset-0 z-[100] overflow-y-auto">
 <button
 aria-label="Close create tenant dialog"
 className="fixed inset-0 bg-[#00143a]/45 backdrop-blur-[2px]"
 disabled={creating}
 onClick={onClose}
 type="button"
 />

 <div className="relative flex min-h-full justify-center p-4 pb-8 pt-[max(1.5rem,6vh)] sm:p-6">
 <div
 aria-labelledby="create-tenant-title"
 aria-modal="true"
 className="relative flex max-h-[min(88vh,880px)] w-full max-w-2xl flex-col overflow-hidden border border-[#E2DFD9] bg-white /20"
 role="dialog"
 >
 <div className="border-b border-[#E2DFD9] bg-gradient-to-br from-[#f0f7ff] via-white to-[#F9F8F6] px-6 py-5">
 <div className="flex items-start justify-between gap-4">
 <div>
 <p className="text-xs font-bold uppercase tracking-wider text-[#0071ce]">New organization</p>
 <h2 className="mt-1 text-xl font-bold text-[#0D0E12]" id="create-tenant-title">
 Create tenant
 </h2>
 <p className="mt-1 text-sm text-[#6B6860]">
 Set up the organization, access rules, branding, and optional first admin invite.
 </p>
 </div>
 <button
 aria-label="Close"
 className="p-2 text-[#6B6860] transition hover:bg-[#ECEAE6] hover:text-[#0D0E12] disabled:opacity-50"
 disabled={creating}
 onClick={onClose}
 type="button"
 >
 <X className="h-5 w-5" />
 </button>
 </div>
 </div>

 <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
 <section className="space-y-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B6860]">Organization</h3>
 <label className="block space-y-1.5">
 <FieldLabel hint="Display name shown across the platform." required>
 Organization name
 </FieldLabel>
 <input
 autoFocus
 className={inputClassName}
 onChange={(event) => update("name", event.target.value)}
 placeholder="Acme Corp"
 value={form.name}
 />
 </label>
 <label className="block space-y-1.5">
 <FieldLabel hint="URL-safe identifier. Used internally; auto-generated from name.">
 Tenant slug
 </FieldLabel>
 <input
 className={inputClassName}
 onChange={(event) => {
 setSlugTouched(true);
 update("slug", slugify(event.target.value));
 }}
 placeholder="acme-corp"
 value={form.slug}
 />
 </label>
 </section>

 <section className="space-y-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B6860]">Access & branding</h3>
 <div className="grid gap-3 sm:grid-cols-2">
 <label className="block space-y-1.5">
 <FieldLabel>Primary color</FieldLabel>
 <div className="flex gap-2">
 <input
 className="h-10 w-12 cursor-pointer border border-[#E2DFD9] p-1"
 onChange={(event) => update("primaryColor", event.target.value)}
 type="color"
 value={form.primaryColor}
 />
 <input
 className={inputClassName}
 onChange={(event) => update("primaryColor", event.target.value)}
 placeholder="#0071ce"
 value={form.primaryColor}
 />
 </div>
 </label>
 <label className="block space-y-1.5">
 <FieldLabel hint="Optional logo for tenant-branded experiences.">Logo URL</FieldLabel>
 <input
 className={inputClassName}
 onChange={(event) => update("logoUrl", event.target.value)}
 placeholder="https://cdn.example.com/logo.svg"
 value={form.logoUrl}
 />
 </label>
 </div>
 <label className="block space-y-1.5">
 <FieldLabel hint="Comma-separated list. Only these domains may sign in for this tenant.">
 Allowed email domains
 </FieldLabel>
 <input
 className={inputClassName}
 onChange={(event) => update("allowedEmailDomains", event.target.value)}
 placeholder="acme.com, acme.io"
 value={form.allowedEmailDomains}
 />
 </label>
 <label className="block space-y-1.5">
 <FieldLabel hint="Shown on login or first visit for this tenant.">Welcome message</FieldLabel>
 <Textarea
 className="min-h-[88px] border-[#E2DFD9] text-sm"
 onChange={(event) => update("welcomeMessage", event.target.value)}
 placeholder="Welcome to Acme SE Enablement…"
 value={form.welcomeMessage}
 />
 </label>
 </section>

 <section className="space-y-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B6860]">First tenant admin</h3>
 <p className="text-sm text-[#6B6860]">
 Optionally invite the initial administrator who will manage users and settings for this tenant.
 </p>
 <div className="grid gap-3 sm:grid-cols-2">
 <label className="block space-y-1.5">
 <FieldLabel>Admin email</FieldLabel>
 <input
 className={inputClassName}
 onChange={(event) => update("adminEmail", event.target.value)}
 placeholder="admin@acme.com"
 type="email"
 value={form.adminEmail}
 />
 </label>
 <label className="block space-y-1.5">
 <FieldLabel required={adminEmailProvided}>Admin full name</FieldLabel>
 <input
 className={inputClassName}
 onChange={(event) => update("adminFullName", event.target.value)}
 placeholder="Jane Smith"
 value={form.adminFullName}
 />
 </label>
 </div>
 <label className="flex cursor-pointer items-center gap-2 text-sm text-[#3D3C38]">
 <input
 checked={form.sendAdminInvite}
 className="h-4 w-4 rounded border-[#E2DFD9] text-[#0071ce] focus:ring-[#0071ce]/30"
 onChange={(event) => update("sendAdminInvite", event.target.checked)}
 type="checkbox"
 />
 Send password-reset invite email to the new admin
 </label>
 </section>
 </div>

 <div className="flex items-center justify-end gap-3 border-t border-[#E2DFD9] bg-[#F9F8F6] px-6 py-4">
 <Button disabled={creating} onClick={onClose} type="button" variant="outline">
 Cancel
 </Button>
 <Button disabled={creating || !canSubmit} onClick={handleSubmit} type="button">
 {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
 Create tenant
 </Button>
 </div>
 </div>
 </div>
 </div>,
 document.body,
 );
}
