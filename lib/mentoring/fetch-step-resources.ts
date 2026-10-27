import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { resourceKeyForStep, type StepResource, type StepResourceSection } from "@/lib/mentoring/mentor-guide";
import type { PlanStep } from "@/lib/types";

function strings(value: unknown, limit = 6): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const text = record.title ?? record.text ?? record.body;
        return typeof text === "string" ? text : null;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item && item.trim()))
    .slice(0, limit);
}

function section(label: string, items: string[]): StepResourceSection[] {
  return items.length > 0 ? [{ label, items }] : [];
}

function situationFrom(prompt: string): string | undefined {
  const line = prompt.split("\n").find((item) => item.startsWith("Situation:"));
  return line ? line.replace(/^Situation:\s*/, "") : undefined;
}

function playbookResource(row: { title: string; body: unknown }): StepResource {
  const body = row.body && typeof row.body === "object" ? (row.body as Record<string, unknown>) : {};
  const subtitle = typeof body.subtitle === "string" ? body.subtitle : "";
  const whereFits = typeof body.whereFits === "string" ? body.whereFits : "";
  return {
    kind: "playbook",
    title: row.title,
    summary: [subtitle, whereFits].filter(Boolean).join(". ") || undefined,
    sections: [
      ...section("What they should be able to do", strings(body.objectives)),
      ...section("Key takeaways", strings(body.takeaways)),
      ...section("Questions to check understanding", strings(body.retrievalCheck)),
      ...section("Common mistakes", strings(body.mistakes, 4)),
    ],
  };
}

/** Load summaries of every challenge, simulation, playbook and asset these steps link to. */
export async function fetchStepResources(
  admin: SupabaseClient<Database>,
  steps: PlanStep[],
): Promise<Record<string, StepResource>> {
  const ids: Record<"challenge" | "simulation" | "playbook" | "asset", Set<string>> = {
    challenge: new Set(),
    simulation: new Set(),
    playbook: new Set(),
    asset: new Set(),
  };
  for (const step of steps) {
    const key = resourceKeyForStep(step);
    if (!key) continue;
    const [kind, id] = key.split(":") as [keyof typeof ids, string];
    ids[kind].add(id);
  }

  const [challenges, simulations, playbooks, assets] = await Promise.all([
    ids.challenge.size
      ? admin.from("challenges").select("id, title, description, steps, success_criteria, estimated_minutes, difficulty").in("id", [...ids.challenge])
      : Promise.resolve({ data: [] }),
    ids.simulation.size
      ? admin.from("simulation_templates").select("id, name, persona, vertical, solution_focus, difficulty, prompt_body").in("id", [...ids.simulation])
      : Promise.resolve({ data: [] }),
    ids.playbook.size
      ? (admin as unknown as SupabaseClient)
          .from("capability_playbooks")
          .select("id, title, body")
          .in("id", [...ids.playbook])
          .returns<{ id: string; title: string; body: unknown }[]>()
      : Promise.resolve({ data: [] as { id: string; title: string; body: unknown }[] }),
    ids.asset.size
      ? admin.from("content_assets").select("id, title, description").in("id", [...ids.asset])
      : Promise.resolve({ data: [] }),
  ]);

  const resources: Record<string, StepResource> = {};
  for (const row of challenges.data ?? []) {
    resources[`challenge:${row.id}`] = {
      kind: "challenge",
      title: row.title,
      summary: row.description,
      sections: [
        ...section("Steps", strings(row.steps, 10)),
        ...section("Success criteria", strings(row.success_criteria, 10)),
      ],
    };
  }
  for (const row of simulations.data ?? []) {
    resources[`simulation:${row.id}`] = {
      kind: "simulation",
      title: row.name,
      summary: situationFrom(row.prompt_body),
      sections: section(
        "Scenario",
        [`Customer: ${row.persona}`, `Industry: ${row.vertical}`, `Focus: ${row.solution_focus}`, `Difficulty: ${row.difficulty}`],
      ),
    };
  }
  for (const row of playbooks.data ?? []) {
    resources[`playbook:${row.id}`] = playbookResource(row);
  }
  for (const row of assets.data ?? []) {
    resources[`asset:${row.id}`] = {
      kind: "asset",
      title: row.title,
      summary: row.description ?? undefined,
      sections: [],
    };
  }
  return resources;
}
