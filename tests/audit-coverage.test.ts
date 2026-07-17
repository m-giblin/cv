import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Admin/manager/platform mutation routes that must emit audit events. */
const MUTATION_ROUTES_REQUIRING_AUDIT = [
  "app/api/admin/competencies/route.ts",
  "app/api/admin/competencies/[id]/route.ts",
  "app/api/admin/content-assets/route.ts",
  "app/api/admin/content-assets/[id]/route.ts",
  "app/api/admin/content-assets/upload/route.ts",
  "app/api/admin/simulation-templates/route.ts",
  "app/api/admin/simulation-templates/[id]/route.ts",
  "app/api/admin/users/route.ts",
  "app/api/admin/users/[id]/route.ts",
  "app/api/admin/users/import/route.ts",
  "app/api/admin/platform-settings/route.ts",
  "app/api/admin/support/route.ts",
  "app/api/admin/ai-settings/route.ts",
  "app/api/corpus/routing-rules/route.ts",
  "app/api/corpus/routing-rules/[id]/route.ts",
  "app/api/corpus/feedback/[id]/route.ts",
  "app/api/manager/coaching-notes/route.ts",
  "app/api/reviews/coaching-cards/[id]/route.ts",
  "app/api/reviews/submissions/[id]/route.ts",
  "app/api/certifications/[id]/route.ts",
  "app/api/challenges/route.ts",
  "app/api/release-courses/route.ts",
  "app/api/simulations/assignments/route.ts",
  "app/api/plans/templates/route.ts",
  "app/api/plans/templates/[id]/route.ts",
  "app/api/plans/assignments/route.ts",
  "app/api/plans/steps/[id]/review/route.ts",
  "app/api/platform/shadow/route.ts",
  "app/api/platform/support/[id]/route.ts",
  "app/api/platform/tenants/[id]/invites/[inviteId]/route.ts",
  "app/api/platform/tenants/bulk/route.ts",
  "app/api/workspace/switch/route.ts",
  "lib/tenant/tenants.ts",
  "lib/plans/segment-certificates.ts",
  "lib/platform/tenant-invites.ts",
  "lib/platform/tenant-sso.ts",
  "lib/platform/tenant-webhooks.ts",
  "lib/platform/tenant-export.ts",
  "lib/platform/operator-prefs.ts",
];

function hasMutationHandler(source: string): boolean {
  return /export async function (POST|PATCH|PUT|DELETE)\b/.test(source);
}

function hasAuditCall(source: string): boolean {
  return /auditMutation\(|logAuditEvent\(|requireAuditEvent\(/.test(source);
}

describe("audit coverage (L5)", () => {
  for (const relativePath of MUTATION_ROUTES_REQUIRING_AUDIT) {
    it(`logs admin/manager mutations in ${relativePath}`, () => {
      const absolutePath = path.join(ROOT, relativePath);
      const source = fs.readFileSync(absolutePath, "utf8");
      if (!hasMutationHandler(source)) {
        return;
      }
      expect(hasAuditCall(source), `${relativePath} is missing auditMutation/logAuditEvent`).toBe(true);
    });
  }
});
