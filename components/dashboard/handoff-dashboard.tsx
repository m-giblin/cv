export type HandoffMetric = {
  label: string;
  icon: string;
  value: string;
  sub: string;
};

export type HandoffListRow = {
  title: string;
  sub: string;
  dotClass: "dot-green" | "dot-amber" | "dot-blue";
  status: string;
  badgeBg: string;
  badgeColor: string;
  progress?: number;
};

export type HandoffSideRow = {
  icon: string;
  iconBg: string;
  label: string;
  time: string;
};

export type HandoffBottomStat = {
  value: string;
  label: string;
};

export function HandoffMetricGrid({ metrics }: { metrics: HandoffMetric[] }) {
  return (
    <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          className="rounded-xl border border-[#e2eaf5] bg-white p-[16px_18px] shadow-[0_1px_4px_rgba(0,20,58,0.05)] transition hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,20,58,0.18)]"
          key={metric.label}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-wide text-slate-500">{metric.label}</p>
            <span className="text-base">{metric.icon}</span>
          </div>
          <p className="font-display text-[26px] font-extrabold leading-none tracking-tight text-[#00143a]">
            {metric.value}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{metric.sub}</p>
        </div>
      ))}
    </div>
  );
}

export function HandoffListCard({
  title,
  viewAllHref,
  rows,
}: {
  title: string;
  viewAllHref?: string;
  rows: HandoffListRow[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.05)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <p className="text-[13px] font-bold text-[#00143a]">{title}</p>
        {viewAllHref ? (
          <a className="text-[11px] font-semibold text-[#0071ce] hover:underline" href={viewAllHref}>
            View all →
          </a>
        ) : null}
      </div>
      <div className="px-5 py-3">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nothing here yet.</p>
        ) : (
          rows.map((row) => (
            <div
              className="flex items-center gap-3 border-b border-slate-50 py-2.5 last:border-b-0"
              key={`${row.title}-${row.sub}`}
            >
              <span className={`handoff-dot handoff-dot-${row.dotClass.replace("dot-", "")}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{row.title}</p>
                <p className="text-[11px] text-slate-400">{row.sub}</p>
              </div>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: row.badgeBg, color: row.badgeColor }}
              >
                {row.status}
              </span>
              {row.progress !== undefined ? (
                <div className="h-[5px] w-[60px] shrink-0 overflow-hidden rounded-full bg-[#e8f2fc]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0071ce] to-[#0057a8]"
                    style={{ width: `${row.progress}%` }}
                  />
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function HandoffSideCard({ title, rows }: { title: string; rows: HandoffSideRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.05)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <p className="text-[13px] font-bold text-[#00143a]">{title}</p>
      </div>
      <div className="px-5 py-3">
        {rows.map((row) => (
          <div
            className="flex items-start gap-2.5 border-b border-slate-50 py-2 last:border-b-0"
            key={`${row.label}-${row.time}`}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-[13px]"
              style={{ background: row.iconBg }}
            >
              {row.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800">{row.label}</p>
              <p className="text-[11px] text-slate-400">{row.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HandoffBottomBar({
  label,
  text,
  stats,
  ctaLabel,
  ctaHref,
}: {
  label: string;
  text: string;
  stats: HandoffBottomStat[];
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="mt-3.5 flex flex-col items-start justify-between gap-4 rounded-xl bg-gradient-to-br from-[#00143a] to-[#002060] p-[18px_22px] lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
        <p className="mt-1 font-display text-sm font-bold text-white">{text}</p>
      </div>
      <div className="flex flex-wrap gap-6">
        {stats.map((stat) => (
          <div className="text-center" key={stat.label}>
            <p className="font-display text-[22px] font-extrabold leading-none text-white">{stat.value}</p>
            <p className="mt-0.5 text-[10px] text-white/45">{stat.label}</p>
          </div>
        ))}
      </div>
      <a
        className="shrink-0 rounded-lg bg-[#0071ce] px-[18px] py-2.5 text-xs font-semibold text-white hover:bg-[#0057a8]"
        href={ctaHref}
      >
        {ctaLabel}
      </a>
    </div>
  );
}

export function HandoffPageHero({
  eyebrow,
  greeting,
  subline,
}: {
  eyebrow: string;
  greeting: string;
  subline: string;
}) {
  return (
    <div className="mb-6">
      <p className="sp-page-eyebrow">{eyebrow}</p>
      <h1 className="sp-page-title mt-1">{greeting}</h1>
      <p className="sp-page-description mt-1">{subline}</p>
    </div>
  );
}
