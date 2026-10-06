"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ALLOWED_EMAIL_DOMAIN, allowedEmailError } from "@/lib/auth/email-domain";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
 const emailId = useId();
 const [email, setEmail] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [sent, setSent] = useState(false);

 async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
 event.preventDefault();

 const domainError = allowedEmailError(email);

 if (domainError) {
 toast.error(domainError);
 return;
 }

 setIsSubmitting(true);
 const supabase = createClient();

 if (!supabase) {
 toast.error("Supabase is not configured.");
 setIsSubmitting(false);
 return;
 }

 const redirectTo = `${window.location.origin}/auth/reset-password`;

 const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
 redirectTo,
 });

 if (error) {
 toast.error(error.message);
 setIsSubmitting(false);
 return;
 }

 setSent(true);
 setIsSubmitting(false);
 toast.success("Password reset email sent.");
 }

 if (sent) {
 return (
 <div className="space-y-4 text-[15px] leading-normal text-ink-2" role="status">
 <p>
 If an account exists for <strong className="font-semibold text-ink">{email}</strong>, we sent a reset link to
 that inbox.
 </p>
 <p>Check spam, then open the link to choose a new password.</p>
 <Link className="btn-secondary inline-block no-underline" href={AUTH_ROUTES.login}>
 Back to sign in
 </Link>
 </div>
 );
 }

 return (
 <form className="space-y-5" onSubmit={handleSubmit}>
 <div>
 <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={emailId}>
 Work email
 </label>
 <Input
 autoComplete="email"
 id={emailId}
 onChange={(event) => setEmail(event.target.value)}
 placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
 required
 type="email"
 value={email}
 />
 </div>

 <button className="btn-primary inline-flex w-full items-center justify-center gap-2" disabled={isSubmitting} type="submit">
 {isSubmitting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
 Send reset link
 </button>
 </form>
 );
}
