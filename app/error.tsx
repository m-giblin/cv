"use client";

import { useEffect } from "react";
import { BrandLockup } from "@/components/auth/brand-lockup";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-[60px] shrink-0 items-center bg-blue px-6">
        <BrandLockup />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-12" id="main-content">
        <p className="label-caps label-caps--blue">Something went wrong</p>
        <h1 className="page-title text-ink max-sm:text-[32px]">
          This page didn&apos;t load.
        </h1>
        <p className="text-[15px] leading-normal text-ink-2">
          Try again. If it keeps happening, tell your admin
          {error.digest ? ` and quote reference ${error.digest}` : ""}.
        </p>
        <button className="btn-primary w-fit" onClick={reset} type="button">
          Try again
        </button>
      </main>
    </div>
  );
}
