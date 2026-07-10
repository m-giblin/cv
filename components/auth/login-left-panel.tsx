import { IdentityGraph } from "@/components/design/identity-graph";
import { AvatarInitials } from "@/components/design/avatar-initials";

const FEATURES = [
 { accent: "#0071CE", text: "AI roleplay simulations with scored feedback" },
 { accent: "#CC27B0", text: "Manager coaching cadence and readiness maps" },
 { accent: "#0071CE", text: "Deal prep briefs and competitive battlecards" },
 { accent: "rgba(255,255,255,0.2)", text: "Certification gates and career ladder tracking" },
];

export function LoginLeftPanel({ count, avatars }: { count: number; avatars: string[] }) {
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
 <span className="pulse-dot h-[5px] w-[5px] rounded-full bg-[#0071CE]" />
 <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/40">
 Secure access · MFA required
 </span>
 </div>

 <h1 className="mb-[20px] font-display text-[48px] font-extrabold leading-[1] tracking-[-0.04em] text-white">
 Built for
 <br />
 the people
 <br />
 <span className="text-[#0071CE]">who close.</span>
 </h1>

 <p className="mb-[40px] max-w-[340px] text-[13.5px] leading-[1.7] text-white/45">
 Simulations, deal prep, coaching, cert gates, and competitive intel — one platform, every rep.
 </p>

 <div className="flex flex-col gap-[10px]">
 {FEATURES.map((feature) => (
 <div className="flex items-center gap-[10px]" key={feature.text}>
 <div className="h-px w-[14px] shrink-0" style={{ background: feature.accent }} />
 <span className="text-[12.5px] text-white/55">{feature.text}</span>
 </div>
 ))}
 </div>
 </div>

 <div className="mt-auto flex items-center gap-[12px] border-t border-white/[0.06] pt-[24px] lp-4">
 <div className="flex">
 {avatars.slice(0, 4).map((initials, i) => (
 <div
 className="relative"
 key={`${initials}-${i}`}
 style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i }}
 >
 <AvatarInitials index={i} initials={initials} size={28} />
 </div>
 ))}
 </div>
 <span className="font-mono text-[9px] text-white/30">{count} active users</span>
 </div>
 </div>
 </div>
 );
}
