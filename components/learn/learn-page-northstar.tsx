import Link from "next/link";
import type { ReactNode } from "react";

type LearnCardConfig = {
 id: string;
 gradient: string;
 iconBg: string;
 iconColor: string;
 icon: ReactNode;
 title: string;
 sub: string;
 body: string;
 bullets: string[];
 bulletColor: string;
 actions: Array<{
 label: string;
 href: string;
 variant: "outline" | "solid" | "link";
 solidColor?: string;
 }>;
};

const OUTLINE_BTN =
 "inline-flex items-center bg-white text-[#3D3C38] border border-[#E2DFD9] text-[11.5px] font-semibold px-[13px] py-[6px] hover:bg-[#F9F8F6]";

const LEARN_CARDS: LearnCardConfig[] = [
 {
 id: "genai",
 gradient: "#0033a1,#0071ce",
 iconBg: "#e8f2fc",
 iconColor: "#0071ce",
 icon: (
 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0071ce" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
 <path d="M12 2a7 7 0 017 7c0 3-1.7 5.6-4.2 6.9L15 20H9l.2-4.1A7 7 0 015 9a7 7 0 017-7z" />
 <line x1="9" y1="20" x2="15" y2="20" />
 </svg>
 ),
 title: "Generative AI (GenAI)",
 sub: "Foundation module",
 body: "LLMs that produce text, summaries, and answers from prompts. Great for drafts, Q&A, and coaching — but no persistent identity, no governed actions.",
 bullets: [
 "Prompt → response (ChatGPT, Copilot, ISC AI Services)",
 "Risks: hallucination, data leakage, shadow AI",
 "SE talk track: GenAI assists humans — it is not an identity",
 ],
 bulletColor: "#0071ce",
 actions: [
 { label: "Practice →", href: "/challenges", variant: "outline" },
 { label: "Market pulse quiz →", href: "/market-pulse", variant: "link", solidColor: "#0071ce" },
 ],
 },
 {
 id: "agentic",
 gradient: "#5b21b6,#7c3aed",
 iconBg: "#ede9fe",
 iconColor: "#7c3aed",
 icon: (
 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
 <rect x="4" y="5" width="16" height="12" rx="3" />
 <circle cx="9" cy="11" r="1.2" fill="#7c3aed" stroke="none" />
 <circle cx="15" cy="11" r="1.2" fill="#7c3aed" stroke="none" />
 <path d="M9 14.5h6" />
 <line x1="12" y1="5" x2="12" y2="3" />
 </svg>
 ),
 title: "Agentic AI",
 sub: "Core differentiator",
 body: "AI systems that take actions across tools with goals, memory, and API access. Each agent is a non-human identity that needs discovery, ownership, and lifecycle governance.",
 bullets: [
 "Agents act — they don't just answer",
 "SailPoint Agentic Fabric: Discover → Govern → Protect",
 "AIS registers agents from AWS, Azure, GCP, Copilot Studio",
 ],
 bulletColor: "#7c3aed",
 actions: [
 { label: "Run simulation →", href: "/simulations", variant: "solid", solidColor: "#7c3aed" },
 { label: "Market pulse →", href: "/market-pulse", variant: "link", solidColor: "#7c3aed" },
 ],
 },
 {
 id: "ais",
 gradient: "#0369a1,#0891b2",
 iconBg: "#cffafe",
 iconColor: "#0891b2",
 icon: (
 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
 <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
 </svg>
 ),
 title: "Agent Identity Security (AIS)",
 sub: "SailPoint differentiator",
 body: "Purpose-built governance for AI agents as first-class identities — aggregation, ownership, certification, and over-permission reporting via Data Access Security.",
 bullets: [
 "Human vs non-human vs agent identity",
 "MCP Server: governed bridge for third-party agents",
 "CISO pain: shadow AI, NHI sprawl, audit gaps",
 ],
 bulletColor: "#0891b2",
 actions: [{ label: "AIS challenges →", href: "/challenges", variant: "outline" }],
 },
 {
 id: "discovery",
 gradient: "#b45309,#d97706",
 iconBg: "#fef3c7",
 iconColor: "#d97706",
 icon: (
 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
 <circle cx="12" cy="12" r="10" />
 <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
 <circle cx="12" cy="17" r=".5" fill="#d97706" />
 </svg>
 ),
 title: "Discovery questions that win",
 sub: "Field application",
 body: "Move customers from \"we bought Copilot\" to \"who owns agent access, how do we certify it, and what happens when the owner leaves?\"",
 bullets: [
 "How many AI agents touch production data today?",
 "Who is the human owner when an agent provisions access?",
 "What audit evidence exists for agent actions last quarter?",
 ],
 bulletColor: "#d97706",
 actions: [{ label: "Market pulse →", href: "/market-pulse", variant: "outline" }],
 },
];

function LearnCard({ card }: { card: LearnCardConfig }) {
 return (
 <div className="overflow-hidden border border-[#E2DFD9] bg-white transition hover:border-[#0071CE]/30">
 <div className="h-1" style={{ background: `linear-gradient(90deg,${card.gradient})` }} />
 <div className="p-[16px_18px]">
 <div className="mb-3 flex items-center gap-[11px]">
 <div
 className="flex h-10 w-10 shrink-0 items-center justify-center "
 style={{ background: card.iconBg }}
 >
 {card.icon}
 </div>
 <div>
 <p className="text-[13px] font-bold text-[#0D0E12]">{card.title}</p>
 <p className="text-[10.5px] text-[#6B6860]">{card.sub}</p>
 </div>
 </div>
 <p className="mb-3 text-[11.5px] leading-[1.65] text-[#374151]">{card.body}</p>
 <ul className="mb-[13px] space-y-[5px]">
 {card.bullets.map((bullet) => (
 <li key={bullet} className="flex gap-[7px]">
 <span className="mt-px shrink-0 text-[11px]" style={{ color: card.bulletColor }}>
 →
 </span>
 <span className="text-[11px] text-[#3D3C38]">{bullet}</span>
 </li>
 ))}
 </ul>
 <div className="flex flex-wrap gap-[9px]">
 {card.actions.map((action) => {
 if (action.variant === "link") {
 return (
 <Link
 key={action.label}
 className="flex items-center text-[11px] font-semibold"
 href={action.href}
 style={{ color: action.solidColor ?? "#0071ce" }}
 >
 {action.label}
 </Link>
 );
 }
 if (action.variant === "solid") {
 return (
 <Link
 key={action.label}
 className="inline-flex items-center px-[13px] py-[6px] text-[11.5px] font-semibold text-white"
 href={action.href}
 style={{ background: action.solidColor ?? "#0071ce" }}
 >
 {action.label}
 </Link>
 );
 }
 return (
 <Link key={action.label} className={OUTLINE_BTN} href={action.href}>
 {action.label}
 </Link>
 );
 })}
 </div>
 </div>
 </div>
 );
}

export function LearnPageNorthstar() {
 return (
 <div className="space-y-[14px]">
 <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
 {LEARN_CARDS.map((card) => (
 <LearnCard card={card} key={card.id} />
 ))}
 </div>

 <div
 className="flex flex-col items-start justify-between gap-5 p-[18px_22px] sm:flex-row sm:items-center"
 style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
 >
 <div>
 <div
 className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px]"
 style={{ background: "rgba(204,39,176,0.2)" }}
 >
 <span className="text-[9.5px] font-bold uppercase tracking-[0.05em] text-[#e879f9]">New in 2026</span>
 </div>
 <p className="font-display mb-[3px] text-[16px] font-extrabold text-white">Agentic AI challenge track</p>
 <p className="text-[11.5px] text-white/58">
 Filter the challenge library for Agentic AI / AIS topics — or jump to simulations with CISO and architect
 personas.
 </p>
 </div>
 <div className="flex shrink-0 flex-wrap gap-2">
 <Link
 className="inline-flex items-center border px-3.5 py-2 text-[12px] font-semibold text-white"
 href="/challenges"
 style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }}
 >
 Challenge library →
 </Link>
 <Link
 className="inline-flex items-center bg-[#0071ce] px-[18px] py-[9px] text-[12.5px] font-semibold text-white"
 href="/simulations"
 >
 Simulations →
 </Link>
 </div>
 </div>
 </div>
 );
}
