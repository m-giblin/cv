import Link from "next/link";
import { BrandLockup } from "@/components/auth/brand-lockup";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-[60px] shrink-0 items-center bg-blue px-6">
        <BrandLockup />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-12" id="main-content">
        <p className="label-caps label-caps--blue">Error 404</p>
        <h1 className="page-title text-ink max-sm:text-[32px]">
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
