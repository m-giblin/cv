import { Tabs } from "@/components/ui/tabs";

export type ReadinessTab = "competencies" | "feedback" | "growth-plan" | "certification";

/** Readiness page tabs (artboard 4a): Competencies / Feedback n / Growth plan / Certification. */
export function ReadinessTabs({
  value,
  feedbackCount,
  className,
}: {
  value: ReadinessTab;
  feedbackCount?: number;
  className?: string;
}) {
  return (
    <Tabs
      className={className}
      items={[
        { id: "competencies", label: "Competencies", href: "/readiness" },
        {
          id: "feedback",
          label: "Feedback",
          href: "/readiness/feedback",
          count: feedbackCount && feedbackCount > 0 ? feedbackCount : undefined,
        },
        { id: "growth-plan", label: "Growth plan", href: "/readiness/growth-plan" },
        { id: "certification", label: "Certification", href: "/readiness/certification" },
      ]}
      label="Readiness sections"
      value={value}
    />
  );
}
