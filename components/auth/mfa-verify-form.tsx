"use client";

import { Loader2 } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MfaShieldCheckSvg } from "@/components/auth/mfa-icons";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

export function MfaVerifyForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const focusedIndex = code.length < 6 ? code.length : null;

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
      <div className="flex items-center justify-center py-[32px]">
        <Loader2 className="h-6 w-6 animate-spin text-[#0071ce]" />
      </div>
    );
  }

  return (
    <form className="space-y-0" onSubmit={handleVerify}>
      <div className="fade-up delay-3 mb-[24px]">
        <label className="mb-[12px] block text-center text-[12.5px] font-semibold text-[#475569]">
          Authenticator code
        </label>

        <div
          className="flex justify-center gap-[10px]"
          onClick={() => inputRef.current?.focus()}
          onKeyDown={() => inputRef.current?.focus()}
          role="presentation"
        >
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Fragment key={index}>
              {index === 3 ? (
                <div className="flex items-center">
                  <span className="text-[20px] font-light leading-none text-[#d0dae8]">—</span>
                </div>
              ) : null}
              <div
                className="flex h-[62px] w-[52px] cursor-text items-center justify-center rounded-xl border-[1.5px] font-display text-[24px] font-extrabold text-[#0a1628] transition"
                style={{
                  borderColor: code[index] ? "#0071ce" : focusedIndex === index ? "#0071ce" : "#e2eaf5",
                  background: code[index] ? "#f0f7ff" : "white",
                  boxShadow: focusedIndex === index ? "0 0 0 3px rgba(0,113,206,0.12)" : "none",
                }}
              >
                {code[index] ?? ""}
              </div>
            </Fragment>
          ))}
        </div>

        <input
          autoComplete="one-time-code"
          autoFocus
          className="sr-only"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          ref={inputRef}
          type="text"
          value={code}
        />

        <p className="mt-[10px] text-center text-[11.5px] text-[#94a3b8]">Code refreshes every 30 seconds</p>
      </div>

      <div className="fade-up delay-4">
        <button
          className="flex w-full items-center justify-center gap-[8px] rounded-[10px] bg-[#0071ce] py-[13px] text-[14px] font-bold text-white transition hover:-translate-y-px hover:bg-[#005aab] hover:shadow-[0_6px_20px_rgba(0,113,206,0.32)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isVerifying || code.length !== 6}
          type="submit"
        >
          {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <MfaShieldCheckSvg />}
          Verify and continue
        </button>
      </div>
    </form>
  );
}
