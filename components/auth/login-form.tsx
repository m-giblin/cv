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

const inputClass =
 "w-full border border-[#D4D1CB] bg-white py-[11px] pl-[40px] pr-[14px] text-[14px] text-[#0D0E12] outline-none transition placeholder:text-[#B0ADA8] focus:border-[#0071CE]";

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
 <form className="space-y-[14px]" onSubmit={handleSubmit}>
 {ssoEnabled ? (
 <div className="lp-3">
 <button
 className="flex w-full items-center justify-center gap-[8px] border border-[#D4D1CB] bg-white py-[11px] text-[13px] font-semibold text-[#3D3C38] transition hover:border-[#0071CE] hover:text-[#0071CE]"
 disabled={isSubmitting}
 onClick={() => void handleSsoSignIn()}
 type="button"
 >
 <GlobeIcon />
 Continue with SSO
 </button>
 </div>
 ) : null}

 {ssoEnabled ? (
 <div className="lp-3 flex items-center gap-[12px]">
 <div className="h-px flex-1 bg-[#E2DFD9]" />
 <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#B0ADA8]">or password</span>
 <div className="h-px flex-1 bg-[#E2DFD9]" />
 </div>
 ) : null}

 <div className="lp-3">
 <label className="mb-[6px] block font-mono text-[9px] uppercase tracking-[0.1em] text-[#6B6860]">
 Email
 </label>
 <div className="relative">
 <MailIcon className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 opacity-50" />
 <input
 autoComplete="email"
 className={inputClass}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="you@company.com"
 required
 type="email"
 value={email}
 />
 </div>
 </div>

 <div className="lp-3">
 <div className="mb-[6px] flex items-center justify-between">
 <label className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#6B6860]">Password</label>
 <Link className="text-[11px] font-semibold text-[#0071CE] hover:text-[#005aab]" href="/login/forgot-password">
 Forgot?
 </Link>
 </div>
 <div className="relative">
 <LockIcon className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 opacity-50" />
 <input
 autoComplete="current-password"
 className={inputClass}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="••••••••"
 required
 type="password"
 value={password}
 />
 </div>
 </div>

 <div className="lp-4 pt-[4px]">
 <button
 className="flex w-full items-center justify-center gap-[8px] bg-[#0071CE] py-[12px] text-[13px] font-bold text-white transition hover:bg-[#005aab] disabled:opacity-60"
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
