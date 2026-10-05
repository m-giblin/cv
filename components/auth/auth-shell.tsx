import Link from "next/link";
import type { ReactNode } from "react";
import { SignalMark } from "@/components/shell/signal-mark";
import { PRODUCT_NAME } from "@/lib/tenant/shell-branding-shared";

type AsideCopy = {
  /** Mono label over the heading. */
  eyebrow: string;
  heading: string;
  body: string;
  /** Optional numbered steps (MFA flows). */
  steps?: string[];
};

const DEFAULT_ASIDE: AsideCopy = {
  eyebrow: "Sales engineer enablement",
  heading: "Ramp, practice, and prove you're ready.",
  body: "Your ramp plan, call practice, and certification evidence in one place, with your manager in the loop.",
};

/**
 * Shared layout for sign-in, password and MFA pages: a blue brand panel (desktop only) and a white form card.
 * No decorative graphics and no made-up stats.
 */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  aside = DEFAULT_ASIDE,
  backLink,
  footnote = "MFA required on every sign-in",
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  aside?: AsideCopy;
  backLink?: { href: string; label: string };
  footnote?: string | null;
}) {
  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="hidden w-[44%] max-w-[600px] shrink-0 flex-col bg-blue px-12 py-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <SignalMark />
          <span className="text-base font-bold">{PRODUCT_NAME}</span>
        </div>

        <div className="my-auto max-w-[420px] py-12">
          <p className="font-mono text-xs font-medium tracking-[0.03em] text-signal uppercase">{aside.eyebrow}</p>
          <p className="mt-3 text-[40px] leading-[1.05] font-extrabold tracking-[-0.02em]">{aside.heading}</p>
          <p className="mt-4 text-base leading-normal text-on-blue">{aside.body}</p>
          {aside.steps?.length ? (
            <ol className="mt-8 space-y-3">
              {aside.steps.map((step, index) => (
                <li className="flex items-baseline gap-4 border-t border-blue-line pt-3" key={step}>
                  <span className="text-xl font-extrabold text-signal">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-[15px] text-white">{step}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        {footnote ? (
          <p className="font-mono text-xs tracking-[0.03em] text-on-blue-muted uppercase">{footnote}</p>
        ) : null}
      </aside>

      <main className="flex min-w-0 flex-1 items-center justify-center px-4 py-10 sm:px-10" id="main-content">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <SignalMark />
            <span className="text-base font-bold text-ink">{PRODUCT_NAME}</span>
          </div>

          {backLink ? (
            <Link className="link mb-4 inline-block text-sm" href={backLink.href}>
              ← {backLink.label}
            </Link>
          ) : null}

          <div className="rounded-[14px] border-[1.5px] border-ink bg-white p-6 sm:p-8">
            <p className="label-mono">{eyebrow}</p>
            <h1 className="mt-1.5 text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink">{title}</h1>
            {description ? <p className="mt-2 text-[15px] leading-normal text-ink-2">{description}</p> : null}
            <div className="mt-6">{children}</div>
          </div>

          {footnote ? (
            <p className="mt-5 text-center font-mono text-xs tracking-[0.03em] text-muted uppercase lg:hidden">
              {footnote}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
