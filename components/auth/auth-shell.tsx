import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/auth/brand-lockup";

type AsideCopy = {
  /** Caps label over the heading. */
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
 * Shared layout for sign-in, password and MFA pages: a blue brand panel with the logo mark and wordmark (desktop only;
 * a blue strip on small screens) and a white form card with a 1px line border.
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
        <BrandLockup />

        <div className="my-auto max-w-[420px] py-12">
          <p className="label-caps text-signal">{aside.eyebrow}</p>
          <p className="page-title mt-3 text-[40px] leading-[1.05]">
            {aside.heading}
          </p>
          <p className="mt-4 text-base leading-normal text-on-blue">
            {aside.body}
          </p>
          {aside.steps?.length ? (
            <ol className="mt-8 space-y-3">
              {aside.steps.map((step, index) => (
                <li
                  className="flex items-baseline gap-4 border-t border-blue-line pt-3"
                  key={step}
                >
                  <span className="num w-6 shrink-0 text-xl font-extrabold text-signal">
                    {index + 1}
                  </span>
                  <span className="text-[15px] text-white">{step}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        {footnote ? (
          <p className="text-[13px] text-on-blue">{footnote}</p>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[60px] shrink-0 items-center bg-blue px-4 sm:px-10 lg:hidden">
          <BrandLockup />
        </header>

        <main
          className="flex min-w-0 flex-1 items-center justify-center px-4 py-10 sm:px-10"
          id="main-content"
        >
          <div className="w-full max-w-[420px]">
            {backLink ? (
              <Link
                className="link mb-4 inline-block text-sm"
                href={backLink.href}
              >
                {backLink.label}
              </Link>
            ) : null}

            <div className="rounded-[14px] border border-line bg-white p-6 sm:p-8">
              <p className="label-caps label-caps--blue">{eyebrow}</p>
              <h1 className="mt-2 text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink">
                {title}
              </h1>
              {description ? (
                <p className="mt-2 text-[15px] leading-normal text-ink-2">
                  {description}
                </p>
              ) : null}
              <div className="mt-6">{children}</div>
            </div>

            {footnote ? (
              <p className="mt-5 text-center text-[13px] text-muted lg:hidden">
                {footnote}
              </p>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
