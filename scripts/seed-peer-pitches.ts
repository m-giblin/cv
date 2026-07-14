/**
 * Seeds manager-reviewed peer pitches + peer reviews for demo SE teams.
 * Populates the Peer Pitch Library with AIS, Agentic Fabric, machine identity, and workflow themes.
 *
 * Prerequisite: npm run seed:demo
 * Run: npm run seed:peer-pitches
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import type { Database } from "../lib/database.types";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  return Object.fromEntries(
    raw
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

/** Minimal WebM (EBML header only) — enough for storage + signed URL; replace with real recordings in prod. */
const PLACEHOLDER_WEBM = Buffer.from(
  "0x1a45dfa301000000000000000000000000000000000000000000000000000000".replace(/0x/g, ""),
  "hex",
);

const PITCH_CATALOG = [
  {
    title: "AIS / Agentic positioning: Agent identity lifecycle",
    reflection:
      "Led with shadow AI incident, framed discover-govern-protect, closed with 90-day proof point for CISO.",
    grade: 5,
    endorse: true,
  },
  {
    title: "Agentic Fabric elevator pitch — MCP governance hook",
    reflection:
      "Connected third-party agents calling tools to policy gaps Microsoft cannot close. Strong differentiation on audit.",
    grade: 4,
    endorse: true,
  },
  {
    title: "Machine accounts: service principal sprawl ROI",
    reflection:
      "Quantified 400+ stale service principals in discovery story. Tied to certification campaign automation.",
    grade: 4,
    endorse: false,
  },
  {
    title: "Competitive trap: Entra already governs our agents",
    reflection:
      "Acknowledged Entra strength, reframed to cross-app agent delegation and MCP allow-lists. Could tighten proof point.",
    grade: 4,
    endorse: true,
  },
  {
    title: "Executive business case: Zero standing privilege for AI",
    reflection:
      "Board-level risk framing without feature tour. Linked AIS to OMB zero-trust language for federal prospect.",
    grade: 5,
    endorse: true,
  },
  {
    title: "MCP governance story — third-party agents on ISC APIs",
    reflection:
      "Explained OAuth scoping and session audit for MCP servers. Demo'd policy deny on over-privileged tool call.",
    grade: 4,
    endorse: false,
  },
  {
    title: "ISC Workflows ROI — joiner automation in SLED",
    reflection:
      "Helpdesk ticket reduction narrative with before/after approval steps. Good for state agency buyer.",
    grade: 3,
    endorse: false,
  },
  {
    title: "Shadow AI discovery workshop opener",
    reflection:
      "Opened with unsanctioned ChatGPT incident pattern. Positioned Agentic Fabric as control plane not blocker.",
    grade: 5,
    endorse: true,
  },
  {
    title: "Non-human identity taxonomy for healthcare CISO",
    reflection:
      "Clinical AI agents vs service accounts vs workforce — one-slide taxonomy landed well in dry run.",
    grade: 4,
    endorse: true,
  },
  {
    title: "Agent certification campaign — quarterly governance",
    reflection:
      "Explained who certifies agents when no human manager exists. Used AI governance council as certifier pattern.",
    grade: 4,
    endorse: false,
  },
];

const MANAGER_EMAILS = ["john.barrett@sailpoint.com", "matt.giblin@sailpoint.com"];

async function findProfileByEmail(admin: ReturnType<typeof createClient<Database>>, email: string) {
  const { data, error } = await admin.from("profiles").select("id, email, full_name").eq("email", email).maybeSingle();
  if (error) throw new Error(`${email}: ${error.message}`);
  return data;
}

async function uploadPlaceholder(admin: ReturnType<typeof createClient<Database>>, userId: string, fileName: string) {
  const path = `${userId}/${fileName}`;
  const { error } = await admin.storage.from("evidence").upload(path, PLACEHOLDER_WEBM, {
    contentType: "video/webm",
    upsert: true,
  });
  if (error && !error.message.includes("already exists")) {
    throw new Error(`Upload ${path}: ${error.message}`);
  }
  return path;
}

async function seedTeam(
  admin: ReturnType<typeof createClient<Database>>,
  managerEmail: string,
) {
  const manager = await findProfileByEmail(admin, managerEmail);
  if (!manager) {
    console.warn(`Manager not found: ${managerEmail} — skip team`);
    return { pitches: 0, reviews: 0 };
  }

  const { data: teammates, error: teamError } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("manager_id", manager.id);

  if (teamError) throw teamError;
  if (!teammates?.length) return { pitches: 0, reviews: 0 };

  let pitchCount = 0;
  let reviewCount = 0;

  for (let i = 0; i < teammates.length; i += 1) {
    const owner = teammates[i];
    const pitchMeta = PITCH_CATALOG[i % PITCH_CATALOG.length];
    const fileName = `peer-library-${managerEmail.includes("matt") ? "m" : "j"}-${i + 1}.webm`;
    const evidencePath = await uploadPlaceholder(admin, owner.id, fileName);

    const pitchSuffix = String(
      (managerEmail.includes("matt") ? 1000 : 2000) + i,
    ).padStart(12, "0");
    const pitchId = `b1000001-0001-4000-8000-${pitchSuffix}`;

    const { error: pitchError } = await admin.from("pitch_submissions").upsert(
      {
        id: pitchId,
        user_id: owner.id,
        title: pitchMeta.title,
        evidence_path: evidencePath,
        reflection_text: pitchMeta.reflection,
        target_type: "practice",
        status: "reviewed",
        manager_grade: pitchMeta.grade,
        manager_feedback: "Strong enablement pitch — approved for peer library.",
        reviewed_at: new Date().toISOString(),
        reviewed_by: manager.id,
      },
      { onConflict: "id" },
    );

    if (pitchError) throw pitchError;
    pitchCount += 1;

    const reviewers = teammates.filter((t) => t.id !== owner.id).slice(0, 2);
    for (let r = 0; r < reviewers.length; r += 1) {
      const reviewer = reviewers[r];
      const reviewSuffix = String(
        (managerEmail.includes("matt") ? 3000 : 4000) + i * 10 + r,
      ).padStart(12, "0");
      const reviewId = `c2000001-0002-4000-8000-${reviewSuffix}`;

      const { error: reviewError } = await admin.from("pitch_peer_reviews").upsert(
        {
          id: reviewId,
          pitch_id: pitchId,
          reviewer_id: reviewer.id,
          clarity_score: 4 + (r % 2),
          storyline_score: 4,
          differentiation_score: pitchMeta.endorse ? 5 : 4,
          comment: pitchMeta.endorse ? "Mentor pick — use this storyline in the field." : "Solid structure; tighten proof point.",
          endorsed: pitchMeta.endorse && r === 0,
        },
        { onConflict: "id" },
      );

      if (reviewError) throw reviewError;
      reviewCount += 1;
    }
  }

  return { pitches: pitchCount, reviews: reviewCount };
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let totalPitches = 0;
  let totalReviews = 0;

  for (const email of MANAGER_EMAILS) {
    const result = await seedTeam(admin, email);
    totalPitches += result.pitches;
    totalReviews += result.reviews;
    console.log(`${email}: ${result.pitches} pitches, ${result.reviews} peer reviews`);
  }

  console.log(`\nPeer pitch library seeded: ${totalPitches} reviewed pitches, ${totalReviews} peer reviews.`);
  console.log("Log in as a demo SE (e.g. finn.grant@example.com) and open /pitch to browse teammate pitches.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
