import Link from "next/link";
import type { ReactNode } from "react";
import { AuthArtPanel } from "@/components/auth/auth-art-panel";
import { BrandLockup } from "@/components/auth/brand-lockup";
import { NeedAccessLink } from "@/components/auth/need-access-link";

/**
 * Sign-in, password and MFA layout (design: "SE Enablement - Login.html").
 * Left: full-height artwork with animated wires, the wordmark and the product line.
 * Right: warm paper column with the white card and the MFA footnote.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  backLink,
  footnote = "MFA required on every sign-in",
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** @deprecated The artwork panel is the same on every auth step. */
  aside?: unknown;
  backLink?: { href: string; label: string };
  footnote?: string | null;
}) {
  return (
    <div className="flex min-h-screen w-full bg-bg">
      <AuthArtPanel />

      <div className="flex min-w-0 flex-1 flex-col md:h-screen md:max-h-screen md:flex-[0_0_clamp(360px,42%,560px)] md:overflow-auto">
        <header className="flex h-[60px] shrink-0 items-center bg-[#060E24] px-4 md:hidden">
          <BrandLockup />
        </header>

        <main
          className="flex flex-1 items-center justify-center px-7 py-6 [align-items:safe_center]"
          id="main-content"
        >
          <div className="flex w-full max-w-[420px] flex-col gap-3.5">
            {backLink ? (
              <Link className="link self-start text-sm" href={backLink.href}>
                {backLink.label}
              </Link>
            ) : null}

            <div className="flex flex-col gap-[18px] rounded-[16px] border border-line bg-white p-7 shadow-[0_1px_2px_rgba(18,26,46,0.06),0_18px_40px_rgba(18,26,46,0.06)]">
              <div className="flex flex-col gap-2">
                <p className="label-caps label-caps--blue">{eyebrow}</p>
                <h1 className="m-0 text-[32px] leading-[1.05] font-extrabold tracking-[-0.025em] text-ink">{title}</h1>
                {description ? <p className="m-0 text-[15px] leading-normal text-ink-2">{description}</p> : null}
              </div>
              {children}
            </div>

            {footnote ? (
              <div className="flex items-center justify-between px-1 text-[13px] text-muted">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-success" />
                  {footnote}
                </span>
                <NeedAccessLink />
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
