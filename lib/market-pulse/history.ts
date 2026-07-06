export type MarketPulseResult = {
  weekId: string;
  score: number;
  total: number;
  completedAt: string;
};

const STORAGE_KEY = "se-platform-market-pulse-history";

export function currentWeekId(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().slice(0, 10);
}

export function loadMarketPulseHistory(): MarketPulseResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MarketPulseResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMarketPulseResult(result: Omit<MarketPulseResult, "completedAt">) {
  if (typeof window === "undefined") return;
  const history = loadMarketPulseHistory().filter((item) => item.weekId !== result.weekId);
  history.unshift({
    ...result,
    completedAt: new Date().toISOString(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 12)));
}

export function latestMarketPulseScore(history: MarketPulseResult[]) {
  return history[0] ?? null;
}
