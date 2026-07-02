"use client";

import { Loader2, LockKeyhole, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MfaReauthGate } from "@/components/auth/mfa-reauth-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const [mfaVerified, setMfaVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    if (!supabase) {
      toast.error("Supabase is not configured.");
      setIsSubmitting(false);
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") {
      toast.error("Verify MFA again before updating your password.");
      setMfaVerified(false);
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setIsSubmitting(false);
      return;
    }

    toast.success("Password updated.");
    setPassword("");
    setConfirmPassword("");
    setMfaVerified(false);
    setIsSubmitting(false);
  }

  if (!mfaVerified) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-sp-navy">
          <Shield className="h-4 w-4 text-sp-blue" />
          Step 1 — Verify MFA
        </div>
        <MfaReauthGate onVerified={() => setMfaVerified(true)} purpose="changing your password" />
      </div>
    );
  }

  return (
    <form className="max-w-md space-y-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <Shield className="h-4 w-4 shrink-0" />
        Identity verified — enter your new password below.
      </div>

      <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
        New password
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sp-blue/60" />
          <Input
            autoComplete="new-password"
            className="pl-10"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
      </label>

      <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
        Confirm new password
        <Input
          autoComplete="new-password"
          minLength={8}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type="password"
          value={confirmPassword}
        />
      </label>

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Update password
      </Button>
    </form>
  );
}
