"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DesignShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isNorthstar = pathname?.startsWith("/design/northstar");
  const isField = pathname?.startsWith("/design/field");

  if (isNorthstar || isField) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[rgba(0,51,161,0.3)] bg-[#060d1a]/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link className="text-sm font-bold text-[#8b9cb8] transition hover:text-white" href="/design">
              Design Lab
            </Link>
            <span className="hidden text-xs text-[#8b9cb8]/40 sm:inline">|</span>
            <nav className="hidden items-center gap-3 sm:flex">
              <Link className="text-xs font-semibold text-[#d70fb6] hover:text-[#f0a8e8]" href="/design/vector">
                VECTOR ★
              </Link>
              <Link className="text-xs font-semibold text-[#8b9cb8] hover:text-white" href="/design/command">
                COMMAND
              </Link>
              <Link className="text-xs font-semibold text-[#8b9cb8] hover:text-white" href="/design/northstar">
                NORTHSTAR
              </Link>
              <Link className="text-xs font-semibold text-[#8b9cb8] hover:text-white" href="/design/field">
                FIELD ★
              </Link>
            </nav>
          </div>
          <p className="font-[family-name:var(--font-design-mono)] text-[10px] font-medium uppercase tracking-widest text-[#8b9cb8]">
            Mock-ups only
          </p>
        </div>
      </header>
      {children}
    </>
  );
}
