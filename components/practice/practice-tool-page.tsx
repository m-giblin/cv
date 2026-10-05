import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

/**
 * Page frame for every Practice tool (Simulations, Challenges, Pitch, Quizzes, Flight check, Deal prep).
 * Section tabs come from the shell; this renders the v2 page header, the admin test-mode notice,
 * and the tool body inside the page gutter.
 */
export function PracticeToolPage({
  eyebrow,
  title,
  actions,
  testMode = false,
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  actions?: ReactNode;
  testMode?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col">
      <PageHeader actions={actions} eyebrow={eyebrow} title={title} />
      {testMode ? <TestModeNotice /> : null}
      <div className={cn("flex flex-col gap-6 px-[var(--gutter)] pb-7", className)}>{children}</div>
    </div>
  );
}

export function TestModeNotice() {
  return (
    <div
      className="mx-[var(--gutter)] mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border-[1.5px] border-ink bg-signal-soft px-4 py-2.5"
      role="status"
    >
      <p className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-ink">
        ● Test as SE · validating scoring, personas and coaching flow
      </p>
      <Link className="link text-sm" href="/admin">
        Exit test mode
      </Link>
    </div>
  );
}
