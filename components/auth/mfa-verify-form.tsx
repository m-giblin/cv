"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

export function MfaVerifyForm() {
  const router = useRouter();
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
        router.replace(AUTH_ROUTES.mfaEnroll);
        return;
      }

      setFactorId(verifiedFactor.id);
      setIsLoading(false);
    }

    void loadFactor();
  }, [router]);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!factorId) {
      return;
    }

    setIsVerifying(true);
    const supabase = createClient();

    if (!supabase) {
      toast.error("Supabase is not configured.");
      setIsVerifying(false);
      return;
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

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

    toast.success("MFA verified.");
    router.push(AUTH_ROUTES.dashboard);
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-sp-navy-muted">
        <Loader2 className="h-6 w-6 animate-spin text-sp-blue" />
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleVerify}>
      <div className="rounded-2xl border border-sp-magenta/15 bg-sp-magenta-soft/30 p-4 text-sm leading-6 text-sp-navy-muted">
        Open your authenticator app and enter the current 6-digit code to finish signing in.
      </div>

      <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
        Authenticator code
        <Input
          autoComplete="one-time-code"
          autoFocus
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          pattern="[0-9]{6}"
          placeholder="123456"
          required
          value={code}
        />
      </label>

      <Button className="w-full" disabled={isVerifying || code.length !== 6} size="lg" type="submit">
        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Verify and continue
      </Button>
    </form>
  );
}
