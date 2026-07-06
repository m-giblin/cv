#!/usr/bin/env node
/**
 * Encrypts the current env AI key and stores it in platform_settings.
 * Requires PLATFORM_SECRETS_ENCRYPTION_KEY, SUPABASE_SERVICE_ROLE_KEY, and XAI_API_KEY or OPENAI_API_KEY.
 *
 * Usage: npx tsx scripts/seal-platform-ai-key.ts
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { sealApiKey } from "../lib/crypto/api-key-storage";

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
const encryptionKey = process.env.PLATFORM_SECRETS_ENCRYPTION_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!encryptionKey) {
  console.error("Missing PLATFORM_SECRETS_ENCRYPTION_KEY.");
  process.exit(1);
}

const provider = (process.env.AI_PROVIDER ?? "xai").toLowerCase() === "openai" ? "openai" : "xai";
const apiKey =
  provider === "openai"
    ? process.env.OPENAI_API_KEY?.trim()
    : process.env.XAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
const model =
  provider === "openai"
    ? process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
    : process.env.XAI_MODEL ?? "grok-3-mini";

if (!apiKey) {
  console.error(`No API key found for provider "${provider}".`);
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  if (!apiKey) {
    console.error(`No API key found for provider "${provider}".`);
    process.exit(1);
  }

  const { error } = await supabase.from("platform_settings").upsert({
    id: "default",
    provider,
    model,
    api_key_ciphertext: sealApiKey(apiKey),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to seal platform AI key:", error.message);
    process.exit(1);
  }

  console.log(`Sealed ${provider} / ${model} API key into platform_settings (encrypted).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
