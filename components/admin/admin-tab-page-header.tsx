export function AdminTabPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-[18px]">
      <h1 className="font-display text-[20px] font-extrabold text-[#0a1628]">{title}</h1>
      {subtitle ? <p className="mt-[2px] text-[12px] text-[#64748b]">{subtitle}</p> : null}
    </div>
  );
}
