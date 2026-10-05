"use client";

import { useEffect } from "react";
import { SignalMark } from "@/components/shell/signal-mark";
import { PRODUCT_NAME } from "@/lib/tenant/shell-branding-shared";

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
    <div className="min-h-screen bg-bg">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6" id="main-content">
        <p className="mb-6 flex items-center gap-2.5 text-base font-bold text-ink">
          <SignalMark />
          {PRODUCT_NAME}
        </p>
        <p className="label-mono">Something went wrong</p>
        <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink">
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
