/** Shown inside the persistent shell while a page's data loads, so a click responds at once. */
export function PageSkeleton({ label = "Loading" }: { label?: string }) {
  const block = "rounded-[10px] bg-[#ECE6DC] motion-safe:animate-pulse";
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className="flex flex-col gap-6 px-[var(--page-pad-x)] pt-[var(--page-pad-y)] max-sm:px-4"
      role="status"
    >
      <div className="flex flex-col gap-3">
        <div className={`${block} h-3 w-28`} />
        <div className={`${block} h-11 w-[min(520px,80%)]`} />
        <div className={`${block} h-4 w-[min(420px,60%)]`} />
      </div>
      <div className={`${block} h-[92px] w-full rounded-[14px]`} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className={`${block} h-[360px] rounded-[14px]`} />
        <div className={`${block} hidden h-[260px] rounded-[16px] xl:block`} />
      </div>
      <span className="sr-only">{label}…</span>
    </div>
  );
}
