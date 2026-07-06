import { LoginForm } from "@/components/auth/login-form";
import { LoginSailMark, LockIcon } from "@/components/auth/login-icons";
import { ALLOWED_EMAIL_DOMAINS } from "@/lib/auth/email-domain";

export function LoginRightPanel({ initialError }: { initialError?: string | null }) {
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

        <div
          className="fade-up delay-1 rounded-[18px] bg-white p-[38px_36px]"
          style={{ border: "1px solid #e2eaf5", boxShadow: "0 4px 32px rgba(0,20,58,0.07)" }}
        >
          <div className="mb-[30px] text-center">
            <div
              className="mx-auto mb-[16px] flex h-[52px] w-[52px] items-center justify-center rounded-[14px]"
              style={{
                background: "linear-gradient(135deg,#0033a1,#0071ce)",
                boxShadow: "0 6px 20px rgba(0,113,206,0.32)",
              }}
            >
              <LoginSailMark size={26} />
            </div>
            <h2 className="mb-[6px] font-display text-[22px] font-extrabold tracking-[-0.02em] text-[#0a1628]">
              Welcome back
            </h2>
            <p className="text-[13.5px] leading-[1.5] text-[#64748b]">
              Sign in with your @sailpoint.com credentials
            </p>
          </div>

          <LoginForm initialError={initialError} />
        </div>

        <div className="fade-up delay-4 mt-[16px] text-center">
          <p className="text-[12px] leading-[1.6] text-[#94a3b8]">
            Access restricted to{" "}
            {ALLOWED_EMAIL_DOMAINS.map((domain, index) => (
              <span key={domain}>
                {index > 0 ? " and " : null}
                <span className="font-semibold text-[#64748b]">@{domain}</span>
              </span>
            ))}{" "}
            accounts
          </p>
          <p className="mt-[4px] flex items-center justify-center gap-[6px] text-[11.5px] text-[#94a3b8]">
            <LockIcon className="h-[11px] w-[11px]" />
            MFA required on every sign-in
          </p>
        </div>
      </div>
    </div>
  );
}
