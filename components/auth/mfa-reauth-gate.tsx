"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function MfaReauthGate({
  onVerified,
  purpose = "Continue",
}: {
  onVerified: () => void;
  purpose?: string;
}) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    async function loadFactor() {
      const supabase = createClient();
      if (!supabase) {
        toast.error("Supabase is not configured.");
        setIsLoading(false);
        return;
      }

      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      const verifiedFactor = factors.totp.find((factor) => factor.status === "verified");
      if (!verifiedFactor) {
        toast.error("Enroll MFA in your account settings before changing your password.");
        setIsLoading(false);
        return;
      }

      setFactorId(verifiedFactor.id);
      setIsLoading(false);
    }

    void loadFactor();
  }, []);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId) return;

    setIsVerifying(true);
    const supabase = createClient();
    if (!supabase) {
      setIsVerifying(false);
      return;
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      toast.error(challengeError.message);
      setIsVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      toast.error(verifyError.message);
      setIsVerifying(false);
      return;
    }

    toast.success("Identity verified.");
    onVerified();
    setIsVerifying(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-sp-navy-muted">
        <Loader2 className="h-5 w-5 animate-spin text-sp-blue" />
        Loading authenticator…
      </div>
    );
  }

  if (!factorId) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Multi-factor authentication is required before you can change your password. Enroll MFA at sign-in, then return
        here.
      </p>
    );
  }

  return (
    <form className="max-w-md space-y-4" onSubmit={handleVerify}>
      <div className="rounded-2xl border border-sp-blue/15 bg-sp-blue-soft/30 p-4 text-sm leading-6 text-sp-navy-muted">
        For your security, confirm your authenticator code before {purpose.toLowerCase()}.
      </div>
      <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
        Authenticator code
        <Input
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          pattern="[0-9]{6}"
          placeholder="123456"
          required
          value={code}
        />
      </label>
      <Button disabled={isVerifying || code.length !== 6} type="submit">
        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Verify identity
      </Button>
    </form>
  );
}
