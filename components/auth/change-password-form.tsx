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
      <div className="space-y-4">
        <div>
          <p className="text-[12.5px] font-bold text-[#0a1628]">Step 1 — Verify MFA</p>
          <p className="mt-[2px] text-[11px] text-[#64748b]">
            Confirm your authenticator code before setting a new password.
          </p>
        </div>
        <MfaReauthGate onVerified={() => setMfaVerified(true)} purpose="changing your password" />
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <p className="text-[12.5px] font-bold text-[#0a1628]">Step 2 — New password</p>
        <p className="mt-[2px] text-[11px] text-[#64748b]">Minimum 8 characters. Use a unique passphrase you do not reuse elsewhere.</p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2.5 text-[11.5px] text-[#15803d]">
        <Shield className="h-4 w-4 shrink-0" />
        Identity verified — enter your new password below.
      </div>

      <label className="block space-y-1.5 text-[12px] font-semibold text-[#1e293b]">
        New password
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
          <Input
            autoComplete="new-password"
            className="border-[#e2eaf5] pl-10"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
      </label>

      <label className="block space-y-1.5 text-[12px] font-semibold text-[#1e293b]">
        Confirm new password
        <Input
          autoComplete="new-password"
          className="border-[#e2eaf5]"
          minLength={8}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type="password"
          value={confirmPassword}
        />
      </label>

      <Button className="bg-[#0071ce] hover:bg-[#0057a8]" disabled={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Update password
      </Button>
    </form>
  );
}
