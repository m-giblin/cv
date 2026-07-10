import Link from "next/link";
import type { PracticeWeekItem } from "@/lib/practice/practice-this-week";

export function PracticeThisWeekCard({ items }: { items: PracticeWeekItem[] }) {
 if (items.length === 0) return null;

 const primary = items[0]!;

 return (
 <div className="mb-5 overflow-hidden border border-[#0071ce]/25 bg-gradient-to-br from-[#e8f2fc] to-white ">
 <div className="border-b border-[#0071ce]/10 px-5 py-4">
 <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0057a8]">Practice this week</p>
 <p className="mt-1 font-display text-lg font-bold text-[#00143a]">One chain — prep, practice, prove</p>
 </div>
 <div className="space-y-0 px-5 py-3">
 {items.map((item, index) => (
 <Link
 className={`flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0 ${
 index === 0 ? "bg-white/80 px-2 -mx-2" : ""
 }`}
 href={item.href}
 key={item.id}
 >
 <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-white text-lg ">
 {item.icon}
 </span>
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-semibold text-slate-900">
 {index === 0 ? "Do this now · " : ""}
 {item.title}
 </p>
 <p className="truncate text-xs text-slate-500">{item.description}</p>
 </div>
 <span className="shrink-0 text-xs font-semibold text-[#0071ce]">→</span>
 </Link>
 ))}
 </div>
 <div className="border-t border-[#0071ce]/10 bg-white/50 px-5 py-3">
 <Link className="text-xs font-semibold text-[#0071ce] hover:underline" href={primary.href}>
 Start with {primary.title} →
 </Link>
 </div>
 </div>
 );
}
