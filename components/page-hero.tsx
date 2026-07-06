import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  tone = "blue",
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  tone?: "blue" | "magenta" | "green";
}) {
  const badgeTone = tone === "magenta" ? "magenta" : tone === "green" ? "green" : "blue";

  return (
    <section className="sp-hero-pattern relative overflow-hidden rounded-3xl border border-sp-blue/10 p-6 md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-sp-blue/15 to-sp-magenta/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-sp-magenta/10 blur-3xl"
      />

      <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-3xl">
          <Badge tone={badgeTone}>{eyebrow}</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-sp-navy md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-sp-navy-muted md:text-base">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  tone = "blue",
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  tone?: "blue" | "magenta" | "green";
}) {
  const eyebrowColor =
    tone === "magenta" ? "text-[#cd27b0]" : tone === "green" ? "text-emerald-600" : "text-[#0071ce]";

  return (
    <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className={cn("sp-page-eyebrow", eyebrowColor)}>{eyebrow}</p>
        <h1 className="sp-page-title mt-1">{title}</h1>
        <p className="sp-page-description mt-2 max-w-3xl">{description}</p>
      </div>
      {actions}
    </section>
  );
}

export { Button };
