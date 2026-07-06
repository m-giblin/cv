#!/usr/bin/env node
/**
 * Creates or updates John Barrett's auth account + manager profile.
 *
 * Usage: node scripts/seed-john-barrett-manager.mjs
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const JOHN = {
  email: "john.barrett@sailpoint.com",
  password: "DemoMgr2026!",
  fullName: "John Barrett",
  role: "manager",
  level: "Senior",
};

const MATT_EMAIL = "matt.giblin@sailpoint.com";

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function resolveMattId() {
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("email", MATT_EMAIL)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function upsertManager(user, managerId) {
  const existing = await findUserByEmail(user.email);
  let userId = existing?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });
    if (error) throw new Error(`${user.email}: ${error.message}`);
    userId = data.user.id;
    console.log(`Created auth user ${user.email}`);
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });
    if (error) throw new Error(`${user.email}: ${error.message}`);
    console.log(`Updated auth user ${user.email}`);
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role, level, manager_id")
    .eq("id", userId)
    .maybeSingle();

  const payload = {
    id: userId,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    level: user.level,
    manager_id: managerId,
  };

  if (!existingProfile) {
    const { error } = await admin.from("profiles").insert(payload);
    if (error) throw new Error(`Profile ${user.email}: ${error.message}`);
    return userId;
  }

  const needsReplace =
    existingProfile.role !== user.role ||
    existingProfile.level !== user.level ||
    (managerId ?? null) !== (existingProfile.manager_id ?? null);

  if (needsReplace) {
    const { error: deleteError } = await admin.from("profiles").delete().eq("id", userId);
    if (deleteError) throw new Error(deleteError.message);

    const { error: insertError } = await admin.from("profiles").insert(payload);
    if (insertError) throw new Error(insertError.message);
  } else {
    const { error } = await admin.from("profiles").update({ full_name: user.fullName }).eq("id", userId);
    if (error) throw new Error(error.message);
  }

  console.log(`Manager profile ready: ${user.fullName} (${user.role} / ${user.level})`);
  return userId;
}

async function main() {
  const mattId = await resolveMattId();
  if (mattId) {
    console.log(`Reports to Matt Giblin (${MATT_EMAIL})`);
  } else {
    console.log(`Matt Giblin profile not found — John will have no manager_id`);
  }

  await upsertManager(JOHN, mattId);

  console.log("\nJohn Barrett can sign in at /login");
  console.log(`  Email:    ${JOHN.email}`);
  console.log(`  Password: ${JOHN.password}`);
  console.log("  First login → MFA enrollment (scan QR with authenticator app)");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
