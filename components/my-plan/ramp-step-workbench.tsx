"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Drawer } from "@/components/ui/drawer";

/** A ramp step opens over My ramp; closing it returns to the list without losing your place. */
export function RampStepWorkbench({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Drawer eyebrow={eyebrow} onClose={() => router.push("/my-plan", { scroll: false })} open subtitle={subtitle} title={title}>
      {children}
    </Drawer>
  );
}
