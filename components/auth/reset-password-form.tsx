"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
 const router = useRouter();
 const passwordId = useId();
 const confirmId = useId();
 const [password, setPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [isReady, setIsReady] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);

 useEffect(() => {
 const supabase = createClient();

 if (!supabase) {
 return;
 }

 const {
 data: { subscription },
 } = supabase.auth.onAuthStateChange((event) => {
 if (event === "PASSWORD_RECOVERY") {
 setIsReady(true);
 }
 });

 void supabase.auth.getSession().then(({ data: { session } }) => {
 if (session) {
 setIsReady(true);
 }
 });

 return () => subscription.unsubscribe();
 }, []);

 async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
 event.preventDefault();

 if (password.length < 8) {
 toast.error("Password must be at least 8 characters.");
 return;
 }

 if (password !== confirmPassword) {
 toast.error("Passwords do not match.");
 return;
 }

 setIsSubmitting(true);
 const supabase = createClient();

 if (!supabase) {
 toast.error("Supabase is not configured.");
 setIsSubmitting(false);
 return;
 }

 const { error } = await supabase.auth.updateUser({ password });

 if (error) {
 toast.error(error.message);
 setIsSubmitting(false);
 return;
 }

 toast.success("Password updated. Sign in with your new password.");
 await supabase.auth.signOut();
 router.push(AUTH_ROUTES.login);
 router.refresh();
 }

 if (!isReady) {
 return (
 <div className="space-y-4 text-[15px] leading-normal text-ink-2">
 <p>Open the reset link from your email to set a new password.</p>
 <Link className="btn-secondary inline-block no-underline" href={AUTH_ROUTES.login}>
 Back to sign in
 </Link>
 </div>
 );
 }

 return (
 <form className="space-y-5" onSubmit={handleSubmit}>
 <div>
 <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={passwordId}>
 New password
 </label>
 <Input
 aria-describedby={`${passwordId}-hint`}
 autoComplete="new-password"
 id={passwordId}
 minLength={8}
 onChange={(event) => setPassword(event.target.value)}
 required
 type="password"
 value={password}
 />
 <p className="mt-1 text-[13px] text-muted" id={`${passwordId}-hint`}>
 At least 8 characters.
 </p>
 </div>

 <div>
 <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={confirmId}>
 Confirm password
 </label>
 <Input
 autoComplete="new-password"
 id={confirmId}
 minLength={8}
 onChange={(event) => setConfirmPassword(event.target.value)}
 required
 type="password"
 value={confirmPassword}
 />
 </div>

 <button className="btn-primary inline-flex w-full items-center justify-center gap-2" disabled={isSubmitting} type="submit">
 {isSubmitting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
 Save new password
 </button>
 </form>
 );
}
