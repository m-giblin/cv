#!/usr/bin/env node
/**
 * Patches lib/database.types.ts with tenant_id on multi-tenant tables
 * and RPC helpers added in Phase 2 migrations.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const typesPath = path.join(__dirname, "..", "lib", "database.types.ts");

const TENANT_TABLES = [
  "activity_logs",
  "adaptive_probe_sessions",
  "ai_provider_configs",
  "ai_usage_logs",
  "audit_logs",
  "buyer_share_events",
  "buyer_share_rooms",
  "challenge_competencies",
  "challenge_submissions",
  "challenges",
  "coaching_card_competencies",
  "coaching_cards",
  "competencies",
  "content_assets",
  "corpus_asset_feedback",
  "corpus_qa_inquiries",
  "corpus_routing_rules",
  "corpus_sme_answers",
  "deal_prep_sessions",
  "development_goals",
  "development_plans",
  "enablement_program_segments",
  "enablement_programs",
  "gamification_events",
  "goal_quarterly_reviews",
  "gong_call_intel",
  "integration_connections",
  "isc_lab_interactions",
  "isc_lab_knowledge_chunks",
  "isc_lab_precall_briefs",
  "learn_module_progress",
  "manager_coaching_notes",
  "market_pulse_results",
  "market_pulse_weeks",
  "mentor_review_requests",
  "notifications",
  "onboarding_plans",
  "pitch_peer_reviews",
  "pitch_submissions",
  "plan_assignment_steps",
  "plan_assignments",
  "plan_step_prerequisites",
  "plan_steps",
  "readiness_certifications",
  "release_courses",
  "resource_engagement",
  "segment_certificates",
  "segment_unlock_overrides",
  "shadow_meeting_logs",
  "simulation_assignments",
  "simulation_templates",
];

let source = fs.readFileSync(typesPath, "utf8");

for (const table of TENANT_TABLES) {
  const rowNeedle = new RegExp(`(\\s+${table}:\\s*\\{\\s*Row:\\s*\\{[^}]*?)(\\n\\s+\\};)`, "s");
  const rowMatch = source.match(rowNeedle);
  if (rowMatch && !rowMatch[1].includes("tenant_id")) {
    source = source.replace(rowNeedle, `$1\n          tenant_id: string | null;$2`);
  }

  const insertNeedle = new RegExp(
    `(\\s+${table}:\\s*\\{[\\s\\S]*?Insert:\\s*\\{[^}]*?)(\\n\\s+\\};\\s*\\n\\s+Update:)`,
    "s",
  );
  const insertMatch = source.match(insertNeedle);
  if (insertMatch && !insertMatch[1].includes("tenant_id")) {
    source = source.replace(insertNeedle, `$1\n          tenant_id?: string | null;$2`);
  }
}

if (!source.includes("set_session_tenant")) {
  source = source.replace(
    "      get_profile_subtree: {",
    `      set_session_tenant: {
        Args: { p_tenant_id: string | null };
        Returns: undefined;
      };
      effective_tenant_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      get_profile_subtree: {`,
  );
}

fs.writeFileSync(typesPath, source);
console.log(`Patched ${typesPath} with tenant_id on ${TENANT_TABLES.length} tables.`);
