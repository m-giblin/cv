/**
 * Canonical SE workspace routes (design_handoff_se_enablement_v2/nav-model.ts). The old flat
 * routes still resolve: each legacy page redirects here and keeps its query string, so stored
 * notification links, bookmarks and manager/admin links keep working.
 */

export const SE_ROUTES = {
  today: "/dashboard",
  ramp: "/my-plan",
  rampCalendar: "/my-plan?view=calendar",
  practice: "/practice",
  simulations: "/practice/simulations",
  challenges: "/practice/challenges",
  pitch: "/practice/pitch",
  quizzes: "/practice/quizzes",
  flightCheck: "/practice/flight-check",
  dealPrep: "/practice/deal-prep",
  readiness: "/readiness",
  feedback: "/readiness/feedback",
  growthPlan: "/readiness/growth-plan",
  certification: "/readiness/certification",
  learn: "/learn",
  lab: "/learn/lab",
} as const;

/** Legacy path → canonical path. Longest match wins, so /growth/readiness beats /growth. */
export const LEGACY_SE_REDIRECTS: Record<string, string> = {
  "/prep": SE_ROUTES.dealPrep,
  "/simulations": SE_ROUTES.simulations,
  "/challenges": SE_ROUTES.challenges,
  "/pitch": SE_ROUTES.pitch,
  "/flight-check": SE_ROUTES.flightCheck,
  "/market-pulse": SE_ROUTES.quizzes,
  "/my-practice": SE_ROUTES.practice,
  "/growth": SE_ROUTES.readiness,
  "/growth/readiness": SE_ROUTES.readiness,
  "/feedback": SE_ROUTES.feedback,
  "/growth-plan": SE_ROUTES.growthPlan,
  "/certifications": SE_ROUTES.certification,
  "/resources": SE_ROUTES.learn,
  "/lab": SE_ROUTES.lab,
  "/plan-calendar": SE_ROUTES.rampCalendar,
};

type SearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | undefined;

function toSearchParams(input: SearchParamsInput): URLSearchParams {
  if (!input) return new URLSearchParams();
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") params.append(key, value);
    else if (Array.isArray(value)) for (const item of value) params.append(key, item);
  }
  return params;
}

/**
 * Target for a legacy SE path, with the incoming query merged onto the target's own query
 * (target keys win, so `/plan-calendar?view=x` still lands on the calendar view).
 * Returns null when the path is not a legacy SE route.
 */
export function legacySeRedirect(pathname: string, searchParams?: SearchParamsInput): string | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const target = LEGACY_SE_REDIRECTS[clean];
  if (!target) return null;

  const [targetPath = target, targetQuery = ""] = target.split("?");
  const merged = toSearchParams(searchParams);
  for (const [key, value] of new URLSearchParams(targetQuery)) merged.set(key, value);
  const query = merged.toString();
  return query ? `${targetPath}?${query}` : targetPath;
}

/** Rewrites any legacy SE href (path + optional query) to its canonical route; other hrefs pass through. */
export function canonicalSeHref(href: string): string {
  const [path = href, query] = href.split("?");
  return legacySeRedirect(path, query ? new URLSearchParams(query) : undefined) ?? href;
}
