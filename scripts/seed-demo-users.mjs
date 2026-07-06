#!/usr/bin/env node
/**
 * Creates demo SE auth users + profiles for local testing.
 * Demo SEs report to existing SailPoint managers (not duplicate @example.com managers).
 *
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

const SE_PASSWORD = "DemoSE2026!";
const MGR_PASSWORD = "DemoMgr2026!";

/** Duplicate manager accounts created in error — removed on each seed run. */
const DUPLICATE_MANAGER_EMAILS = ["john.barrett@example.com", "matt.giblin@example.com"];

const DEMO_MANAGER = {
  email: "demo.manager@example.com",
  password: MGR_PASSWORD,
  fullName: "Demo Manager",
  role: "manager",
  level: "Senior",
};

const DEMO_SE = {
  email: "demo.se@example.com",
  password: SE_PASSWORD,
  fullName: "Demo SE",
  role: "basic_se",
  level: "Basic",
};

const MANAGER_EMAILS = {
  john: "john.barrett@sailpoint.com",
  matt: "matt.giblin@sailpoint.com",
};

const SE_ROSTER = {
  [MANAGER_EMAILS.john]: [
    { email: "avery.brooks@example.com", fullName: "Avery Brooks" },
    { email: "blake.chen@example.com", fullName: "Blake Chen" },
    { email: "caleb.diaz@example.com", fullName: "Caleb Diaz" },
    { email: "dana.evans@example.com", fullName: "Dana Evans" },
    { email: "ellis.foster@example.com", fullName: "Ellis Foster" },
    { email: "morgan.lee@example.com", fullName: "Morgan Lee" },
    { email: "quinn.martin@example.com", fullName: "Quinn Martin" },
  ],
  [MANAGER_EMAILS.matt]: [
    { email: "finn.grant@example.com", fullName: "Finn Grant" },
    { email: "gray.hayes@example.com", fullName: "Gray Hayes" },
    { email: "harper.ivan@example.com", fullName: "Harper Ivan" },
    { email: "indigo.james@example.com", fullName: "Indigo James" },
    { email: "jules.kim@example.com", fullName: "Jules Kim" },
  ],
};

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

async function findProfileIdByEmail(email) {
  const { data, error } = await admin.from("profiles").select("id, email, full_name").eq("email", email).maybeSingle();
  if (error) throw new Error(`${email}: ${error.message}`);
  return data;
}

async function upsertUser(user, managerId = null) {
  const existing = await findUserByEmail(user.email);
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

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, manager_id, role, level, email")
    .eq("id", userId)
    .maybeSingle();

  const profilePayload = {
    id: userId,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    level: user.level,
    manager_id: managerId,
  };

  if (!existingProfile) {
    const { error: profileError } = await admin.from("profiles").insert(profilePayload);

    if (profileError) {
      throw new Error(`Profile ${user.email}: ${profileError.message}`);
    }
    return userId;
  }

  const needsReplace =
    existingProfile.role !== user.role ||
    existingProfile.level !== user.level ||
    (managerId ?? null) !== (existingProfile.manager_id ?? null);

  if (needsReplace) {
    const { error: deleteError } = await admin.from("profiles").delete().eq("id", userId);
    if (deleteError) {
      throw new Error(`Profile ${user.email}: ${deleteError.message}`);
    }

    const { error: insertError } = await admin.from("profiles").insert(profilePayload);
    if (insertError) {
      throw new Error(`Profile ${user.email}: ${insertError.message}`);
    }

    console.log(`  Updated profile fields for ${user.email}`);
    return userId;
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: user.fullName })
    .eq("id", userId);

  if (profileError) {
    throw new Error(`Profile ${user.email}: ${profileError.message}`);
  }

  return userId;
}

async function deleteDuplicateManager(email) {
  const user = await findUserByEmail(email);
  if (!user) {
    console.log(`No duplicate account to remove: ${email}`);
    return;
  }

  const { count, error: countError } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("manager_id", user.id);

  if (countError) {
    throw new Error(`${email}: ${countError.message}`);
  }

  if (count && count > 0) {
    throw new Error(`${email} still has ${count} direct report(s) — reassign before delete`);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    throw new Error(`Delete ${email}: ${deleteError.message}`);
  }

  console.log(`Removed duplicate manager account ${email}`);
}

async function resolveManagers() {
  const managers = {};

  for (const [key, email] of Object.entries(MANAGER_EMAILS)) {
    const profile = await findProfileIdByEmail(email);
    if (!profile) {
      throw new Error(
        `Missing manager profile ${email}. Sign in once or create the account in Admin before seeding demo SEs.`,
      );
    }
    managers[key] = profile;
    console.log(`Using manager ${profile.full_name} (${email})`);
  }

  return managers;
}

async function main() {
  const managers = await resolveManagers();

  const legacyManagerId = await upsertUser(DEMO_MANAGER);
  await upsertUser(DEMO_SE, legacyManagerId);

  for (const [managerEmail, ses] of Object.entries(SE_ROSTER)) {
    const managerProfile = Object.values(managers).find((m) => m.email === managerEmail);
    if (!managerProfile) {
      throw new Error(`No manager profile for ${managerEmail}`);
    }

    for (const se of ses) {
      await upsertUser(
        {
          email: se.email,
          password: SE_PASSWORD,
          fullName: se.fullName,
          role: "basic_se",
          level: "Basic",
        },
        managerProfile.id,
      );
    }
  }

  for (const email of DUPLICATE_MANAGER_EMAILS) {
    await deleteDuplicateManager(email);
  }

  console.log("\nDemo accounts ready:\n");
  console.log(`  Legacy SE:      ${DEMO_SE.email} / ${SE_PASSWORD}`);
  console.log(`  Legacy Manager: ${DEMO_MANAGER.email} / ${MGR_PASSWORD}`);
  console.log("\n  John Barrett team (@example.com SEs → john.barrett@sailpoint.com):");
  for (const se of SE_ROSTER[MANAGER_EMAILS.john]) {
    console.log(`    SE: ${se.email} / ${SE_PASSWORD}`);
  }
  console.log("\n  Matt Giblin team (@example.com SEs → matt.giblin@sailpoint.com):");
  for (const se of SE_ROSTER[MANAGER_EMAILS.matt]) {
    console.log(`    SE: ${se.email} / ${SE_PASSWORD}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
