/** Nav display tokens from design_handoff_navigation prototype — emoji icons per route. */
export const NAV_ROUTE_ICONS: Record<string, string> = {
  "/dashboard": "⬛",
  "/my-plan": "📋",
  "/growth": "📈",
  "/feedback": "💬",
  "/learn": "📚",
  "/lab": "🔬",
  "/development": "🎯",
  "/certifications": "🏆",
  "/market-pulse": "🧠",
  "/prep": "✨",
  "/challenges": "⚡",
  "/simulations": "🤖",
  "/pitch": "🎬",
  "/flight-check": "✈️",
  "/resources": "📁",
  "/manager": "👥",
  "/plans": "📋",
  "/admin": "🛡️",
};

export function navRouteIcon(href: string) {
  const path = href.split("?")[0] ?? href;
  return NAV_ROUTE_ICONS[href] ?? NAV_ROUTE_ICONS[path] ?? "•";
}
