#!/usr/bin/env node
/**
 * Remove all MFA factors for a user so they can re-enroll at next login.
 *
 * Usage:
 *   node scripts/reset-user-mfa.mjs john.barrett@sailpoint.com
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
  console.error("Usage: node scripts/reset-user-mfa.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((item) => item.email?.toLowerCase() === targetEmail.toLowerCase());
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function main() {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error(`No auth user found for ${email}`);
  }

  const { data: factorsData, error: listError } = await admin.auth.admin.mfa.listFactors({
    userId: user.id,
  });
  if (listError) throw listError;

  const factors = factorsData?.factors ?? [];
  if (factors.length === 0) {
    console.log(`No MFA factors on ${email} — user can enroll fresh at /auth/mfa/enroll after sign-in.`);
    return;
  }

  for (const factor of factors) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: user.id,
    });
    if (error) throw error;
    console.log(`Removed ${factor.factor_type} factor ${factor.id} (${factor.status})`);
  }

  console.log(`\nMFA reset complete for ${email}.`);
  console.log("Next login: password → /auth/mfa/enroll → scan new QR code in authenticator app.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
