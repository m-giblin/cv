export type PreflightTool = "market-pulse" | "deal-prep" | "simulations" | "flight-check";

/** Minutes each pre-flight step takes; Practice sums them for its subtitle. */
export const PREFLIGHT_MINUTES: Record<PreflightTool, number> = {
  "market-pulse": 5,
  "deal-prep": 10,
  simulations: 15,
  "flight-check": 5,
};
