"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRightIcon, GlobeIcon, LockIcon, MailIcon } from "@/components/auth/login-icons";
import { allowedEmailError } from "@/lib/auth/email-domain";
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
      toast.error(allowedEmailError(user?.email ?? "") ?? "Sign-in was denied.");
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
    <form className="space-y-[16px]" onSubmit={handleSubmit}>
      {ssoEnabled ? (
        <div className="fade-up delay-2">
          <button
            className="flex w-full items-center justify-center gap-[8px] rounded-[10px] bg-white py-[12px] text-[14px] font-semibold text-[#1e293b] transition hover:border-[#0071ce] hover:text-[#0071ce] hover:shadow-[0_2px_10px_rgba(0,113,206,0.1)]"
            disabled={isSubmitting}
            onClick={() => void handleSsoSignIn()}
            style={{ border: "1.5px solid #e2eaf5" }}
            type="button"
          >
            <GlobeIcon />
            Continue with SailPoint SSO
          </button>
        </div>
      ) : null}

      {ssoEnabled ? (
        <div className="fade-up delay-2 flex items-center gap-[12px]">
          <div className="h-px flex-1 bg-[#e2eaf5]" />
          <span className="text-[12px] font-medium text-[#94a3b8]">or sign in with password</span>
          <div className="h-px flex-1 bg-[#e2eaf5]" />
        </div>
      ) : null}

      <div className="fade-up delay-3">
        <label className="mb-[6px] block text-[12.5px] font-semibold text-[#475569]">
          SailPoint email address
        </label>
        <div className="relative">
          <MailIcon className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2" />
          <input
            autoComplete="email"
            className="w-full rounded-[10px] border-[1.5px] border-[#e2eaf5] bg-white py-[11px] pl-[40px] pr-[14px] text-[14px] text-[#1e293b] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0071ce] focus:shadow-[0_0_0_3px_rgba(0,113,206,0.12)]"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@sailpoint.com or demo.se@example.com"
            required
            type="email"
            value={email}
          />
        </div>
      </div>

      <div className="fade-up delay-3">
        <div className="mb-[6px] flex items-center justify-between">
          <label className="text-[12.5px] font-semibold text-[#475569]">Password</label>
          <Link
            className="text-[12px] font-semibold text-[#0071ce] hover:text-[#005aab]"
            href="/login/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2" />
          <input
            autoComplete="current-password"
            className="w-full rounded-[10px] border-[1.5px] border-[#e2eaf5] bg-white py-[11px] pl-[40px] pr-[14px] text-[14px] text-[#1e293b] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0071ce] focus:shadow-[0_0_0_3px_rgba(0,113,206,0.12)]"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            type="password"
            value={password}
          />
        </div>
      </div>

      <div className="fade-up delay-4">
        <button
          className="flex w-full items-center justify-center gap-[8px] rounded-[10px] bg-[#0071ce] py-[13px] text-[14px] font-bold text-white transition hover:-translate-y-px hover:bg-[#005aab] hover:shadow-[0_6px_20px_rgba(0,113,206,0.32)] disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightIcon />}
          Sign in
        </button>
      </div>
    </form>
  );
}
