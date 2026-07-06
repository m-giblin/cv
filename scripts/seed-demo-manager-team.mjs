#!/usr/bin/env node
/**
 * Moves 3 of Matt Giblin's demo SEs onto demo.manager@example.com
 * with mixed seniority: new hire, senior, and advisory.
 *
 * Prerequisite: npm run seed:demo
 * Usage: node scripts/seed-demo-manager-team.mjs
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

const DEMO_MANAGER_EMAIL = "demo.manager@example.com";

/** Three SEs transferred from Matt Giblin's @example.com roster. */
const TRANSFERRED_SES = [
  {
    email: "finn.grant@example.com",
    fullName: "Finn Grant",
    role: "basic_se",
    level: "Basic",
    label: "new hire",
    planNames: [
      "Week 1–2 — Boots on the ground",
      "Week 2–3 — First steps",
      "Week 2 — building depth",
    ],
    planStartOffsetDays: 0,
    planTargetOffsetDays: 90,
    planStatus: "in_progress",
    planProgress: 18,
  },
  {
    email: "gray.hayes@example.com",
    fullName: "Gray Hayes",
    role: "senior_se",
    level: "Senior",
    label: "senior SE",
    planNames: [
      "Week 5–6 — Third step",
      "Week 7–8 — Fourth step",
      "60-day ramp check-in",
      "90-day SE readiness",
    ],
    planStartOffsetDays: -45,
    planTargetOffsetDays: 45,
    planStatus: "in_progress",
    planProgress: 62,
  },
  {
    email: "harper.ivan@example.com",
    fullName: "Harper Ivan",
    role: "advisory_solutions_consultant",
    level: "Advisory",
    label: "advisory SC",
    planNames: [
      "Week 7–8 — Fourth step",
      "60-day ramp check-in",
      "90-day SE readiness",
      "Week 4 — first customer motions",
    ],
    planStartOffsetDays: -60,
    planTargetOffsetDays: 30,
    planStatus: "in_progress",
    planProgress: 78,
  },
];

function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function findProfile(email) {
  const { data, error } = await admin.from("profiles").select("*").eq("email", email).maybeSingle();
  if (error) throw new Error(`${email}: ${error.message}`);
  return data;
}

async function resolvePlanIdsByName(names) {
  const { data, error } = await admin
    .from("onboarding_plans")
    .select("id, name")
    .eq("is_template", true)
    .in("name", names);

  if (error) throw new Error(error.message);

  const byName = new Map((data ?? []).map((row) => [row.name, row.id]));
  const missing = names.filter((name) => !byName.has(name));
  if (missing.length > 0) {
    throw new Error(`Missing plan templates: ${missing.join(", ")}`);
  }

  return byName;
}

async function resolveProgramIdForPlan(planId) {
  const { data } = await admin
    .from("enablement_program_segments")
    .select("program_id")
    .eq("plan_id", planId)
    .maybeSingle();
  return data?.program_id ?? null;
}

async function assignPlan({
  planId,
  userId,
  assignedBy,
  mentorId,
  startDate,
  targetCompletion,
  status,
  progressPercent,
}) {
  const { data: existing } = await admin
    .from("plan_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .maybeSingle();

  if (existing) return null;

  const programId = await resolveProgramIdForPlan(planId);

  const { data: assignment, error: assignmentError } = await admin
    .from("plan_assignments")
    .insert({
      plan_id: planId,
      user_id: userId,
      mentor_id: mentorId,
      assigned_by: assignedBy,
      start_date: startDate,
      target_completion: targetCompletion,
      status,
      progress_percent: progressPercent,
      program_id: programId,
    })
    .select("id")
    .single();

  if (assignmentError) throw new Error(assignmentError.message);

  const { data: steps, error: stepsError } = await admin
    .from("plan_steps")
    .select("*")
    .eq("plan_id", planId)
    .order("sort_order");

  if (stepsError) throw new Error(stepsError.message);

  const start = new Date(startDate);
  const assignmentSteps = (steps ?? []).map((step, index) => {
    const metadata =
      step.metadata && typeof step.metadata === "object" && !Array.isArray(step.metadata) ? step.metadata : {};
    const offsetDays =
      typeof metadata.dueOffsetDays === "number" ? metadata.dueOffsetDays : (index + 1) * 7;
    const due = new Date(start);
    due.setDate(due.getDate() + offsetDays);

    let stepStatus = "not_started";
    if (status === "in_progress" && index === 0) stepStatus = "completed";
    if (status === "in_progress" && index === 1) stepStatus = "in_progress";

    return {
      assignment_id: assignment.id,
      plan_step_id: step.id,
      status: stepStatus,
      due_date: due.toISOString().slice(0, 10),
    };
  });

  if (assignmentSteps.length > 0) {
    const { error: insertStepsError } = await admin.from("plan_assignment_steps").insert(assignmentSteps);
    if (insertStepsError) throw new Error(insertStepsError.message);
  }

  return assignment.id;
}

async function reassignSe(seConfig, managerId) {
  const profile = await findProfile(seConfig.email);
  if (!profile) {
    throw new Error(`${seConfig.email} not found — run npm run seed:demo first`);
  }

  const profilePayload = {
    id: profile.id,
    email: seConfig.email,
    full_name: seConfig.fullName,
    role: seConfig.role,
    level: seConfig.level,
    manager_id: managerId,
  };

  const needsReplace =
    profile.role !== seConfig.role ||
    profile.level !== seConfig.level ||
    (profile.manager_id ?? null) !== managerId;

  if (needsReplace) {
    const { error: deleteError } = await admin.from("profiles").delete().eq("id", profile.id);
    if (deleteError) throw new Error(`${seConfig.email}: ${deleteError.message}`);

    const { error: insertError } = await admin.from("profiles").insert(profilePayload);
    if (insertError) throw new Error(`${seConfig.email}: ${insertError.message}`);
  } else {
    const { error } = await admin
      .from("profiles")
      .update({ full_name: seConfig.fullName })
      .eq("id", profile.id);
    if (error) throw new Error(`${seConfig.email}: ${error.message}`);
  }

  const planIds = await resolvePlanIdsByName(seConfig.planNames);
  let assignedPlans = 0;

  for (const planName of seConfig.planNames) {
    const assignmentId = await assignPlan({
      planId: planIds.get(planName),
      userId: profile.id,
      assignedBy: managerId,
      mentorId: managerId,
      startDate: isoDate(seConfig.planStartOffsetDays),
      targetCompletion: isoDate(seConfig.planTargetOffsetDays),
      status: seConfig.planStatus,
      progressPercent: seConfig.planProgress,
    });
    if (assignmentId) assignedPlans += 1;
  }

  console.log(
    `  ${seConfig.fullName} (${seConfig.email}) → ${seConfig.label} · ${assignedPlans} new plan(s)`,
  );
}

async function main() {
  const manager = await findProfile(DEMO_MANAGER_EMAIL);
  if (!manager) {
    throw new Error(`${DEMO_MANAGER_EMAIL} not found — run npm run seed:demo first`);
  }

  console.log(`Assigning Matt Giblin SEs to ${manager.full_name} (${manager.email})\n`);

  for (const se of TRANSFERRED_SES) {
    await reassignSe(se, manager.id);
  }

  const { data: reports } = await admin
    .from("profiles")
    .select("email, full_name, role, level")
    .eq("manager_id", manager.id)
    .order("full_name");

  console.log(`\nDemo manager now has ${reports?.length ?? 0} direct reports:`);
  for (const report of reports ?? []) {
    console.log(`  · ${report.full_name} (${report.email}) — ${report.role} / ${report.level}`);
  }

  console.log(`\nManager login: ${DEMO_MANAGER_EMAIL} / DemoMgr2026!`);
  console.log("SE password for all @example.com accounts: DemoSE2026!");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
