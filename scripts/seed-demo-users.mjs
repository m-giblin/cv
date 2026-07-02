#!/usr/bin/env node
/**
 * Creates demo SE (and optional manager) auth users + profiles for local testing.
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 *
 * Usage: node scripts/seed-demo-users.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_SE = {
  email: "demo.se@example.com",
  password: "DemoSE2026!",
  fullName: "Demo SE",
  role: "basic_se",
  level: "Basic",
};

const DEMO_MANAGER = {
  email: "demo.manager@example.com",
  password: "DemoMgr2026!",
  fullName: "Demo Manager",
  role: "manager",
  level: "Senior",
};

async function upsertUser(user, managerId = null) {
  const { data: existingList } = await admin.auth.admin.listUsers();
  const existing = existingList.users.find((item) => item.email?.toLowerCase() === user.email);

  let userId = existing?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });

    if (error) {
      throw new Error(`${user.email}: ${error.message}`);
    }

    userId = data.user.id;
    console.log(`Created auth user ${user.email}`);
  } else {
    console.log(`Auth user exists ${user.email}`);
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      level: user.level,
      manager_id: managerId,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw new Error(`Profile ${user.email}: ${profileError.message}`);
  }

  return userId;
}

async function main() {
  const managerId = await upsertUser(DEMO_MANAGER);
  await upsertUser(DEMO_SE, managerId);

  console.log("\nDemo accounts ready:\n");
  console.log(`  SE:      ${DEMO_SE.email} / ${DEMO_SE.password}`);
  console.log(`  Manager: ${DEMO_MANAGER.email} / ${DEMO_MANAGER.password}`);
  console.log("\nBoth use @example.com — allowed alongside @sailpoint.com for testing.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
