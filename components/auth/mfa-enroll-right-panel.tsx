import Link from "next/link";
import { MfaEnrollForm } from "@/components/auth/mfa-enroll-form";
import { LoginSailMark } from "@/components/auth/login-icons";
import { MfaLockIconFooter, MfaShieldCheckIcon } from "@/components/auth/mfa-icons";

export function MfaEnrollRightPanel() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#f4f8fd] p-[40px_48px]">
      <div className="w-full max-w-[400px]">
        <div className="mb-[24px] flex items-center justify-center gap-[10px] lg:hidden">
          <div
            className="flex h-[36px] w-[36px] items-center justify-center rounded-[9px]"
            style={{ background: "linear-gradient(135deg,#0033a1,#0071ce)" }}
          >
            <LoginSailMark size={20} />
          </div>
          <span className="font-display text-[15px] font-extrabold text-[#0a1628]">SailPoint SE Enablement</span>
        </div>

        <div className="fade-up delay-1 mb-[20px]">
          <Link
            className="inline-flex items-center gap-[6px] text-[12.5px] font-semibold text-[#64748b] transition hover:text-[#0071ce]"
            href="/login"
          >
            <svg aria-hidden fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 16 16" width="14">
              <path d="M13 8H3M7 4l-4 4 4 4" />
            </svg>
            Back to sign in
          </Link>
        </div>

        <div
          className="fade-up delay-2 rounded-[18px] bg-white p-[38px_36px]"
          style={{ border: "1px solid #e2eaf5", boxShadow: "0 4px 32px rgba(0,20,58,0.07)" }}
        >
          <div className="mb-[30px] text-center">
            <div className="relative mx-auto mb-[18px] h-[64px] w-[64px]">
              <div
                className="flex h-[64px] w-[64px] items-center justify-center rounded-[18px]"
                style={{
                  background: "linear-gradient(135deg,#0033a1,#0071ce)",
                  boxShadow: "0 6px 20px rgba(0,113,206,0.32)",
                }}
              >
                <MfaShieldCheckIcon />
              </div>
              <div
                className="pulse-dot pointer-events-none absolute inset-[-5px] rounded-[23px]"
                style={{ border: "1.5px solid rgba(0,113,206,0.2)" }}
              />
            </div>

            <h2 className="mb-[6px] font-display text-[22px] font-extrabold tracking-[-0.02em] text-[#0a1628]">
              Set up your authenticator
            </h2>
            <p className="mx-auto max-w-[280px] text-[13.5px] leading-[1.55] text-[#64748b]">
              Scan the QR code, then enter a verification code to activate MFA
            </p>
          </div>

          <MfaEnrollForm />

          <div className="my-[20px] h-px bg-[#f1f5f9]" />

          <div className="rounded-[10px] border border-[#e2eaf5] bg-[#f8fafd] p-[13px_15px]">
            <p className="text-[12px] leading-[1.65] text-[#475569]">
              <strong className="font-semibold text-[#0a1628]">Need help?</strong>
              <br />
              Contact your manager or IT admin if you cannot scan the QR code or access an authenticator app.
            </p>
          </div>
        </div>

        <div className="fade-up delay-4 mt-[16px] text-center">
          <p className="flex items-center justify-center gap-[6px] text-[12px] text-[#94a3b8]">
            <MfaLockIconFooter />
            SailPoint internal · MFA required on every sign-in
          </p>
        </div>
      </div>
    </div>
  );
}
