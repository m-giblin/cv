#!/usr/bin/env node
/**
 * Seeds demo.se@example.com with ramp plan, 2026 development plan,
 * 2 challenge assignments, 2 simulations, and a Pitch Studio assignment.
 *
 * Prerequisite: npm run seed:demo (auth user + profile exist)
 * Usage: node scripts/seed-demo-se-workspace.mjs
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

const DEMO_SE_EMAIL = "demo.se@example.com";
const DEMO_MANAGER_EMAIL = "demo.manager@example.com";

const RAMP_PLAN_NAME = "Week 1–2 — Boots on the ground";

const CHALLENGE_IDS = [
  "a1000001-0001-4000-8000-000000000001",
  "a1000001-0001-4000-8000-000000000002",
];

const PITCH_ASSIGNMENT = {
  title: "AIS / Agentic positioning",
  description:
    "Record a 60–90 second pitch on agent identity lifecycle — discover, govern, protect. Submit for manager review in Pitch Studio.",
  scenarioId: "ais",
};

function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function buildQuarterlyReviews(goalId, year) {
  const quarters = [
    { quarter: "Q1", due: `${year}-03-31` },
    { quarter: "Q2", due: `${year}-06-30` },
    { quarter: "Q3", due: `${year}-09-30` },
    { quarter: "Q4", due: `${year}-12-31` },
  ];
  return quarters.map((q) => ({
    goal_id: goalId,
    quarter: q.quarter,
    year,
    due_date: q.due,
    status: "not_started",
  }));
}

async function findProfile(email) {
  const { data, error } = await admin.from("profiles").select("id, email, full_name, manager_id").eq("email", email).maybeSingle();
  if (error) throw new Error(`${email}: ${error.message}`);
  return data;
}

async function resolvePlanIdByName(name) {
  const { data, error } = await admin
    .from("onboarding_plans")
    .select("id, name")
    .eq("is_template", true)
    .eq("name", name)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Missing ramp plan template: ${name}`);
  return data.id;
}

async function resolveProgramIdForPlan(planId) {
  const { data } = await admin
    .from("enablement_program_segments")
    .select("program_id")
    .eq("plan_id", planId)
    .maybeSingle();
  return data?.program_id ?? null;
}

async function hasPlanAssignment(userId, planId) {
  const { data, error } = await admin
    .from("plan_assignments")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function assignRampPlan({ planId, userId, assignedBy, mentorId }) {
  const existing = await hasPlanAssignment(userId, planId);
  if (existing) {
    console.log(`  Ramp plan already assigned (${existing})`);
    return existing;
  }

  const programId = await resolveProgramIdForPlan(planId);
  const startDate = isoDate(-7);
  const targetCompletion = isoDate(83);

  const { data: assignment, error: assignmentError } = await admin
    .from("plan_assignments")
    .insert({
      plan_id: planId,
      user_id: userId,
      mentor_id: mentorId,
      assigned_by: assignedBy,
      start_date: startDate,
      target_completion: targetCompletion,
      status: "in_progress",
      progress_percent: 12,
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
      typeof metadata.dueOffsetDays === "number" ? metadata.dueOffsetDays : (index + 1) * 2;
    const due = new Date(start);
    due.setDate(due.getDate() + offsetDays);

    const status = index === 0 ? "completed" : index === 1 ? "in_progress" : "not_started";

    return {
      assignment_id: assignment.id,
      plan_step_id: step.id,
      status,
      due_date: due.toISOString().slice(0, 10),
    };
  });

  if (assignmentSteps.length > 0) {
    const { error: insertStepsError } = await admin.from("plan_assignment_steps").insert(assignmentSteps);
    if (insertStepsError) throw new Error(insertStepsError.message);
  }

  await admin.from("notifications").insert({
    user_id: userId,
    title: "Ramp plan assigned",
    body: `${RAMP_PLAN_NAME} — open My Ramp Plan to see your first steps.`,
    action_url: "/my-plan",
  });

  console.log(`  Assigned ramp plan "${RAMP_PLAN_NAME}"`);
  return assignment.id;
}

async function seedDevelopmentPlan({ userId, managerId, createdBy }) {
  const year = 2026;

  const { data: existing } = await admin
    .from("development_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("year", year)
    .maybeSingle();

  if (existing) {
    console.log(`  Development plan ${year} already exists (${existing.id})`);
    return existing.id;
  }

  const { data: competencies } = await admin.from("competencies").select("id, name").limit(3);
  const compByName = new Map((competencies ?? []).map((c) => [c.name, c.id]));

  const goals = [
    {
      title: "Lead 3 customer discovery calls with SLED buyers",
      description: "Shadow two, lead one with manager debrief on qualification and next steps.",
      competencyId: compByName.get("SLED Vertical Knowledge") ?? competencies?.[0]?.id ?? null,
      evidenceType: "shadow_notes",
    },
    {
      title: "Deliver AIS positioning pitch in Pitch Studio",
      description: "Record and submit manager-reviewed pitch on agent identity lifecycle.",
      competencyId: compByName.get("Executive Demo Storytelling") ?? competencies?.[1]?.id ?? null,
      evidenceType: "demo_recording",
    },
  ];

  const { data: plan, error: planError } = await admin
    .from("development_plans")
    .insert({
      user_id: userId,
      manager_id: managerId,
      year,
      status: "active",
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (planError) throw new Error(planError.message);

  for (const [index, goal] of goals.entries()) {
    const { data: createdGoal, error: goalError } = await admin
      .from("development_goals")
      .insert({
        plan_id: plan.id,
        competency_id: goal.competencyId,
        title: goal.title,
        description: goal.description,
        evidence_type: goal.evidenceType,
        sort_order: index + 1,
        overall_status: "not_started",
      })
      .select("id")
      .single();

    if (goalError) throw new Error(goalError.message);

    const { error: reviewError } = await admin
      .from("goal_quarterly_reviews")
      .insert(buildQuarterlyReviews(createdGoal.id, year));

    if (reviewError) throw new Error(reviewError.message);
  }

  await admin.from("notifications").insert({
    user_id: userId,
    title: `${year} development plan created`,
    body: "Your manager set annual goals. Open Development to review quarterly checkpoints.",
    action_url: "/development",
  });

  console.log(`  Created ${year} development plan with ${goals.length} goals`);
  return plan.id;
}

async function assignChallenge({ userId, challengeId, title }) {
  const { data: existing } = await admin
    .from("challenge_submissions")
    .select("id")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .maybeSingle();

  if (existing) {
    console.log(`  Challenge already assigned: ${title}`);
    return existing.id;
  }

  const { data, error } = await admin
    .from("challenge_submissions")
    .insert({
      user_id: userId,
      challenge_id: challengeId,
      status: "in_progress",
      reflection_text: "",
      evidence_files: [],
    })
    .select("id")
    .single();

  if (error) throw new Error(`Challenge ${title}: ${error.message}`);

  console.log(`  Assigned challenge: ${title}`);
  return data.id;
}

async function assignSimulation({ userId, assignedBy, template, index }) {
  const { data: existing } = await admin
    .from("simulation_assignments")
    .select("id")
    .eq("assigned_to", userId)
    .eq("template_id", template.id)
    .maybeSingle();

  if (existing) {
    console.log(`  Simulation already assigned: ${template.name}`);
    return existing.id;
  }

  const sessionData = {
    promptSnapshot: template.prompt_body,
    aiRoleplay: true,
    simulationKind: "ai_roleplay",
    startMessage: `Welcome to ${template.name}. When you're ready, introduce yourself and begin discovery.`,
    practiceRoundsRequired: template.practice_rounds_before_submit ?? 1,
    practiceRoundsCompleted: 0,
  };

  const { data, error } = await admin
    .from("simulation_assignments")
    .insert({
      template_id: template.id,
      assigned_to: userId,
      assigned_by: assignedBy,
      persona: template.persona,
      vertical: template.vertical,
      solution_focus: template.solution_focus,
      difficulty: template.difficulty,
      status: index === 0 ? "in_progress" : "not_started",
      transcript: [],
      session_data: sessionData,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Simulation ${template.name}: ${error.message}`);

  console.log(`  Assigned simulation: ${template.name}`);
  return data.id;
}

async function assignPitch({ userId, assignedBy }) {
  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .ilike("title", "Pitch assigned:%")
    .maybeSingle();

  if (existing) {
    console.log(`  Pitch assignment notification already exists`);
    return;
  }

  await admin.from("notifications").insert({
    user_id: userId,
    title: `Pitch assigned: ${PITCH_ASSIGNMENT.title}`,
    body: PITCH_ASSIGNMENT.description,
    action_url: `/pitch?scenario=${PITCH_ASSIGNMENT.scenarioId}`,
  });

  await admin.from("activity_logs").insert({
    user_id: userId,
    actor_id: assignedBy,
    event_type: "pitch_assigned",
    title: `Pitch assigned — ${PITCH_ASSIGNMENT.title}`,
    metadata: {
      scenarioId: PITCH_ASSIGNMENT.scenarioId,
      assignedBy,
    },
  });

  console.log(`  Assigned pitch: ${PITCH_ASSIGNMENT.title}`);
}

async function ensureReportsToManager({ seId, managerId }) {
  const { data: se } = await admin.from("profiles").select("manager_id").eq("id", seId).maybeSingle();
  if (se?.manager_id === managerId) {
    console.log(`  Demo SE already reports to demo manager`);
    return;
  }

  const { error } = await admin.from("profiles").update({ manager_id: managerId }).eq("id", seId);
  if (error) throw new Error(error.message);
  console.log(`  Assigned Demo SE → demo manager`);
}

async function seedManagerInboxItems({ seId, managerId }) {
  const { data: submission } = await admin
    .from("challenge_submissions")
    .select("id, status")
    .eq("user_id", seId)
    .eq("challenge_id", CHALLENGE_IDS[0])
    .maybeSingle();

  if (submission && submission.status !== "submitted" && submission.status !== "reviewed") {
    const { error: deleteError } = await admin.from("challenge_submissions").delete().eq("id", submission.id);
    if (deleteError) throw new Error(deleteError.message);

    const { error: insertError } = await admin.from("challenge_submissions").insert({
      user_id: seId,
      challenge_id: CHALLENGE_IDS[0],
      status: "submitted",
      reflection_text:
        "Completed ISC Search lab exercise — documented 10 stale interactive accounts and recommended certification campaign for healthcare app owners.",
      evidence_files: ["demo-se/isc-search-evidence.pdf"],
      submitted_at: new Date().toISOString(),
    });

    if (insertError) throw new Error(insertError.message);
    console.log(`  Challenge submitted for manager review`);
  } else if (submission?.status === "submitted" || submission?.status === "reviewed") {
    console.log(`  Challenge already submitted for review`);
  }

  const { data: sim } = await admin
    .from("simulation_assignments")
    .select("id, persona, vertical, solution_focus, difficulty")
    .eq("assigned_to", seId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sim) {
    const { data: existingCard } = await admin
      .from("coaching_cards")
      .select("id")
      .eq("simulation_assignment_id", sim.id)
      .eq("manager_review_status", "pending")
      .maybeSingle();

    if (!existingCard) {
      const { error: cardError } = await admin.from("coaching_cards").insert({
        simulation_assignment_id: sim.id,
        user_id: seId,
        structured_output: {
          strengths: ["Strong discovery opener", "Clear tie to audit readiness"],
          gaps: ["Needs sharper competitive trap on Entra", "Slow close — ask for next step earlier"],
          score: 78,
          managerSummary: "Solid SLED discovery sim — tighten competitive positioning before field ride-along.",
          simulationContext: {
            persona: sim.persona,
            vertical: sim.vertical,
            solutionFocus: sim.solution_focus,
            difficulty: sim.difficulty,
          },
        },
        se_reflection: "Buyer pushed back on Entra — I reframed to agent delegation but need a cleaner proof point.",
        manager_review_status: "pending",
        is_practice: false,
        sent_to_manager_at: new Date().toISOString(),
      });

      if (cardError) throw new Error(cardError.message);
      console.log(`  Simulation coaching card queued for manager review`);
    }
  }

  const { data: existingNotice } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", managerId)
    .eq("title", "Demo SE items ready for review")
    .maybeSingle();

  if (!existingNotice) {
    await admin.from("notifications").insert({
      user_id: managerId,
      title: "Demo SE items ready for review",
      body: "Challenge submission and simulation coaching card are waiting in your Action Inbox.",
      action_url: "/manager?section=inbox",
    });
  }
}

async function main() {
  const se = await findProfile(DEMO_SE_EMAIL);
  if (!se) {
    throw new Error(`${DEMO_SE_EMAIL} not found — run npm run seed:demo first`);
  }

  let manager = await findProfile(DEMO_MANAGER_EMAIL);
  if (!manager) {
    manager = se.manager_id
      ? await admin.from("profiles").select("id, email, full_name").eq("id", se.manager_id).maybeSingle().then((r) => r.data)
      : null;
  }
  if (!manager) {
    throw new Error(`No manager found for ${DEMO_SE_EMAIL}`);
  }

  console.log(`Seeding workspace for ${se.full_name} (${se.email})`);
  console.log(`Manager: ${manager.full_name ?? manager.email}\n`);

  await ensureReportsToManager({ seId: se.id, managerId: manager.id });

  const planId = await resolvePlanIdByName(RAMP_PLAN_NAME);
  await assignRampPlan({
    planId,
    userId: se.id,
    assignedBy: manager.id,
    mentorId: manager.id,
  });

  await seedDevelopmentPlan({
    userId: se.id,
    managerId: manager.id,
    createdBy: manager.id,
  });

  const { data: challenges } = await admin
    .from("challenges")
    .select("id, title")
    .in("id", CHALLENGE_IDS);

  if ((challenges ?? []).length < 2) {
    console.warn("  Warning: challenge library may be empty — run npm run seed:challenges");
  }

  for (const challengeId of CHALLENGE_IDS) {
    const challenge = challenges?.find((c) => c.id === challengeId);
    await assignChallenge({
      userId: se.id,
      challengeId,
      title: challenge?.title ?? challengeId,
    });
  }

  const { data: templates } = await admin
    .from("simulation_templates")
    .select("id, name, persona, vertical, solution_focus, difficulty, prompt_body, practice_rounds_before_submit")
    .order("name")
    .limit(2);

  if (!templates?.length) {
    console.warn("  Warning: no simulation templates — run npm run seed:simulations");
  } else {
    for (const [index, template] of templates.entries()) {
      await assignSimulation({
        userId: se.id,
        assignedBy: manager.id,
        template,
        index,
      });
    }
  }

  await assignPitch({ userId: se.id, assignedBy: manager.id });

  await seedManagerInboxItems({ seId: se.id, managerId: manager.id });

  const { count: reportCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("manager_id", manager.id);

  console.log("\nDemo SE workspace ready.");
  console.log(`  SE login:      ${DEMO_SE_EMAIL} / DemoSE2026!`);
  console.log(`  Manager login: ${DEMO_MANAGER_EMAIL} / DemoMgr2026!`);
  console.log(`  Direct reports for demo manager: ${reportCount ?? 0}`);
  console.log("  Manager: /manager — roster, inbox, program tracker, leaderboard");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
