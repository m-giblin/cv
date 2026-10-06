import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

/**
 * Page frame for every Practice tool (Simulations, Challenges, Pitch, Quizzes, Flight check, Deal prep).
 * The sidebar lists the tools; this renders the v3 page header, the admin test-mode notice,
 * and the tool body inside the page padding.
 */
export function PracticeToolPage({
  eyebrow = "Practice",
  title,
  subtitle,
  actions,
  testMode = false,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  testMode?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col">
      <PageHeader actions={actions} eyebrow={eyebrow} subtitle={subtitle} title={title} />
      {testMode ? <TestModeNotice /> : null}
      <div className={cn("flex flex-col gap-6 px-[var(--page-pad-x)] pb-7 max-sm:px-4", className)}>{children}</div>
    </div>
  );
}

export function TestModeNotice() {
  return (
    <div
      className="mx-[var(--page-pad-x)] mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-dashed border-line-strong px-4 py-2.5 max-sm:mx-4"
      role="status"
    >
      <p className="flex flex-wrap items-center gap-3 text-sm text-ink-2">
        <StatusPill tone="warning">Test as SE</StatusPill>
        You are checking scoring, personas and the coaching flow.
      </p>
      <Link className="link text-sm" href="/admin">
        Exit test mode
      </Link>
    </div>
  );
}
