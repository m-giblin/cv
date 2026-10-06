"use client";

import { Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { MfaReauthGate } from "@/components/auth/mfa-reauth-gate";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
 const passwordId = useId();
 const confirmId = useId();
 const [mfaVerified, setMfaVerified] = useState(false);
 const [password, setPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);

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

 const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
 if (aal?.currentLevel !== "aal2") {
 toast.error("Verify MFA again before updating your password.");
 setMfaVerified(false);
 setIsSubmitting(false);
 return;
 }

 const { error } = await supabase.auth.updateUser({ password });

 if (error) {
 toast.error(error.message);
 setIsSubmitting(false);
 return;
 }

 toast.success("Password updated.");
 setPassword("");
 setConfirmPassword("");
 setMfaVerified(false);
 setIsSubmitting(false);
 }

 if (!mfaVerified) {
 return (
 <div className="space-y-4">
 <div>
 <p className="label-caps label-caps--blue">Step 1 of 2</p>
 <h2 className="mt-1 text-lg leading-[1.3] font-extrabold text-ink">Verify MFA</h2>
 </div>
 <MfaReauthGate onVerified={() => setMfaVerified(true)} purpose="changing your password" />
 </div>
 );
 }

 return (
 <form className="space-y-5" onSubmit={handleSubmit}>
 <div>
 <p className="label-caps label-caps--blue">Step 2 of 2</p>
 <h2 className="mt-1 text-lg leading-[1.3] font-extrabold text-ink">New password</h2>
 <p className="mt-1 text-sm text-muted">At least 8 characters. Use a passphrase you don&apos;t use anywhere else.</p>
 </div>

 <p className="rounded-[10px] border border-success/30 bg-success-soft px-3.5 py-2.5 text-sm text-success" role="status">
 Identity verified. Enter your new password.
 </p>

 <div>
 <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={passwordId}>
 New password
 </label>
 <Input
 autoComplete="new-password"
 id={passwordId}
 minLength={8}
 onChange={(event) => setPassword(event.target.value)}
 required
 type="password"
 value={password}
 />
 </div>

 <div>
 <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor={confirmId}>
 Confirm new password
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

 <button className="btn-primary inline-flex items-center gap-2" disabled={isSubmitting} type="submit">
 {isSubmitting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
 Update password
 </button>
 </form>
 );
}
