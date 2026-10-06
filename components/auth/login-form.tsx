"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { allowedEmailError } from "@/lib/auth/email-domain";
import { mapAuthErrorMessage } from "@/lib/auth/errors";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ initialError }: { initialError?: string | null }) {
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    if (initialError) {
      toast.error(initialError);
    }
  }, [initialError]);

  function fail(message: string) {
    setError(message);
    toast.error(message);
  }

  async function handleSsoSignIn() {
    const supabase = createClient();
    if (!supabase) return;

    setIsSubmitting(true);
    const domain = process.env.NEXT_PUBLIC_SSO_DOMAIN ?? "sailpoint.com";

    const { data, error: ssoError } = await supabase.auth.signInWithSSO({ domain });

    if (ssoError) {
      fail(ssoError.message);
      setIsSubmitting(false);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  }

  const ssoEnabled = Boolean(process.env.NEXT_PUBLIC_SSO_DOMAIN);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const domainError = allowedEmailError(email);

    if (domainError) {
      fail(domainError);
      return;
    }

    setIsSubmitting(true);

    const supabase = createClient();

    if (!supabase) {
      fail("Supabase is not configured. Check your environment variables.");
      setIsSubmitting(false);
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      fail(mapAuthErrorMessage(signInError.message));
      setIsSubmitting(false);
      return;
    }

    const user = signInData.user;

    if (!user?.email || allowedEmailError(user.email)) {
      await supabase.auth.signOut();
      fail(allowedEmailError(user?.email ?? "") ?? "Sign-in was denied.");
      setIsSubmitting(false);
      return;
    }

    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      fail(aalError.message);
      setIsSubmitting(false);
      return;
    }

    let destination: (typeof AUTH_ROUTES)[keyof typeof AUTH_ROUTES] = AUTH_ROUTES.mfaEnroll;
    if (aal?.currentLevel === "aal2") {
      destination = AUTH_ROUTES.dashboard;
    } else if (aal?.nextLevel === "aal2") {
      destination = AUTH_ROUTES.mfaVerify;
    }

    // Full navigation so Supabase auth cookies are on the request before middleware runs.
    window.location.assign(destination);
  }

  return (
    <form aria-describedby={error ? errorId : undefined} className="space-y-5" onSubmit={handleSubmit}>
      {error ? (
        <p className="rounded-[10px] border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger" id={errorId} role="alert">
          {error}
        </p>
      ) : null}

      {ssoEnabled ? (
        <>
          <button
            className="btn-secondary w-full"
            disabled={isSubmitting}
            onClick={() => void handleSsoSignIn()}
            type="button"
          >
            Continue with SSO
          </button>
          <div className="flex items-center gap-3" role="presentation">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[13px] text-muted">or use a password</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={emailId}>
          Work email
        </label>
        <Input
          autoComplete="email"
          id={emailId}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          type="email"
          value={email}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label className="block text-sm font-semibold text-ink" htmlFor={passwordId}>
            Password
          </label>
          <Link className="link text-sm" href="/login/forgot-password">
            Forgot password?
          </Link>
        </div>
        <Input
          autoComplete="current-password"
          id={passwordId}
          onChange={(e) => setPassword(e.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      <button className="btn-primary inline-flex w-full items-center justify-center gap-2" disabled={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
