export function AdminTabPageHeader({ title, subtitle, eyebrow, eyebrowColor = "#0071ce" }: { title: string; subtitle?: string; eyebrow?: string; eyebrowColor?: string }) {
 return (
 <div className="mb-5 border-l-[3px] pl-[14px]" style={{ borderColor: eyebrowColor }}>
 {eyebrow ? (
 <p className="mb-[5px] font-mono text-[8.5px] font-medium uppercase tracking-[0.16em] text-[#A09D98]">{eyebrow}</p>
 ) : null}
 <h1 className="font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] text-[#0D0E12]">{title}</h1>
 {subtitle ? <p className="mt-1 text-[12px] text-[#6B6860]">{subtitle}</p> : null}
 </div>
 );
}
