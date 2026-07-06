/**
 * Platform smoke + performance test.
 * - Benchmarks scoped page data loaders (Supabase)
 * - Warms and times all app pages + GET APIs on the dev server
 *
 * Usage: npx tsx scripts/platform-smoke.ts
 * Env: reads .env.local; BASE_URL defaults to http://localhost:3003
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { Database } from "../lib/database.types";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (!process.env[trimmed.slice(0, eq)]) {
      process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
  }
}

loadEnv();

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3003";
const PAGE_WARN_MS = Number(process.env.SMOKE_PAGE_WARN_MS ?? 3000);
const PAGE_FAIL_MS = Number(process.env.SMOKE_PAGE_FAIL_MS ?? 15000);
const API_WARN_MS = Number(process.env.SMOKE_API_WARN_MS ?? 2000);
const LOADER_WARN_MS = Number(process.env.SMOKE_LOADER_WARN_MS ?? 4000);

type Result = {
  name: string;
  ok: boolean;
  ms: number;
  status?: number;
  note?: string;
};

const results: Result[] = [];

function record(name: string, ok: boolean, ms: number, extra?: { status?: number; note?: string }) {
  results.push({ name, ok, ms, ...extra });
}

async function timed<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const value = await fn();
    record(name, true, performance.now() - start);
    return value;
  } catch (error) {
    record(name, false, performance.now() - start, {
      note: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

const APP_PAGES = [
  "/dashboard",
  "/manager",
  "/pitch",
  "/lab",
  "/challenges",
  "/simulations",
  "/prep",
  "/plans",
  "/development",
  "/certifications",
  "/learn",
  "/market-pulse",
  "/resources",
  "/growth",
  "/feedback",
  "/my-plan",
  "/account",
  "/admin",
  "/flight-check",
];

const GET_APIS = [
  "/api/pitch/library",
  "/api/isc-lab/pre-call-brief",
  "/api/integrations/status",
  "/api/engagement",
  "/api/deal-prep/sessions",
  "/api/deal-prep/sessions?group=account",
  "/api/gamification/scorecard",
  "/api/market-pulse",
  "/api/content",
  "/api/challenges",
  "/api/certifications",
  "/api/learn/progress",
  "/api/assessments/flight-check",
  "/api/plans/templates",
  "/api/admin/users",
  "/api/admin/ai-settings",
  "/api/admin/simulation-templates",
  "/api/manager/isc-lab-stats",
  "/api/mentor-reviews",
  "/api/pitch/submissions/pending",
  "/api/practice/spaced-reinforcement",
];

async function fetchRoute(path: string, cookie?: string) {
  const start = performance.now();
  const response = await fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    headers: cookie ? { Cookie: cookie } : undefined,
  });
  const ms = performance.now() - start;
  return { response, ms };
}

async function benchmarkLoaders() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn("Skipping loader benchmarks — missing Supabase env");
    return;
  }

  const { getManagerPageData } = await import("../lib/data/get-manager-page-data");
  const { getDashboardPageData } = await import("../lib/data/get-dashboard-page-data");
  const { getPitchPageData } = await import("../lib/data/get-pitch-page-data");
  const { getLabPageData } = await import("../lib/data/get-lab-page-data");
  const { getChallengesPageData } = await import("../lib/data/get-challenges-page-data");
  const { getSimulationsPageData } = await import("../lib/data/get-simulations-page-data");
  const { getDashboardData } = await import("../lib/data/get-dashboard-data");

  // Loaders use server cookies — without a request context they fall back to demo data (fast path check)
  await timed("loader:getPitchPageData (demo fallback)", async () => getPitchPageData());
  await timed("loader:getLabPageData (demo fallback)", async () => getLabPageData());
  await timed("loader:getDashboardPageData (demo fallback)", async () => getDashboardPageData());
  await timed("loader:getManagerPageData (demo fallback)", async () => getManagerPageData());
  await timed("loader:getChallengesPageData (demo fallback)", async () => getChallengesPageData());
  await timed("loader:getSimulationsPageData (demo fallback)", async () => getSimulationsPageData());
  await timed("loader:getDashboardData legacy (demo fallback)", async () => getDashboardData());

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: managerProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", "demo.manager@example.com")
    .maybeSingle();

  if (managerProfile?.id) {
    const orgStart = performance.now();
    const { data: subtree } = await admin.rpc("get_profile_subtree", {
      root_profile_id: managerProfile.id,
    });
    const orgIds = (subtree ?? []).map((row) => row.id);
    await Promise.all([
      orgIds.length
        ? admin.from("challenge_submissions").select("id", { count: "exact", head: true }).in("user_id", orgIds)
        : Promise.resolve(null),
      orgIds.length
        ? admin.from("coaching_cards").select("id", { count: "exact", head: true }).in("user_id", orgIds)
        : Promise.resolve(null),
      orgIds.length
        ? admin.from("activity_logs").select("id", { count: "exact", head: true }).in("user_id", orgIds)
        : Promise.resolve(null),
    ]);
    record("db:manager-scoped-queries", true, performance.now() - orgStart, {
      note: `${orgIds.length} org members`,
    });
  }

  const { data: seProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", "demo.se@example.com")
    .maybeSingle();

  if (seProfile?.id) {
    const seStart = performance.now();
    await Promise.all([
      admin.from("coaching_cards").select("id", { count: "exact", head: true }).eq("user_id", seProfile.id),
      admin.from("activity_logs").select("id", { count: "exact", head: true }).eq("user_id", seProfile.id),
      admin.from("challenge_submissions").select("id", { count: "exact", head: true }).eq("user_id", seProfile.id),
      admin.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", seProfile.id),
    ]);
    record("db:se-scoped-queries", true, performance.now() - seStart);
  }
}

async function tryAuthCookie(): Promise<string | undefined> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return undefined;

  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: "demo.manager@example.com",
    password: "DemoMgr2026!",
  });
  if (error || !data.session) {
    record("auth:demo.manager", false, 0, { note: error?.message ?? "no session" });
    return undefined;
  }

  const projectRef = new URL(url).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const payload = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: "bearer",
    user: data.session.user,
  });
  const encoded = `base64-${Buffer.from(payload).toString("base64")}`;
  record("auth:demo.manager", true, 0, { note: "session acquired" });
  return `${cookieName}=${encodeURIComponent(encoded)}`;
}

async function warmAndTestPages(cookie?: string) {
  // Warm pass (dev compile)
  for (const path of APP_PAGES) {
    try {
      await fetchRoute(path, cookie);
    } catch {
      // server may be down
    }
  }

  for (const path of APP_PAGES) {
    const label = `page:${path}`;
    try {
      const { response, ms } = await fetchRoute(path, cookie);
      const status = response.status;
      const ok =
        ms < PAGE_FAIL_MS &&
        (status === 200 || status === 302 || status === 307 || status === 308);
      record(label, ok, ms, {
        status,
        note: ok && ms > PAGE_WARN_MS ? "slow" : undefined,
      });
    } catch (error) {
      record(label, false, PAGE_FAIL_MS, {
        note: error instanceof Error ? error.message : "fetch failed",
      });
    }
  }
}

async function testGetApis(cookie?: string) {
  for (const path of GET_APIS) {
    const label = `api:${path}`;
    try {
      const { response, ms } = await fetchRoute(path, cookie);
      const status = response.status;
      const ok = ms < PAGE_FAIL_MS && (status < 500);
      record(label, ok, ms, {
        status,
        note: status === 401 ? "auth required" : status >= 500 ? "server error" : ms > API_WARN_MS ? "slow" : undefined,
      });
    } catch (error) {
      record(label, false, PAGE_FAIL_MS, {
        note: error instanceof Error ? error.message : "fetch failed",
      });
    }
  }
}

function printReport() {
  const failed = results.filter((r) => !r.ok);
  const slow = results.filter((r) => r.ok && r.ms > PAGE_WARN_MS);
  const passed = results.filter((r) => r.ok);

  console.log("\n══════════════════════════════════════════");
  console.log(`Platform smoke — ${BASE_URL}`);
  console.log("══════════════════════════════════════════\n");

  console.log(`✓ ${passed.length} passed   ✗ ${failed.length} failed   ⚠ ${slow.length} slow\n`);

  if (failed.length) {
    console.log("FAILURES:");
    for (const row of failed) {
      console.log(`  ✗ ${row.name} — ${row.ms.toFixed(0)}ms ${row.note ?? ""} ${row.status ?? ""}`);
    }
    console.log();
  }

  if (slow.length) {
    console.log(`SLOW (>${PAGE_WARN_MS}ms):`);
    for (const row of slow.sort((a, b) => b.ms - a.ms).slice(0, 20)) {
      console.log(`  ⚠ ${row.name} — ${row.ms.toFixed(0)}ms ${row.note ?? ""} ${row.status ?? ""}`);
    }
    console.log();
  }

  const pages = results.filter((r) => r.name.startsWith("page:") && r.ok);
  if (pages.length) {
    const avg = pages.reduce((sum, row) => sum + row.ms, 0) / pages.length;
    const max = Math.max(...pages.map((row) => row.ms));
    console.log(`Pages: avg ${avg.toFixed(0)}ms · max ${max.toFixed(0)}ms (${pages.length} routes)\n`);
  }

  const apis = results.filter((r) => r.name.startsWith("api:") && r.ok);
  if (apis.length) {
    const avg = apis.reduce((sum, row) => sum + row.ms, 0) / apis.length;
    const max = Math.max(...apis.map((row) => row.ms));
    console.log(`APIs:  avg ${avg.toFixed(0)}ms · max ${max.toFixed(0)}ms (${apis.length} endpoints)\n`);
  }
}

async function main() {
  console.log(`Checking server at ${BASE_URL}…`);
  try {
    const health = await fetch(`${BASE_URL}/login`);
    if (!health.ok && health.status !== 200) {
      console.error(`Server not reachable (${health.status})`);
      process.exit(1);
    }
  } catch {
    console.error(`Cannot reach ${BASE_URL} — start dev server: npm run dev`);
    process.exit(1);
  }

  await benchmarkLoaders();
  const cookie = await tryAuthCookie();
  await warmAndTestPages(cookie);
  await testGetApis(cookie);
  printReport();

  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
