import { LoginSailMark } from "@/components/auth/login-icons";
import { MfaArrowIcon, MfaCodeIcon, MfaLockIcon, MfaLockIconSm } from "@/components/auth/mfa-icons";

const STEPS = [
  {
    bg: "rgba(52,211,153,0.15)",
    title: "Scan the QR code",
    sub: "Use Google Authenticator, Authy, or 1Password",
    icon: <MfaLockIcon stroke="#34d399" />,
  },
  {
    bg: "rgba(96,165,250,0.15)",
    title: "Enter the 6-digit code",
    sub: "Confirms your authenticator is set up correctly",
    icon: <MfaCodeIcon stroke="#60a5fa" />,
  },
  {
    bg: "rgba(167,139,250,0.15)",
    title: "You're protected",
    sub: "MFA will be required on every sign-in",
    icon: <MfaArrowIcon stroke="#a78bfa" />,
  },
];

export function MfaEnrollLeftPanel() {
  return (
    <div
      className="relative hidden w-[52%] flex-shrink-0 flex-col overflow-hidden lg:flex"
      style={{ background: "linear-gradient(145deg,#00143a 0%,#00204e 50%,#001a45 100%)" }}
    >
      <div
        className="pointer-events-none absolute -right-[80px] -top-[120px] h-[480px] w-[480px] rounded-full"
        style={{ background: "radial-gradient(circle,rgba(0,113,206,0.18) 0%,transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-[100px] -left-[60px] h-[400px] w-[400px] rounded-full"
        style={{ background: "radial-gradient(circle,rgba(204,39,176,0.12) 0%,transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-1 flex-col p-[52px_56px]">
        <div className="flex items-center gap-[12px]">
          <div
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[11px]"
            style={{
              background: "linear-gradient(135deg,#0033a1,#0071ce)",
              boxShadow: "0 4px 18px rgba(0,113,206,0.45)",
            }}
          >
            <LoginSailMark size={24} />
          </div>
          <div>
            <p className="font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.01em] text-white">
              SailPoint
            </p>
            <p className="text-[10.5px] font-medium tracking-[0.03em] text-white/42">SE Enablement</p>
          </div>
        </div>

        <div className="my-auto py-[40px]">
          <div
            className="mb-[22px] inline-flex items-center gap-[7px] rounded-full px-[13px] py-[5px]"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <span className="pulse-dot h-[6px] w-[6px] rounded-full bg-[#34d399]" />
            <span className="text-[11.5px] font-semibold text-white/72">First-time setup · Required</span>
          </div>

          <h1 className="mb-[16px] font-display text-[38px] font-extrabold leading-[1.15] tracking-[-0.03em] text-white">
            Set up your
            <br />
            <span className="shimmer-text">authenticator.</span>
          </h1>

          <p className="mb-[36px] max-w-[380px] text-[15px] leading-[1.65] text-white/55">
            Multi-factor authentication protects access to sensitive enablement content, coaching data, and team
            readiness metrics.
          </p>

          <div className="space-y-[12px]">
            {STEPS.map((step) => (
              <div
                className="flex items-center gap-[12px] rounded-xl px-[16px] py-[12px]"
                key={step.title}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <div
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px]"
                  style={{ background: step.bg }}
                >
                  {step.icon}
                </div>
                <div>
                  <p className="mb-[1px] text-[12.5px] font-bold text-white">{step.title}</p>
                  <p className="text-[11.5px] text-white/45">{step.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-[7px]">
          <MfaLockIconSm />
          <span className="text-[12px] text-white/38">MFA required on every sign-in · SailPoint internal</span>
        </div>
      </div>
    </div>
  );
}
