import type { ReactNode } from "react";

/** Admin portal page shell — design_handoff_portals Admin Experience v1 */
export function AdminPageLayout({
  eyebrow,
  eyebrowColor = "#0071ce",
  title,
  subtitle,
  children,
  headerRight,
}: {
  eyebrow: string;
  eyebrowColor?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerRight?: ReactNode;
}) {
  return (
    <div className="anim-in p-[22px_22px_34px]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="border-l-[3px] pl-[14px]" style={{ borderColor: eyebrowColor }}>
          <p className="mb-[5px] font-mono text-[8.5px] font-medium uppercase tracking-[0.16em] text-[#A09D98]">
            {eyebrow}
          </p>
          <h1 className="font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] text-[#0D0E12]">
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-[12px] text-[#6B6860]">{subtitle}</p> : null}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

export const ADMIN_TAB_HEADERS: Record<
  string,
  { eyebrow: string; eyebrowColor?: string; title: string; subtitle?: string }
> = {
  overview: { eyebrow: "Platform", title: "Platform Overview" },
  users: { eyebrow: "Directory", title: "Users", subtitle: "Invite, import, and manage roles" },
  plans: { eyebrow: "Onboarding", title: "Plans", subtitle: "Ramp templates and assignments" },
  competencies: { eyebrow: "Content", title: "Competencies", subtitle: "Competency framework and learning assets" },
  "content-portal": {
    eyebrow: "Content ops",
    eyebrowColor: "#cc27b0",
    title: "Content Portal",
    subtitle: "AI-generated and manual content task queue",
  },
  reviews: {
    eyebrow: "Queue",
    eyebrowColor: "#d4810a",
    title: "Reviews",
    subtitle: "Pending challenge, sim, plan, and cert reviews",
  },
  analytics: { eyebrow: "Insights", title: "Analytics", subtitle: "Engagement, ramp, and certification metrics" },
  ai: { eyebrow: "Platform", eyebrowColor: "#cc27b0", title: "AI & Sims", subtitle: "Provider config, templates, and usage" },
  corpus: { eyebrow: "Knowledge", title: "Corpus", subtitle: "Master corpus and routing rules" },
  routing: { eyebrow: "Knowledge", title: "Corpus routing", subtitle: "Segment and solution routing" },
  audit: { eyebrow: "Compliance", title: "Audit log", subtitle: "Administrative actions and platform events" },
  help: { eyebrow: "Support", title: "Help", subtitle: "Operator guidance and escalation paths" },
  settings: { eyebrow: "Configuration", title: "Platform Settings", subtitle: "Feature flags, integrations, and retention" },
};

export const ADMIN_SETTINGS_HEADERS: Record<string, { eyebrow: string; eyebrowColor?: string; title: string; subtitle: string }> = {
  flags: { eyebrow: "22 toggles", title: "Feature flags", subtitle: "Entitlements and route visibility per tenant" },
  integrations: { eyebrow: "Connections", title: "Integrations", subtitle: "Gong, Slack, Supabase, and deployment hooks" },
  ai: { eyebrow: "AI provider", title: "AI config", subtitle: "Model, API keys, and global AI toggles" },
  basic: { eyebrow: "Tenant", title: "Basic settings", subtitle: "Identity, branding, and session policy" },
  retention: { eyebrow: "Data lifecycle", title: "Basic & retention", subtitle: "Audit, activity, and AI usage retention" },
};
