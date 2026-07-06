"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MfaShieldCheckSvg } from "@/components/auth/mfa-icons";
import { QrCodeDisplay } from "@/components/auth/qr-code-display";
import { SP_BLUE_BTN, SP_INPUT_CLS } from "@/components/se/sp-form-primitives";
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
      <div className="flex items-center justify-center py-[32px]">
        <Loader2 className="h-6 w-6 animate-spin text-[#0071ce]" />
      </div>
    );
  }

  if (!enrollState) {
    return <p className="text-center text-sm text-[#64748b]">Unable to load MFA enrollment. Refresh and try again.</p>;
  }

  return (
    <div className="space-y-[18px]">
      <div className="rounded-xl border border-[#e2eaf5] bg-[#f8fafd] p-[14px_16px] text-[12px] leading-[1.6] text-[#475569]">
        Scan this QR code with Google Authenticator, 1Password, Okta Verify, or another TOTP app. MFA is mandatory for
        this platform.
      </div>

      <div className="mx-auto flex max-w-[220px] justify-center rounded-xl border border-[#e2eaf5] bg-white p-[16px]">
        <QrCodeDisplay qrCode={enrollState.qrCode} />
      </div>

      <div className="rounded-xl border border-dashed border-[#e2eaf5] bg-white p-[14px_16px]">
        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#94a3b8]">Manual setup key</p>
        <p className="mt-[6px] break-all font-mono text-[12px] text-[#0a1628]">{enrollState.secret}</p>
      </div>

      <form className="space-y-[14px]" onSubmit={handleVerify}>
        <label className="block space-y-[8px] text-[12.5px] font-semibold text-[#475569]">
          6-digit verification code
          <input
            autoComplete="one-time-code"
            className={`${SP_INPUT_CLS} text-center tracking-[0.2em]`}
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            pattern="[0-9]{6}"
            placeholder="123456"
            required
            value={code}
          />
        </label>

        <button
          className={`${SP_BLUE_BTN} w-full py-[13px] text-[14px]`}
          disabled={isVerifying || code.length !== 6}
          type="submit"
        >
          {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <MfaShieldCheckSvg />}
          Activate MFA
        </button>
      </form>
    </div>
  );
}
