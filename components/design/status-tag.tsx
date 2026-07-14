export function StatusTag({
 label,
 bgColor,
 textColor,
}: {
 label: string;
 bgColor: string;
 textColor: string;
}) {
 return (
 <span
 className="inline-block px-[6px] py-[2px] font-mono text-[8px] uppercase tracking-[0.09em]"
 style={{ background: bgColor, color: textColor }}
 >
 {label}
 </span>
 );
}
