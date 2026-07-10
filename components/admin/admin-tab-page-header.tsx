export function AdminTabPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
 return (
 <div className="mb-[18px]">
 <h1 className="font-display text-[20px] font-extrabold text-[#0D0E12]">{title}</h1>
 {subtitle ? <p className="mt-[2px] text-[12px] text-[#6B6860]">{subtitle}</p> : null}
 </div>
 );
}
