import { IdentityGraph } from "@/components/design/identity-graph";
import { MfaArrowIcon, MfaCodeIcon, MfaLockIcon, MfaLockIconSm } from "@/components/auth/mfa-icons";

const STEPS = [
 {
 accent: "#0A6E45",
 title: "Open your authenticator app",
 sub: "Google Authenticator, Authy, or 1Password",
 icon: <MfaLockIcon stroke="#0A6E45" />,
 },
 {
 accent: "#0071CE",
 title: "Enter the 6-digit code",
 sub: "Code refreshes every 30 seconds",
 icon: <MfaCodeIcon stroke="#0071CE" />,
 },
 {
 accent: "#7c3aed",
 title: "Access granted",
 sub: "You'll land on your workspace dashboard",
 icon: <MfaArrowIcon stroke="#7c3aed" />,
 },
];

export function MfaLeftPanel() {
 return (
 <div
 className="relative hidden w-[52%] flex-shrink-0 flex-col overflow-hidden lg:flex"
 style={{ background: "linear-gradient(160deg,#00143A 0%,#001A45 55%,#000F2E 100%)" }}
 >
 <IdentityGraph />
 <div
 className="pointer-events-none absolute inset-0 opacity-[0.03]"
 style={{
 backgroundImage:
 "linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px)",
 backgroundSize: "40px 40px",
 }}
 />

 <div className="relative z-10 flex flex-1 flex-col p-[48px_52px]">
 <div className="mb-auto flex items-center gap-[10px] lp-1">
 <svg aria-hidden fill="none" height="20" viewBox="0 0 20 20" width="20">
 <path d="M10.5 2C10.5 2 16.5 6 16.5 13H10.5V2Z" fill="white" />
 <path d="M10.5 5C10.5 5 4.5 8 4.5 13H10.5V5Z" fill="rgba(255,255,255,0.32)" />
 <path d="M3 14.5H17" stroke="white" strokeLinecap="square" strokeWidth="1.5" />
 </svg>
 <div>
 <p className="font-display text-[14px] font-extrabold leading-none tracking-[-0.01em] text-white">
 Enablement
 </p>
 <p className="mt-[2px] font-mono text-[8px] tracking-[0.14em] text-white/30">PLATFORM</p>
 </div>
 </div>

 <div className="my-auto py-[40px] lp-2">
 <div className="mb-[24px] inline-flex items-center gap-[7px]">
 <span className="pulse-dot h-[5px] w-[5px] rounded-full bg-[#0A6E45]" />
 <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/40">
 One more step · Almost in
 </span>
 </div>

 <h1 className="mb-[20px] font-display text-[48px] font-extrabold leading-[1] tracking-[-0.04em] text-white">
 Confirm
 <br />
 it&apos;s <span className="text-[#0071CE]">you.</span>
 </h1>

 <p className="mb-[36px] max-w-[340px] text-[13.5px] leading-[1.7] text-white/45">
 Multi-factor authentication protects access to sensitive enablement content, coaching data, and team
 readiness metrics.
 </p>

 <div className="flex flex-col gap-[10px]">
 {STEPS.map((step) => (
 <div
 className="flex items-center gap-[12px] border border-white/[0.08] bg-white/[0.04] px-[14px] py-[11px]"
 key={step.title}
 >
 <div
 className="flex h-[32px] w-[32px] shrink-0 items-center justify-center"
 style={{ background: `${step.accent}22` }}
 >
 {step.icon}
 </div>
 <div>
 <p className="mb-[1px] text-[12px] font-semibold text-white">{step.title}</p>
 <p className="text-[11px] text-white/40">{step.sub}</p>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="mt-auto flex items-center gap-[7px] lp-4">
 <MfaLockIconSm />
 <span className="font-mono text-[9px] text-white/25">MFA required on every sign-in</span>
 </div>
 </div>
 </div>
 );
}
