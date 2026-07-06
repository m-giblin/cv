#!/usr/bin/env node
/**
 * Seeds John Barrett's team: 2 new basic SEs with onboarding plans,
 * promotes 3 existing SEs to Senior/Advisory with advanced plan assignments.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage: node scripts/seed-john-barrett-roster.mjs
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

const JOHN_EMAIL = "john.barrett@sailpoint.com";
const SE_PASSWORD = "DemoSE2026!";

const NEW_BASIC_SES = [
  { email: "morgan.lee@example.com", fullName: "Morgan Lee" },
  { email: "quinn.martin@example.com", fullName: "Quinn Martin" },
];

const PROMOTED_SES = [
  {
    email: "avery.brooks@example.com",
    fullName: "Avery Brooks",
    role: "senior_se",
    level: "Senior",
    planNames: [
      "Week 5–6 — Third step",
      "Week 7–8 — Fourth step",
      "60-day ramp check-in",
      "90-day SE readiness",
    ],
  },
  {
    email: "blake.chen@example.com",
    fullName: "Blake Chen",
    role: "senior_se",
    level: "Senior",
    planNames: [
      "Week 5–6 — Third step",
      "Week 7–8 — Fourth step",
      "60-day ramp check-in",
      "90-day SE readiness",
    ],
  },
  {
    email: "caleb.diaz@example.com",
    fullName: "Caleb Diaz",
    role: "advisory_solutions_consultant",
    level: "Advisory",
    planNames: [
      "Week 7–8 — Fourth step",
      "60-day ramp check-in",
      "90-day SE readiness",
      "Week 4 — first customer motions",
    ],
  },
];

const NEW_HIRE_PLANS = [
  "Week 1–2 — Boots on the ground",
  "Week 2–3 — First steps",
  "Week 2 — building depth",
];

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

async function upsertSe({ email, fullName, role, level }, managerId) {
  const existing = await findUserByEmail(email);
  let userId = existing?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: SE_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw new Error(`${email}: ${error.message}`);
    userId = data.user.id;
    console.log(`Created auth user ${email}`);
  } else {
    console.log(`Auth user exists ${email}`);
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role, level, manager_id")
    .eq("id", userId)
    .maybeSingle();

  const payload = {
    id: userId,
    email,
    full_name: fullName,
    role,
    level,
    manager_id: managerId,
  };

  if (!existingProfile) {
    const { error } = await admin.from("profiles").insert(payload);
    if (error) throw new Error(`Profile ${email}: ${error.message}`);
    return userId;
  }

  const needsReplace =
    existingProfile.role !== role ||
    existingProfile.level !== level ||
    (managerId ?? null) !== (existingProfile.manager_id ?? null);

  if (needsReplace) {
    const { error: deleteError } = await admin.from("profiles").delete().eq("id", userId);
    if (deleteError) throw new Error(`Profile ${email}: ${deleteError.message}`);

    const { error: insertError } = await admin.from("profiles").insert(payload);
    if (insertError) throw new Error(`Profile ${email}: ${insertError.message}`);

    console.log(`  Profile ${email} → ${role} / ${level}`);
    return userId;
  }

  const { error } = await admin.from("profiles").update({ full_name: fullName }).eq("id", userId);
  if (error) throw new Error(`Profile ${email}: ${error.message}`);

  return userId;
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

async function hasAssignment(userId, planId) {
  const { data, error } = await admin
    .from("plan_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function assignPlan({ planId, userId, assignedBy, mentorId, startDate, targetCompletion }) {
  if (await hasAssignment(userId, planId)) {
    return null;
  }

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
      status: "not_started",
      progress_percent: 0,
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
  const assignmentSteps = (steps ?? []).map((step) => {
    const metadata =
      step.metadata && typeof step.metadata === "object" && !Array.isArray(step.metadata)
        ? step.metadata
        : {};
    const offsetDays =
      typeof metadata.dueOffsetDays === "number" ? metadata.dueOffsetDays : step.sort_order * 7;
    const due = new Date(start);
    due.setDate(due.getDate() + offsetDays);

    return {
      assignment_id: assignment.id,
      plan_step_id: step.id,
      status: "not_started",
      due_date: due.toISOString().slice(0, 10),
    };
  });

  if (assignmentSteps.length > 0) {
    const { error: insertStepsError } = await admin.from("plan_assignment_steps").insert(assignmentSteps);
    if (insertStepsError) throw new Error(insertStepsError.message);
  }

  return assignment.id;
}

function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const { data: john, error: johnError } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("email", JOHN_EMAIL)
    .maybeSingle();

  if (johnError) throw new Error(johnError.message);
  if (!john) {
    throw new Error(`Manager ${JOHN_EMAIL} not found — sign in once or create via Admin first.`);
  }

  console.log(`Manager: ${john.full_name} (${john.email}) — role: ${john.role}\n`);

  const allPlanNames = [...new Set([...NEW_HIRE_PLANS, ...PROMOTED_SES.flatMap((se) => se.planNames)])];
  const planIds = await resolvePlanIdsByName(allPlanNames);

  for (const se of NEW_BASIC_SES) {
    const userId = await upsertSe(
      { email: se.email, fullName: se.fullName, role: "basic_se", level: "Basic" },
      john.id,
    );

    for (const planName of NEW_HIRE_PLANS) {
      const assignmentId = await assignPlan({
        planId: planIds.get(planName),
        userId,
        assignedBy: john.id,
        mentorId: john.id,
        startDate: isoDate(),
        targetCompletion: isoDate(90),
      });
      if (assignmentId) {
        console.log(`  Assigned "${planName}" → ${se.email}`);
      }
    }
  }

  for (const se of PROMOTED_SES) {
    const userId = await upsertSe(
      { email: se.email, fullName: se.fullName, role: se.role, level: se.level },
      john.id,
    );

    for (const planName of se.planNames) {
      const assignmentId = await assignPlan({
        planId: planIds.get(planName),
        userId,
        assignedBy: john.id,
        mentorId: john.id,
        startDate: isoDate(-30),
        targetCompletion: isoDate(60),
      });
      if (assignmentId) {
        console.log(`  Assigned "${planName}" → ${se.email}`);
      }
    }
  }

  console.log("\nJohn Barrett roster seed complete.");
  console.log(`  New basic SEs: ${NEW_BASIC_SES.map((s) => s.email).join(", ")}`);
  console.log(`  Promoted: Avery & Blake (Senior SE), Caleb (Advisory SC)`);
  console.log(`  Password for @example.com SEs: ${SE_PASSWORD}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
