"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OtpInput } from "@/components/design/otp-input";
import { MfaShieldCheckSvg } from "@/components/auth/mfa-icons";
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
 <div className="flex items-center justify-center py-[32px]">
 <Loader2 className="h-6 w-6 animate-spin text-[#0071ce]" />
 </div>
 );
 }

 return (
 <form className="space-y-0" onSubmit={handleVerify}>
 <div className="mb-[24px]">
 <label className="mb-[12px] block text-center font-mono text-[9px] uppercase tracking-[0.1em] text-[#6B6860]">
 Authenticator code
 </label>

 <OtpInput onChange={setCode} value={code} />

 <p className="mt-[10px] text-center font-mono text-[9px] text-[#B0ADA8]">Code refreshes every 30 seconds</p>
 </div>

 <div>
 <button
 className="flex w-full items-center justify-center gap-[8px] bg-[#0071CE] py-[12px] text-[13px] font-bold text-white transition hover:bg-[#005aab] disabled:cursor-not-allowed disabled:opacity-45"
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
