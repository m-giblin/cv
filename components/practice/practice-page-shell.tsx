import Link from "next/link";
import type { ReactNode } from "react";
import type { AccessTier } from "@/lib/auth/rbac";
import { SEPageLayout } from "@/components/se/se-page-layout";

export function PracticePageShell({
  tier,
  eyebrow,
  eyebrowColor,
  title,
  subtitle,
  headerRight,
  backHref,
  testMode,
  children,
  fullHeight = true,
  bare = false,
}: {
  tier: AccessTier;
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  subtitle: string;
  headerRight?: ReactNode;
  backHref?: string;
  testMode?: boolean;
  children: ReactNode;
  fullHeight?: boolean;
  bare?: boolean;
}) {
  const managerBack = tier === "manager" || tier === "admin" ? (backHref ?? "/my-practice") : undefined;

  return (
    <SEPageLayout
      bare={bare}
      eyebrow={eyebrow}
      eyebrowColor={eyebrowColor}
      fullHeight={fullHeight}
      headerRight={headerRight}
      subtitle={subtitle}
      title={title}
    >
      {testMode ? (
        <div className="mb-3 flex items-center justify-between gap-3 border border-[#D4810A]/30 bg-[#FFFBF0] px-4 py-2">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#D4810A]">
            Test as SE — validating scoring, personas, and coaching flow
          </p>
          <Link className="font-mono text-[10px] font-semibold text-[#D4810A] hover:underline" href="/admin">
            Exit test mode
          </Link>
        </div>
      ) : null}
      {managerBack ? (
        <div className="mb-3">
          <Link
            className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#A09D98] hover:text-[#0071ce]"
            href={managerBack}
          >
            ← My Practice
          </Link>
        </div>
      ) : null}
      {children}
    </SEPageLayout>
  );
}
