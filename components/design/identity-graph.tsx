/** Login left panel — SVG identity graph per COMPONENT_SPECS.md */
export function IdentityGraph() {
 return (
 <svg
 aria-hidden
 className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
 preserveAspectRatio="xMidYMid slice"
 viewBox="0 0 640 800"
 >
 <line stroke="#0071CE" strokeDasharray="4 6" strokeWidth="0.8" x1="120" x2="320" y1="200" y2="380" />
 <line stroke="#CC27B0" strokeDasharray="4 6" strokeWidth="0.8" x1="520" x2="320" y1="180" y2="380" />
 <line stroke="rgba(255,255,255,0.4)" strokeDasharray="4 6" strokeWidth="0.8" x1="200" x2="400" y1="520" y2="380" />
 <rect fill="#0071CE" height="12" transform="rotate(45 120 200)" width="12" x="114" y="194" />
 <rect fill="rgba(255,255,255,0.5)" height="10" transform="rotate(45 520 180)" width="10" x="515" y="175" />
 <rect fill="#CC27B0" height="8" transform="rotate(45 200 520)" width="8" x="196" y="516" />
 <rect fill="rgba(255,255,255,0.7)" height="16" transform="rotate(45 400 520)" width="16" x="392" y="512" />
 <circle cx="320" cy="380" fill="#0071CE" r="14" />
 <rect fill="white" height="22" transform="rotate(45 320 380)" width="22" x="309" y="369" />
 </svg>
 );
}
