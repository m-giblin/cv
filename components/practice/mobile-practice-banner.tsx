import Link from "next/link";
import { Smartphone } from "lucide-react";

export function MobilePracticeBanner() {
 return (
 <div className="flex flex-wrap items-center justify-between gap-3 border border-sp-blue/15 bg-sp-blue-soft/20 px-4 py-3 md:hidden">
 <div className="flex items-center gap-2">
 <Smartphone className="h-4 w-4 text-sp-blue" />
 <p className="text-sm font-semibold text-sp-navy">Mobile practice mode</p>
 </div>
 <Link className="text-sm font-semibold text-sp-blue hover:underline" href="/simulations?focus=simulation">
 Quick sim →
 </Link>
 </div>
 );
}
