import Link from "next/link";
import { ArrowRight, Layers, Sparkles } from "lucide-react";
import { SITE_PAGES } from "@/components/design/mock-data";
import { RESEARCH_INSIGHTS } from "@/components/design/research-notes";

const DESIGNS = [
  {
    id: "field",
    name: "FIELD",
    recommended: true,
    tagline: "Competitive synthesis · week runway · practice-first",
    mood:
      "Researched Allego, Mindtickle, SalesHood, Seismic, Hyperbound, Rippling, Siro. Week 1–8 runway, flight-simulator sims, shadow log, manager command center.",
    href: "/design/field",
    accent: "from-[#0033a1] to-emerald-600",
    border: "border-emerald-500/30 hover:border-emerald-400/60 ring-1 ring-emerald-500/20",
  },
  {
    id: "northstar",
    name: "NORTHSTAR",
    recommended: false,
    tagline: "Production baseline · SE + Manager + Admin",
    mood:
      "Warm cream bento, #0033a1 accents. Currently shipping in production via feature flag.",
    href: "/design/northstar",
    accent: "from-[#FDFBF7] to-[#0033a1]",
    border: "border-[#0033a1]/20 hover:border-[#0033a1]/40",
  },
  {
    id: "vector",
    name: "VECTOR",
    recommended: false,
    tagline: "Dark brand workflow · SE + manager optimized",
    mood: "Evolution of COMMAND with #0033a1 and #d70fb6. Compare against FIELD for onboarding fit.",
    href: "/design/vector",
    accent: "from-[#0033a1] to-[#d70fb6]",
    border: "border-[#d70fb6]/40 hover:border-[#d70fb6]/70",
  },
  {
    name: "COMMAND",
    recommended: false,
    tagline: "Dark HUD · cyan telemetry · AI side rail",
    mood: "Earlier exploration — ops-center aesthetic. Compare against VECTOR for workflow and brand fit.",
    href: "/design/command",
    accent: "from-cyan-500 to-blue-600",
    border: "border-cyan-500/30 hover:border-cyan-400/60",
  },
];

export default function DesignHubPage() {
  return (
    <main className="design-vector vx-mesh min-h-screen bg-[#060d1a] text-[#e8eef8]">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-12">
          <p className="font-[family-name:var(--font-design-mono)] text-xs font-medium uppercase tracking-[0.3em] text-[#d70fb6]">
            SE Enablement · Design exploration
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-design-display)] text-4xl font-bold tracking-tight sm:text-5xl">
            Built for the SE workflow.{" "}
            <span className="bg-gradient-to-r from-[#0033a1] to-[#d70fb6] bg-clip-text text-transparent">
              Fast for managers.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[#8b9cb8]">
            Researched Allego, Mindtickle, SalesHood, Seismic Learning, Hyperbound, Rippling LMS, and Siro. FIELD
            synthesizes the patterns that fit SailPoint SE onboarding — production pages untouched.
          </p>
          <Link
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
            href="/design/field/research"
          >
            Read full competitive analysis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {DESIGNS.map((design) => (
            <Link
              className={`group relative overflow-hidden rounded-2xl border bg-[#0c1529]/90 p-8 transition ${design.border}`}
              href={design.href}
              key={design.id}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${design.accent} opacity-5 transition group-hover:opacity-10`} />
              <div className="relative">
                {design.recommended ? (
                  <span className="mb-2 inline-block rounded-full bg-[#d70fb6]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f0a8e8]">
                    Recommended
                  </span>
                ) : null}
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#d70fb6]" />
                  <h2 className="font-[family-name:var(--font-design-display)] text-2xl font-bold">{design.name}</h2>
                </div>
                <p className="mt-2 font-[family-name:var(--font-design-mono)] text-sm text-[#d70fb6]/90">
                  {design.tagline}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-[#8b9cb8]">{design.mood}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  View mock-up
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-[rgba(0,51,161,0.3)] bg-[#0c1529]/60 p-8">
          <h2 className="font-[family-name:var(--font-design-display)] text-lg font-bold">What we learned from the market</h2>
          <ul className="mt-4 space-y-3">
            {RESEARCH_INSIGHTS.map((r) => (
              <li className="text-sm text-[#8b9cb8]" key={r.source}>
                <span className="font-semibold text-white">{r.source}</span> — {r.takeaway}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-[rgba(0,51,161,0.3)] bg-[#0c1529]/60 p-8">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#8b9cb8]" />
            <h2 className="font-[family-name:var(--font-design-display)] text-lg font-bold">Page inventory</h2>
          </div>
          <p className="mt-2 text-sm text-[#8b9cb8]">
            Mock-ups cover the four highest-traffic flows. Remaining pages inherit the chosen system later.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {SITE_PAGES.map((group) => (
              <div key={group.group}>
                <p className="font-[family-name:var(--font-design-mono)] text-xs uppercase tracking-wider text-[#8b9cb8]">
                  {group.group}
                </p>
                <ul className="mt-2 space-y-1">
                  {group.pages.map((page) => (
                    <li className="text-sm text-[#8b9cb8]" key={page}>
                      {page}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
