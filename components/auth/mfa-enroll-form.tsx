"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrCodeDisplay } from "@/components/auth/qr-code-display";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

type EnrollState = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function MfaEnrollForm() {
  const router = useRouter();
  const [enrollState, setEnrollState] = useState<EnrollState | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    async function startEnrollment() {
      const supabase = createClient();

      if (!supabase) {
        toast.error("Supabase is not configured.");
        setIsLoading(false);
        return;
      }

      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();

      if (listError) {
        toast.error(listError.message);
        setIsLoading(false);
        return;
      }

      const verifiedFactor = factors.totp.find((factor) => factor.status === "verified");

      if (verifiedFactor) {
        router.replace(AUTH_ROUTES.mfaVerify);
        return;
      }

      const unverifiedFactors = factors.totp.filter((item) => item.status !== "verified");

      for (const factor of unverifiedFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "SE Enablement Authenticator",
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (!data?.totp) {
        toast.error("Unable to start MFA enrollment.");
        setIsLoading(false);
        return;
      }

      setEnrollState({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setIsLoading(false);
    }

    void startEnrollment();
  }, [router]);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enrollState) {
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
      factorId: enrollState.factorId,
    });

    if (challengeError) {
      toast.error(challengeError.message);
      setIsVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrollState.factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      toast.error(verifyError.message);
      setIsVerifying(false);
      return;
    }

    toast.success("Authenticator enrolled. Your session is now MFA-protected.");
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

  if (!enrollState) {
    return <p className="text-sm text-sp-navy-muted">Unable to load MFA enrollment. Refresh and try again.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-sp-blue/10 bg-sp-blue-soft/30 p-4 text-sm leading-6 text-sp-navy-muted">
        Scan this QR code with Google Authenticator, 1Password, Okta Verify, or another TOTP app. MFA is mandatory for
        this platform.
      </div>

      <div className="mx-auto flex max-w-[220px] justify-center rounded-2xl border border-sp-blue/10 bg-white p-4">
        <QrCodeDisplay qrCode={enrollState.qrCode} />
      </div>

      <div className="rounded-2xl border border-dashed border-sp-blue/20 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-sp-navy-muted">Manual setup key</p>
        <p className="mt-2 break-all font-mono text-sm text-sp-navy">{enrollState.secret}</p>
      </div>

      <form className="space-y-4" onSubmit={handleVerify}>
        <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
          6-digit verification code
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

        <Button className="w-full" disabled={isVerifying || code.length !== 6} size="lg" type="submit">
          {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Activate MFA
        </Button>
      </form>
    </div>
  );
}
