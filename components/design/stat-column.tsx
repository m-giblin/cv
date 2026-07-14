export function StatColumn({
 label,
 value,
 sub,
 valueColor = "#0D0E12",
}: {
 label: string;
 value: string | number;
 sub?: string;
 valueColor?: string;
}) {
 return (
 <div className="border-b border-[#ECEAE6] p-[14px] last:border-b-0">
 <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#B0ADA8]">{label}</div>
 <div
 className="font-mono text-[48px] leading-none tracking-[-0.02em]"
 style={{ color: valueColor }}
 >
 {value}
 </div>
 {sub ? (
 <div className="mt-1 font-mono text-[8.5px]" style={{ color: valueColor }}>
 {sub}
 </div>
 ) : null}
 </div>
 );
}
