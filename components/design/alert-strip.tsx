import { Button } from "@/components/ui/button";

const ACCENTS = {
 amber: { border: "#D4810A", bg: "#FFFBF0", text: "#5C4200", ring: "rgba(212,129,10,.12)" },
 red: { border: "#B83128", bg: "#FEF0EE", text: "#5C1A15", ring: "rgba(184,49,40,.12)" },
 blue: { border: "#0071CE", bg: "#EEF4FF", text: "#003366", ring: "rgba(0,113,206,.12)" },
 green: { border: "#0A6E45", bg: "#EDFAF3", text: "#0A4A2E", ring: "rgba(10,110,69,.12)" },
} as const;

export function AlertStrip({
 message,
 cta,
 onCta,
 accent = "amber",
}: {
 message: string;
 cta?: string;
 onCta?: () => void;
 accent?: keyof typeof ACCENTS;
}) {
 const colors = ACCENTS[accent];
 return (
 <div
 className="flex items-center justify-between gap-3 border p-[9px_14px]"
 style={{
 borderLeftWidth: 3,
 borderLeftColor: colors.border,
 background: colors.bg,
 borderColor: colors.ring,
 }}
 >
 <span className="text-[11.5px] font-medium" style={{ color: colors.text }}>
 {message}
 </span>
 {cta && onCta ? (
 <Button onClick={onCta} size="sm" variant="outline">
 {cta}
 </Button>
 ) : null}
 </div>
 );
}
