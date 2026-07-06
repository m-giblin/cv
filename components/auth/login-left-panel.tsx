import { LoginSailMark } from "@/components/auth/login-icons";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#0033a1,#0071ce)",
  "linear-gradient(135deg,#0071ce,#0891b2)",
  "linear-gradient(135deg,#5b21b6,#7c3aed)",
  "linear-gradient(135deg,#0369a1,#0891b2)",
];

const FEATURES = [
  "AI-powered simulations with live coaching feedback",
  "ISC Lab — Grok-powered with grounded citations",
  "Manager coaching cadence and team readiness heatmap",
  "Certification gates tracking from Basic SE to Advisory SC",
];

export function LoginLeftPanel({ count, avatars }: { count: number; avatars: string[] }) {
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
      <div
        className="pointer-events-none absolute left-[20%] top-[40%] h-[300px] w-[300px] rounded-full"
        style={{ background: "radial-gradient(circle,rgba(0,51,161,0.1) 0%,transparent 70%)" }}
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
            <span className="pulse-dot h-[6px] w-[6px] rounded-full bg-[#60a5fa]" />
            <span className="text-[11.5px] font-semibold text-white/72">Internal platform · MFA required</span>
          </div>

          <h1 className="mb-[16px] font-display text-[38px] font-extrabold leading-[1.15] tracking-[-0.03em] text-white">
            Field readiness
            <br />
            <span className="shimmer-text">starts here.</span>
          </h1>

          <p className="mb-[36px] max-w-[380px] text-[15px] leading-[1.65] text-white/55">
            Your unified workspace for simulations, deal prep, coaching cards, and cert progress — all in one
            place.
          </p>

          <ul className="space-y-[13px]">
            {FEATURES.map((feature) => (
              <li className="flex items-start gap-[11px]" key={feature}>
                <span
                  className="mt-[5px] h-[8px] w-[8px] shrink-0 rounded-full"
                  style={{ background: "rgba(255,255,255,0.3)" }}
                />
                <span className="text-[13.5px] leading-[1.5] text-white/65">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex items-center gap-[16px]">
          <div className="flex">
            {avatars.slice(0, 4).map((initials, i) => (
              <div
                className="relative flex h-[28px] w-[28px] items-center justify-center rounded-full text-[10px] font-bold text-white"
                key={`${initials}-${i}`}
                style={{
                  background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length],
                  border: "2px solid rgba(255,255,255,0.2)",
                  marginLeft: i === 0 ? "0" : "-8px",
                  zIndex: 4 - i,
                }}
              >
                {initials}
              </div>
            ))}
          </div>
          <span className="text-[12px] text-white/40">{count} SEs, managers and admins active</span>
        </div>
      </div>
    </div>
  );
}
