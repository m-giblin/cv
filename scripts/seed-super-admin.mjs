#!/usr/bin/env node
/**
 * Promotes a user to platform super_admin (no tenant_id).
 *
 * Usage: node scripts/seed-super-admin.mjs matt.giblin@sailpoint.com
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const email = process.argv[2]?.trim();
if (!email) {
  console.error("Usage: node scripts/seed-super-admin.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserByEmail(targetEmail) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === targetEmail.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function main() {
  const user = await findUserByEmail(email);
  if (!user) throw new Error(`No auth user for ${email}`);

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, tenant_id, full_name, manager_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) throw new Error("Profile not found");

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      role: "super_admin",
      level: "Senior",
      manager_id: null,
      tenant_id: null,
    })
    .eq("id", user.id);

  if (updateError) {
    if (updateError.message.includes("Cannot change role")) {
      throw new Error(
        "Profile guard blocked update. Run supabase/migrations/20260810120000_service_role_profile_guard_bypass.sql in the Supabase SQL editor, then retry.",
      );
    }
    throw new Error(updateError.message);
  }

  console.log(`Super admin ready: ${email} → sign in at /platform`);
  console.log(`Previous role: ${profile.role}, tenant: ${profile.tenant_id ?? "none"}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
