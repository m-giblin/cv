import Link from "next/link";
import { MfaVerifyForm } from "@/components/auth/mfa-verify-form";
import { MfaLockIconFooter } from "@/components/auth/mfa-icons";

export function MfaRightPanel() {
 return (
 <div className="flex flex-1 items-center justify-center bg-[#F5F4F0] p-[48px_40px]">
 <div className="w-full max-w-[360px] fade-in">
 <div className="mb-[20px] lp-1">
 <Link
 className="inline-flex items-center gap-[6px] font-mono text-[10px] text-[#6B6860] transition hover:text-[#0071CE]"
 href="/login"
 >
 <svg aria-hidden fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 16 16" width="14">
 <path d="M13 8H3M7 4l-4 4 4 4" />
 </svg>
 Back to sign in
 </Link>
 </div>

 <div className="mb-[32px] flex items-center gap-[6px] lp-2">
 <div className="flex h-[20px] w-[20px] items-center justify-center border border-[#D4D1CB]">
 <span className="font-mono text-[8px] text-[#B0ADA8]">1</span>
 </div>
 <span className="font-mono text-[10px] text-[#B0ADA8]">Sign in</span>
 <div className="mx-[6px] h-px flex-1 bg-[#D4D1CB]" />
 <div className="flex h-[20px] w-[20px] items-center justify-center bg-[#00143A]">
 <span className="font-mono text-[8px] font-medium text-white">2</span>
 </div>
 <span className="font-mono text-[10px] font-medium text-[#0D0E12]">Verify</span>
 </div>

 <div className="lp-3">
 <h2 className="mb-[6px] font-display text-[26px] font-extrabold tracking-[-0.03em] text-[#0D0E12]">
 Confirm it&apos;s you
 </h2>
 <p className="mb-[28px] text-[13px] leading-[1.55] text-[#6B6860]">
 Enter the 6-digit code from your authenticator app
 </p>

 <MfaVerifyForm />

 <div className="my-[20px] h-px bg-[#E2DFD9]" />

 <div className="border border-[#E2DFD9] bg-[#F9F8F6] p-[13px_15px]">
 <p className="text-[11.5px] leading-[1.65] text-[#3D3C38]">
 <strong className="font-semibold text-[#0D0E12]">Can&apos;t access your authenticator?</strong>
 <br />
 Contact your manager or IT admin to reset MFA.
 </p>
 </div>
 </div>

 <div className="lp-4 mt-[20px] text-center">
 <p className="flex items-center justify-center gap-[6px] font-mono text-[9px] uppercase tracking-[0.08em] text-[#B0ADA8]">
 <MfaLockIconFooter />
 MFA required on every sign-in
 </p>
 </div>
 </div>
 </div>
 );
}
