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
      <div className="flex items-center gap-2 py-6 text-[12px] text-[#64748b]">
        <Loader2 className="h-5 w-5 animate-spin text-[#0071ce]" />
        Loading authenticator…
      </div>
    );
  }

  if (!factorId) {
    return (
      <p className="rounded-lg border border-[#fde68a] bg-[#fef3c7] p-4 text-[12px] leading-relaxed text-[#b45309]">
        Multi-factor authentication is required before you can change your password. Enroll MFA at sign-in, then return
        here.
      </p>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleVerify}>
      <div className="rounded-lg border border-[#e2eaf5] bg-[#f8fafd] p-3 text-[11.5px] leading-relaxed text-[#64748b]">
        For your security, confirm your authenticator code before {purpose.toLowerCase()}.
      </div>
      <label className="block space-y-1.5 text-[12px] font-semibold text-[#1e293b]">
        Authenticator code
        <Input
          autoComplete="one-time-code"
          className="border-[#e2eaf5]"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          pattern="[0-9]{6}"
          placeholder="123456"
          required
          value={code}
        />
      </label>
      <Button className="bg-[#0071ce] hover:bg-[#0057a8]" disabled={isVerifying || code.length !== 6} type="submit">
        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Verify identity
      </Button>
    </form>
  );
}
