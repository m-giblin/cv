import Link from "next/link";
import { SignalMark } from "@/components/shell/signal-mark";
import { PRODUCT_NAME } from "@/lib/tenant/shell-branding-shared";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6" id="main-content">
        <p className="mb-6 flex items-center gap-2.5 text-base font-bold text-ink">
          <SignalMark />
          {PRODUCT_NAME}
        </p>
        <p className="label-mono">Error 404</p>
        <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink">
          We can&apos;t find that page.
        </h1>
        <p className="text-[15px] leading-normal text-ink-2">
          The link may be out of date, or you may not have access to it.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link className="btn-primary w-fit no-underline" href="/">
            Back to home
          </Link>
          <Link className="link text-sm" href="/login">
            Sign in again
          </Link>
        </div>
      </main>
    </div>
  );
}
