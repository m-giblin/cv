"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { QrCodeDisplay } from "@/components/auth/qr-code-display";
import { OtpInput } from "@/components/auth/otp-input";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { mfaTotpIssuer } from "@/lib/auth/mfa-issuer";
import { createClient } from "@/lib/supabase/client";

type EnrollState = {
 factorId: string;
 qrCode: string;
 secret: string;
};

export function MfaEnrollForm() {
 const router = useRouter();
 const [enrollState, setEnrollState] = useState<EnrollState | null>(null);
 const [code, setCode] = useState("");
 const [isLoading, setIsLoading] = useState(true);
 const [isVerifying, setIsVerifying] = useState(false);

 useEffect(() => {
 async function startEnrollment() {
 const supabase = createClient();

 if (!supabase) {
 toast.error("Supabase is not configured.");
 setIsLoading(false);
 return;
 }

 const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();

 if (listError) {
 toast.error(listError.message);
 setIsLoading(false);
 return;
 }

 const verifiedFactor = factors.totp.find((factor) => factor.status === "verified");

 if (verifiedFactor) {
 router.replace(AUTH_ROUTES.mfaVerify);
 return;
 }

 const unverifiedFactors = factors.totp.filter((item) => item.status !== "verified");

 for (const factor of unverifiedFactors) {
 await supabase.auth.mfa.unenroll({ factorId: factor.id });
 }

 const { data, error } = await supabase.auth.mfa.enroll({
 factorType: "totp",
 friendlyName: "SE Enablement Authenticator",
 issuer: mfaTotpIssuer(),
 });

 if (error) {
 toast.error(error.message);
 setIsLoading(false);
 return;
 }

 if (!data?.totp) {
 toast.error("Unable to start MFA enrollment.");
 setIsLoading(false);
 return;
 }

 setEnrollState({
 factorId: data.id,
 qrCode: data.totp.qr_code,
 secret: data.totp.secret,
 });
 setIsLoading(false);
 }

 void startEnrollment();
 }, [router]);

 async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
 event.preventDefault();

 if (!enrollState) {
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
 factorId: enrollState.factorId,
 });

 if (challengeError) {
 toast.error(challengeError.message);
 setIsVerifying(false);
 return;
 }

 const { error: verifyError } = await supabase.auth.mfa.verify({
 factorId: enrollState.factorId,
 challengeId: challenge.id,
 code,
 });

 if (verifyError) {
 toast.error(verifyError.message);
 setIsVerifying(false);
 return;
 }

 toast.success("Authenticator enrolled. Your session is now MFA-protected.");
 window.location.assign(AUTH_ROUTES.dashboard);
 }

 if (isLoading) {
 return (
 <div className="flex items-center justify-center gap-2 py-8 text-muted" role="status">
 <Loader2 aria-hidden className="h-5 w-5 animate-spin text-blue" />
 <span className="text-sm">Preparing your QR code…</span>
 </div>
 );
 }

 if (!enrollState) {
 return (
 <p className="rounded-[10px] border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger" role="alert">
 Unable to load MFA enrollment. Refresh and try again.
 </p>
 );
 }

 return (
 <div className="space-y-6">
 <div className="mx-auto w-fit rounded-[14px] border border-line bg-white p-4">
 <QrCodeDisplay qrCode={enrollState.qrCode} />
 </div>

 <div className="rounded-[12px] border border-dashed border-line-strong px-4 py-3">
 <p className="label-caps label-caps--blue">Can&apos;t scan? Enter this key</p>
 <p className="num mt-1.5 text-[15px] font-semibold break-all text-ink">{enrollState.secret}</p>
 </div>

 <form className="space-y-6" onSubmit={handleVerify}>
 <OtpInput label="6-digit verification code" onChange={setCode} value={code} />

 <button
 className="btn-primary inline-flex w-full items-center justify-center gap-2"
 disabled={isVerifying || code.length !== 6}
 type="submit"
 >
 {isVerifying ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
 {isVerifying ? "Activating…" : "Activate MFA"}
 </button>
 </form>
 </div>
 );
}
