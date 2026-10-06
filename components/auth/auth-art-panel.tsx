"use client";

import Image from "next/image";
import { useState } from "react";
import { BrandLockup } from "@/components/auth/brand-lockup";
import { LoginArt } from "@/components/auth/login-art";

/** Left half of the sign-in layout: artwork, animated wires, wordmark and product line. Hidden on small screens. */
export function AuthArtPanel() {
  const [tall, setTall] = useState(true);

  return (
    <section
      aria-label="SE Enablement"
      className="sticky top-0 hidden h-screen min-w-0 flex-1 basis-0 flex-col self-start overflow-hidden bg-[#060E24] md:flex"
    >
      <Image alt="" className="object-cover" fill priority sizes="58vw" src="/auth/login-art.webp" />
      <LoginArt onTallChange={setTall} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,rgba(6,14,36,0.55) 0%,rgba(6,14,36,0) 22%,rgba(6,14,36,0) 58%,rgba(6,14,36,0.92) 100%)",
        }}
      />
      <div className="relative px-11 py-8">
        <BrandLockup />
      </div>
      <div className="flex-1" />
      <div className="pointer-events-none relative flex max-w-[600px] flex-col gap-2.5 px-11 pb-9">
        <span className="label-caps text-signal">Sales engineer enablement</span>
        <span className="text-[clamp(28px,3.2vw,44px)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance text-white">
          Ramp, practice, and{" "}
          <span className="serif-accent text-[1.12em] tracking-[-0.01em] text-[#9FB8F0]">prove you&apos;re ready.</span>
        </span>
        {tall ? (
          <span className="max-w-[480px] text-base leading-[1.55] text-[#C9D2E8]">
            Your ramp plan, call practice, and certification evidence in one place, with your manager in the loop.
          </span>
        ) : null}
      </div>
    </section>
  );
}
