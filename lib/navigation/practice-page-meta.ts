export type PracticePageMeta = {
  section: string;
  title: string;
  eyebrow: string;
  /** Magenta/pink tag on workspace sub-bar */
  workspaceTag: string;
  workspaceTagBg: string;
  workspaceTagColor: string;
};

const PRACTICE_PAGES: Record<string, PracticePageMeta> = {
  "/simulations": {
    section: "Practice",
    title: "Simulations",
    eyebrow: "AI roleplay",
    workspaceTag: "AI ROLEPLAY",
    workspaceTagBg: "#FDF0FA",
    workspaceTagColor: "#A51E8E",
  },
  "/pitch": {
    section: "Practice",
    title: "Pitch Studio",
    eyebrow: "Video",
    workspaceTag: "VIDEO · SELF REVIEW",
    workspaceTagBg: "#FEF0EE",
    workspaceTagColor: "#B83128",
  },
  "/challenges": {
    section: "Practice",
    title: "Challenges",
    eyebrow: "117 available",
    workspaceTag: "WRITTEN",
    workspaceTagBg: "#EDE9FE",
    workspaceTagColor: "#5b21b6",
  },
  "/flight-check": {
    section: "Practice",
    title: "Flight Check",
    eyebrow: "Adaptive",
    workspaceTag: "ADAPTIVE ASSESSMENT",
    workspaceTagBg: "#E0F2FE",
    workspaceTagColor: "#0369A1",
  },
  "/market-pulse": {
    section: "Practice",
    title: "Market Pulse",
    eyebrow: "Competitive",
    workspaceTag: "COMPETITIVE INTEL · WEEKLY",
    workspaceTagBg: "#F0FDF7",
    workspaceTagColor: "#0A6E45",
  },
  "/prep": {
    section: "Practice",
    title: "Deal Prep",
    eyebrow: "Pre-call AI",
    workspaceTag: "AI PRE-CALL BRIEF",
    workspaceTagBg: "#FFFBF0",
    workspaceTagColor: "#D4810A",
  },
};

export function getPracticePageMeta(pathname: string): PracticePageMeta | null {
  const base = pathname.split("?")[0] ?? pathname;
  return PRACTICE_PAGES[base] ?? null;
}

export function isPracticeWorkspacePath(pathname: string): boolean {
  return getPracticePageMeta(pathname) !== null;
}
