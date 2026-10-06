"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

/** "Enter the six-digit code for {email}." — the email is only known client-side. */
export function MfaVerifyDescription() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    void createClient()
      ?.auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  return <>Enter the six-digit code for {email ?? "your account"}.</>;
}

export function MfaVerifyForm() {
  const router = useRouter();
  const codeId = useId();
  const errorId = useId();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFactor() {
      const supabase = createClient();
      if (!supabase) {
        setError("Sign-in is not configured.");
        setIsLoading(false);
        return;
      }
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) {
        setError(listError.message);
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
    if (isVerifying || !factorId) return;
    setError(null);
    if (code.length !== 6) {
      setError("The code is six digits.");
      return;
    }
    setIsVerifying(true);
    const supabase = createClient();
    if (!supabase) {
      setError("Sign-in is not configured.");
      setIsVerifying(false);
      return;
    }
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setError(challengeError.message);
      setIsVerifying(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (verifyError) {
      setError(verifyError.message);
      setIsVerifying(false);
      return;
    }
    window.location.assign(AUTH_ROUTES.dashboard);
  }

  async function switchAccount() {
    await createClient()?.auth.signOut();
    window.location.assign(AUTH_ROUTES.login);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-muted" role="status">
        <Loader2 aria-hidden className="h-5 w-5 animate-spin text-blue" />
        <span className="text-sm">Checking your authenticator…</span>
      </div>
    );
  }

  return (
    <form
      aria-describedby={error ? errorId : undefined}
      className="flex flex-col gap-[18px]"
      noValidate
      onSubmit={handleVerify}
    >
      {error ? (
        <p
          className="m-0 rounded-[10px] border border-danger bg-danger-soft px-3.5 py-2.5 text-sm leading-[1.45] text-danger"
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <label className="flex flex-col gap-2 text-sm font-bold text-ink" htmlFor={codeId}>
        Six-digit code
        <input
          autoComplete="one-time-code"
          className="num rounded-[10px] border border-line-strong bg-white px-3.5 py-3 text-center text-[28px] font-extrabold tracking-[0.4em] text-ink placeholder:text-[#8A8F9C] focus:border-blue focus:shadow-[0_0_0_3px_var(--color-blue-soft)] focus:outline-none"
          id={codeId}
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          value={code}
        />
      </label>
      <button className="btn-primary inline-flex w-full items-center justify-center gap-2 !py-3" disabled={isVerifying} type="submit">
        {isVerifying ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
        {isVerifying ? "Verifying…" : "Verify and continue"}
      </button>
      <button className="link self-start text-sm" onClick={() => void switchAccount()} type="button">
        Use a different account
      </button>
    </form>
  );
}
