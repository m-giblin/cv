import { LoginForm } from "@/components/auth/login-form";
import { ALLOWED_EMAIL_DOMAINS } from "@/lib/auth/email-domain";

export function LoginRightPanel({ initialError }: { initialError?: string | null }) {
 return (
 <div className="flex flex-1 items-center justify-center bg-[#F5F4F0] p-[48px_40px]">
 <div className="w-full max-w-[360px] fade-in">
 <div className="mb-[32px] flex items-center gap-[6px] lp-1">
 <div className="flex h-[20px] w-[20px] items-center justify-center bg-[#00143A]">
 <span className="font-mono text-[8px] font-medium text-white">1</span>
 </div>
 <span className="font-mono text-[10px] font-medium text-[#0D0E12]">Sign in</span>
 <div className="mx-[6px] h-px flex-1 bg-[#D4D1CB]" />
 <div className="flex h-[20px] w-[20px] items-center justify-center border border-[#D4D1CB]">
 <span className="font-mono text-[8px] text-[#B0ADA8]">2</span>
 </div>
 <span className="font-mono text-[10px] text-[#B0ADA8]">Verify</span>
 </div>

 <div className="lp-2">
 <h2 className="mb-[6px] font-display text-[26px] font-extrabold tracking-[-0.03em] text-[#0D0E12]">
 Welcome back
 </h2>
 <p className="mb-[28px] text-[13px] leading-[1.55] text-[#6B6860]">
 Sign in with your work email to continue
 </p>

 <LoginForm initialError={initialError} />
 </div>

 <div className="lp-4 mt-[24px] text-center">
 <p className="font-mono text-[10px] leading-[1.6] text-[#A09D98]">
 Access restricted to{" "}
 {ALLOWED_EMAIL_DOMAINS.map((domain, index) => (
 <span key={domain}>
 {index > 0 ? " and " : null}
 <span className="text-[#6B6860]">@{domain}</span>
 </span>
 ))}
 </p>
 <p className="mt-[6px] font-mono text-[9px] uppercase tracking-[0.08em] text-[#B0ADA8]">
 MFA required on every sign-in
 </p>
 </div>
 </div>
 </div>
 );
}
