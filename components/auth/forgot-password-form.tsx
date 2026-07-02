"use client";

import { Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALLOWED_EMAIL_DOMAIN, allowedEmailError } from "@/lib/auth/email-domain";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
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
      <div className="space-y-4 text-sm leading-6 text-sp-navy-muted">
        <p>
          If an account exists for <strong className="text-sp-navy">{email}</strong>, we sent a reset link to that
          inbox.
        </p>
        <p>Check spam, then open the link to choose a new password.</p>
        <Button asChild className="w-full" variant="outline">
          <Link href={AUTH_ROUTES.login}>Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
        SailPoint email
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sp-blue/60" />
          <Input
            autoComplete="email"
            className="pl-10"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
            required
            type="email"
            value={email}
          />
        </div>
      </label>

      <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Send reset link
      </Button>

      <Button asChild className="w-full" type="button" variant="ghost">
        <Link href={AUTH_ROUTES.login}>Back to sign in</Link>
      </Button>
    </form>
  );
}
