export function ProgressBar({ pct, color = "#0071CE" }: { pct: string; color?: string }) {
 return (
 <div className="relative h-[3px] overflow-hidden bg-[#ECEAE6]">
 <div
 className="absolute left-0 top-0 h-full animate-[pf_1.1s_cubic-bezier(.16,1,.3,1)_forwards]"
 style={{ background: color, width: pct }}
 />
 </div>
 );
}
