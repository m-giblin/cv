"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OtpInput } from "@/components/auth/otp-input";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

export function MfaVerifyForm() {
 const router = useRouter();
 const [factorId, setFactorId] = useState<string | null>(null);
 const [code, setCode] = useState("");
 const [isLoading, setIsLoading] = useState(true);
 const [isVerifying, setIsVerifying] = useState(false);

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
 window.location.assign(AUTH_ROUTES.dashboard);
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
 <form className="space-y-6" onSubmit={handleVerify}>
 <OtpInput label="Authenticator code" onChange={setCode} value={code} />

 <button
 className="btn-primary inline-flex w-full items-center justify-center gap-2"
 disabled={isVerifying || code.length !== 6}
 type="submit"
 >
 {isVerifying ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
 {isVerifying ? "Verifying…" : "Verify and continue"}
 </button>
 </form>
 );
}
