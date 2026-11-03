#!/usr/bin/env node
/**
 * Clones a tenant's configuration (settings, plans, playbooks, practice, content) into a new tenant,
 * so it can be tested without touching the source. Nobody's progress, assignments or activity is copied.
 *
 * Every copied row gets a new id. References between copied rows (columns and ids inside JSON) are
 * re-pointed to the copies; references to people are cleared, since the source tenant's users stay put.
 * It mirrors createTenant in lib/tenant/tenants.ts: tenant row as "provisioning", settings, then "active".
 *
 * Dry run by default: prints what would be copied and writes nothing. Add --apply to write.
 * If a write fails part-way, everything this run inserted is removed again.
 *
 * Usage:
 *   node scripts/clone-tenant.mjs --source sailpoint --name "SailPoint Demo Tenant" --slug sailpoint-demo \
 *     --product-name "SE Enablement Demo" \
 *     --account admin:matt.giblin+demo.admin@sailpoint.com:"Demo Admin" \
 *     --account manager:matt.giblin+demo.manager@sailpoint.com:"Demo Manager" \
 *     --account basic_se:matt.giblin+demo.se@sailpoint.com:"Demo SE" [--apply]
 *
 * Test accounts get a generated password (written to .env.demo-tenant.local, which git ignores) and an
 * mfa_exemptions row. SEs report to the first manager account.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "crypto";
import { appendFileSync, existsSync, readFileSync } from "fs";
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
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1);
  }
}

function parseArgs(argv) {
  const args = { accounts: [], apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => argv[++i];
    if (flag === "--apply") args.apply = true;
    else if (flag === "--source") args.source = next();
    else if (flag === "--name") args.name = next();
    else if (flag === "--slug") args.slug = next();
    else if (flag === "--product-name") args.productName = next();
    else if (flag === "--product-tagline") args.productTagline = next();
    else if (flag === "--account") {
      const [role, email, ...rest] = next().split(":");
      args.accounts.push({ role, email: email.trim().toLowerCase(), fullName: rest.join(":").trim() || email });
    } else throw new Error(`Unknown argument ${flag}`);
  }
  if (!args.source || !args.name || !args.slug) {
    throw new Error("--source, --name and --slug are required");
  }
  return args;
}

loadEnv();
const args = parseArgs(process.argv.slice(2));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

/**
 * Configuration tables, in insert order (parents first). Anything not listed is per-person data
 * (progress, assignments, submissions, activity, audit) and is never copied.
 * selfRefs are filled in after every row of the table exists.
 */
const CONFIG_TABLES = [
  { table: "competencies" },
  { table: "challenges" },
  { table: "challenge_competencies", key: ["challenge_id", "competency_id"] },
  { table: "content_assets", selfRefs: ["superseded_by"] },
  { table: "playbook_guides" },
  { table: "capability_playbooks" },
  { table: "question_bank", selfRefs: ["replaces_id"] },
  { table: "pitch_scenario_templates" },
  { table: "simulation_templates" },
  { table: "onboarding_plans" },
  { table: "plan_steps" },
  { table: "plan_step_prerequisites" },
  { table: "enablement_programs" },
  { table: "enablement_program_segments" },
  { table: "isc_lab_knowledge_chunks" },
  { table: "market_pulse_weeks", key: ["tenant_id", "week_id"] },
  { table: "plan_holidays" },
  { table: "corpus_routing_rules" },
];

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Column → referenced table, read from the Data API's OpenAPI description. */
async function loadForeignKeys() {
  const response = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: "application/openapi+json" },
  });
  const spec = await response.json();
  const fks = {};
  for (const [table, def] of Object.entries(spec.definitions ?? {})) {
    fks[table] = {};
    for (const [column, prop] of Object.entries(def.properties ?? {})) {
      const match = /<fk table='([a-z_]+)' column='([a-z_]+)'\/>/.exec(prop.description ?? "");
      if (match) fks[table][column] = match[1];
    }
  }
  return fks;
}

async function fetchAll(table, tenantId) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from(table)
      .select("*")
      .eq("tenant_id", tenantId)
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

async function resolveSource(source) {
  const column = UUID_RE.test(source) ? "id" : "slug";
  UUID_RE.lastIndex = 0;
  const { data, error } = await admin.from("tenants").select("*").eq(column, source).maybeSingle();
  if (error || !data) throw new Error(`Source tenant ${source} not found`);
  return data;
}

async function main() {
  const source = await resolveSource(args.source);
  const { data: clash } = await admin.from("tenants").select("id").eq("slug", args.slug).maybeSingle();
  if (clash) throw new Error(`A tenant with slug ${args.slug} already exists (${clash.id})`);

  const fks = await loadForeignKeys();
  const hasProductColumns = "product_name" in source;
  const newTenantId = randomUUID();

  // 1. Read everything first and give every copied row a new id.
  const idMap = new Map([[source.id, newTenantId]]);
  const sourceRows = {};
  for (const spec of CONFIG_TABLES) {
    sourceRows[spec.table] = await fetchAll(spec.table, source.id);
    if (!spec.key) for (const row of sourceRows[spec.table]) idMap.set(row.id, randomUUID());
  }
  const { data: settings } = await admin.from("platform_settings").select("*").eq("tenant_id", source.id).maybeSingle();

  const { data: profiles } = await admin.from("profiles").select("id");
  const profileIds = new Set((profiles ?? []).map((row) => row.id));
  const report = { clearedPeople: 0, clearedOther: {}, remappedInJson: 0, peopleInJson: 0, unknownInJson: new Set() };

  // Re-point ids inside JSON and text to the copies; ids of people or unknown rows are left as they are.
  function remapDeep(value) {
    if (typeof value === "string") {
      return value.replace(UUID_RE, (id) => {
        const mapped = idMap.get(id.toLowerCase());
        if (mapped) {
          report.remappedInJson += 1;
          return mapped;
        }
        if (profileIds.has(id.toLowerCase())) report.peopleInJson += 1;
        else report.unknownInJson.add(id.toLowerCase());
        return id;
      });
    }
    if (Array.isArray(value)) return value.map(remapDeep);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, remapDeep(inner)]));
    }
    return value;
  }

  function transform(table, row) {
    const out = {};
    for (const [column, value] of Object.entries(row)) {
      const target = fks[table]?.[column];
      if (column === "tenant_id") out[column] = newTenantId;
      else if (column === "id" && idMap.has(value)) out[column] = idMap.get(value);
      else if (target === "profiles") {
        if (value) report.clearedPeople += 1;
        out[column] = null;
      } else if (target && value) {
        if (idMap.has(value)) out[column] = idMap.get(value);
        else if (target === "tenants") out[column] = value;
        else {
          // Points at a row that is not copied (another tenant's or shared). Shared rows have no tenant.
          out[column] = value;
          report.clearedOther[`${table}.${column}`] = (report.clearedOther[`${table}.${column}`] ?? 0) + 1;
        }
      } else out[column] = remapDeep(value);
    }
    return out;
  }

  const planned = CONFIG_TABLES.map((spec) => ({
    ...spec,
    rows: sourceRows[spec.table].map((row) => transform(spec.table, row)),
  }));

  const tenantRow = {
    id: newTenantId,
    slug: args.slug,
    name: args.name,
    status: "provisioning",
    branding_primary_color: source.branding_primary_color,
    branding_logo_url: source.branding_logo_url,
    welcome_message: source.welcome_message,
    allowed_email_domains: source.allowed_email_domains,
    billing_status: source.billing_status,
    billing_plan: source.billing_plan,
    operator_notes: `Clone of ${source.name} (${source.slug}) made ${new Date().toISOString().slice(0, 10)} for testing.`,
    ...(hasProductColumns
      ? { product_name: args.productName ?? null, product_tagline: args.productTagline ?? null }
      : {}),
  };
  const settingsRow = settings
    ? { ...transform("platform_settings", settings), id: randomUUID(), updated_at: new Date().toISOString() }
    : null;

  console.log(`\nSource: ${source.name} (${source.slug}, ${source.id})`);
  console.log(`New tenant: ${args.name} (${args.slug}, ${newTenantId})`);
  if (args.productName) {
    console.log(
      hasProductColumns
        ? `App name: ${args.productName}`
        : "App name: not set — run migration 20261031120000_tenant_product_branding.sql first, then set it in Admin → Settings → General.",
    );
  }
  console.log(`Platform settings: ${settingsRow ? "copied (feature flags, AI provider and key, retention, session timeout)" : "none in source"}`);
  console.log("\nRows to copy:");
  let total = 0;
  for (const spec of planned) {
    total += spec.rows.length;
    console.log(`  ${spec.table.padEnd(30)} ${String(spec.rows.length).padStart(5)}`);
  }
  console.log(`  ${"total".padEnd(30)} ${String(total).padStart(5)}`);
  console.log(`\nPeople references cleared (created_by, updated_by, reviewed_by…): ${report.clearedPeople}`);
  console.log(`Ids inside JSON re-pointed to copies: ${report.remappedInJson}`);
  if (report.peopleInJson) console.log(`Person ids left inside JSON: ${report.peopleInJson}`);
  if (Object.keys(report.clearedOther).length) {
    console.log("References kept to rows outside the copy (shared library rows):", report.clearedOther);
  }
  if (report.unknownInJson.size) console.log(`Other ids inside JSON left unchanged: ${report.unknownInJson.size}`);
  console.log("\nNot copied: profiles, progress, assignments, submissions, sessions, notifications, activity and audit logs.");
  if (args.accounts.length) {
    console.log("\nTest accounts (password generated, MFA exempt):");
    for (const account of args.accounts) console.log(`  ${account.role.padEnd(10)} ${account.email} (${account.fullName})`);
  }

  if (!args.apply) {
    console.log("\nDry run: nothing written. Re-run with --apply to create the tenant.");
    return;
  }

  // 2. Write. Track every insert so a failure can be undone.
  const inserted = [];
  const createdUsers = [];
  async function insertRows(table, rows, key) {
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await admin.from(table).insert(chunk);
      if (error) throw new Error(`${table}: ${error.message}`);
      inserted.push({ table, key, rows: chunk });
    }
  }

  try {
    const { error: tenantError } = await admin.from("tenants").insert(tenantRow);
    if (tenantError) throw new Error(`tenants: ${tenantError.message}`);
    if (settingsRow) await insertRows("platform_settings", [settingsRow]);

    for (const spec of planned) {
      const rows = spec.selfRefs
        ? spec.rows.map((row) => ({ ...row, ...Object.fromEntries(spec.selfRefs.map((column) => [column, null])) }))
        : spec.rows;
      await insertRows(spec.table, rows, spec.key);
      for (const column of spec.selfRefs ?? []) {
        for (const row of spec.rows.filter((item) => item[column])) {
          const { error } = await admin.from(spec.table).update({ [column]: row[column] }).eq("id", row.id);
          if (error) throw new Error(`${spec.table}.${column}: ${error.message}`);
        }
      }
      console.log(`  copied ${spec.table} (${spec.rows.length})`);
    }

    const credentials = [];
    let managerId = null;
    for (const account of args.accounts) {
      const password = `${randomBytes(9).toString("base64url")}Aa1!`;
      const { data, error } = await admin.auth.admin.createUser({
        email: account.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      });
      if (error) throw new Error(`${account.email}: ${error.message}`);
      const userId = data.user.id;
      createdUsers.push(userId);
      const isSe = account.role.endsWith("_se") || account.role === "advisory_solutions_consultant";
      const { error: profileError } = await admin
        .from("profiles")
        .update({
          full_name: account.fullName,
          role: account.role,
          level: account.role === "basic_se" ? "Basic" : "Senior",
          tenant_id: newTenantId,
          manager_id: isSe ? managerId : null,
        })
        .eq("id", userId);
      if (profileError) throw new Error(`${account.email} profile: ${profileError.message}`);
      if (account.role === "manager" && !managerId) managerId = userId;

      const { error: exemptError } = await admin
        .from("mfa_exemptions")
        .insert({ user_id: userId, reason: `Test account: ${args.name}` });
      if (exemptError) throw new Error(`${account.email} MFA exemption: ${exemptError.message}`);

      if (account.role === "admin") {
        await admin.from("tenant_admin_invites").insert({
          tenant_id: newTenantId,
          email: account.email,
          full_name: account.fullName,
          status: "accepted",
          accepted_at: new Date().toISOString(),
        });
      }
      credentials.push(`# ${account.role} ${account.fullName}\n${account.email}=${password}`);
      console.log(`  created ${account.role} ${account.email}`);
    }

    await admin.from("tenants").update({ status: "active" }).eq("id", newTenantId);
    await admin.from("audit_logs").insert({
      tenant_id: newTenantId,
      action: "tenant.cloned",
      target_type: "tenant",
      target_id: newTenantId,
      details: { sourceTenantId: source.id, slug: args.slug, name: args.name, rows: total },
    });

    if (credentials.length) {
      const file = resolve(process.cwd(), ".env.demo-tenant.local");
      appendFileSync(file, `\n# ${args.name} (${newTenantId}) test accounts, ${new Date().toISOString()}\n${credentials.join("\n")}\n`);
      console.log(`\nTest account passwords written to ${file}`);
    }
    console.log(`\nDone: ${args.name} is active (${newTenantId}).`);
  } catch (error) {
    console.error(`\nFailed: ${error instanceof Error ? error.message : error}\nUndoing this run's inserts…`);
    for (const userId of createdUsers) await admin.auth.admin.deleteUser(userId);
    // Clear links between copied rows first so the deletes below can go in any order.
    for (const spec of CONFIG_TABLES) {
      for (const column of spec.selfRefs ?? []) {
        await admin.from(spec.table).update({ [column]: null }).eq("tenant_id", newTenantId);
      }
    }
    for (const batch of inserted.reverse()) {
      if (batch.key) {
        for (const row of batch.rows) {
          let query = admin.from(batch.table).delete();
          for (const column of batch.key) query = query.eq(column, row[column]);
          await query;
        }
      } else {
        await admin.from(batch.table).delete().in("id", batch.rows.map((row) => row.id));
      }
    }
    await admin.from("audit_logs").delete().eq("tenant_id", newTenantId);
    await admin.from("tenant_admin_invites").delete().eq("tenant_id", newTenantId);
    const { error: tenantDelete } = await admin.from("tenants").delete().eq("id", newTenantId);
    console.error(tenantDelete ? `Could not remove tenant row: ${tenantDelete.message}` : "Undone; nothing left behind.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
