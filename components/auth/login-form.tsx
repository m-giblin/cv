"use client";

import Link from "next/link";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allowedEmailDomainsLabel, allowedEmailError } from "@/lib/auth/email-domain";
import { mapAuthErrorMessage } from "@/lib/auth/errors";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ initialError }: { initialError?: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialError) {
      toast.error(initialError);
    }
  }, [initialError]);

  async function handleSsoSignIn() {
    const supabase = createClient();
    if (!supabase) return;

    setIsSubmitting(true);
    const domain = process.env.NEXT_PUBLIC_SSO_DOMAIN ?? "sailpoint.com";

    const { data, error } = await supabase.auth.signInWithSSO({ domain });

    if (error) {
      toast.error(error.message);
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

    const domainError = allowedEmailError(email);

    if (domainError) {
      toast.error(domainError);
      return;
    }

    setIsSubmitting(true);

    const supabase = createClient();

    if (!supabase) {
      toast.error("Supabase is not configured. Check your environment variables.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      toast.error(mapAuthErrorMessage(error.message));
      setIsSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email || allowedEmailError(user.email)) {
      await supabase.auth.signOut();
      toast.error(`Only ${allowedEmailDomainsLabel()} email addresses can sign in.`);
      setIsSubmitting(false);
      return;
    }

    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      toast.error(aalError.message);
      setIsSubmitting(false);
      return;
    }

    if (aal.currentLevel === "aal2") {
      router.push(AUTH_ROUTES.dashboard);
      router.refresh();
      return;
    }

    if (aal.nextLevel === "aal2") {
      router.push(AUTH_ROUTES.mfaVerify);
      router.refresh();
      return;
    }

    router.push(AUTH_ROUTES.mfaEnroll);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-sp-blue/10 bg-sp-blue-soft/30 px-4 py-3 text-sm text-sp-navy-muted">
        Access is restricted to <span className="font-semibold text-sp-navy">{allowedEmailDomainsLabel()}</span> accounts
        only.
      </div>

      <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
        SailPoint email address
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sp-blue/60" />
          <Input
            autoComplete="email"
            className="pl-10"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={`you@sailpoint.com or demo.se@example.com`}
            required
            type="email"
            value={email}
          />
        </div>
        <span className="text-xs font-normal text-sp-navy-muted/80">
          Use your full email — not a username. Login checks Supabase Auth, not the profiles table alone.
        </span>
      </label>

      <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
        Password
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sp-blue/60" />
          <Input
            autoComplete="current-password"
            className="pl-10"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
      </label>

      <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Sign in with password
      </Button>

      {ssoEnabled ? (
        <Button className="w-full" disabled={isSubmitting} onClick={() => void handleSsoSignIn()} type="button" variant="outline">
          Sign in with SailPoint SSO
        </Button>
      ) : null}

      <p className="text-center text-sm">
        <Link className="font-semibold text-sp-blue hover:text-sp-blue-deep" href="/login/forgot-password">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
