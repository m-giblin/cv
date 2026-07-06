import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { tokenizeQuery } from "@/lib/isc-lab/doc-index";

export type GoldenAnswer = {
  title: string;
  reflection: string;
  managerFeedback: string | null;
  managerGrade: number | null;
  personName: string;
};

export async function loadGoldenAnswers(
  supabase: SupabaseClient<Database>,
  userId: string,
  query: string,
  limit = 3,
): Promise<GoldenAnswer[]> {
  const { data: profile } = await supabase.from("profiles").select("manager_id").eq("id", userId).maybeSingle();
  if (!profile?.manager_id) return [];

  const { data: teammates } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("manager_id", profile.manager_id);

  const teammateIds = (teammates ?? []).map((row) => row.id).filter((id) => id !== userId);
  if (teammateIds.length === 0) return [];

  const { data: pitches } = await supabase
    .from("pitch_submissions")
    .select("title, reflection_text, manager_feedback, manager_grade, user_id")
    .in("user_id", teammateIds)
    .eq("status", "reviewed")
    .order("manager_grade", { ascending: false })
    .limit(20);

  const nameById = new Map((teammates ?? []).map((row) => [row.id, row.full_name]));
  const tokens = tokenizeQuery(query);

  const scored = (pitches ?? [])
    .map((pitch) => {
      const haystack = `${pitch.title} ${pitch.reflection_text ?? ""}`.toLowerCase();
      const score = tokens.reduce((sum, token) => (haystack.includes(token) ? sum + 1 : sum), 0);
      return { pitch, score };
    })
    .filter((item) => item.score > 0 || (item.pitch.manager_grade ?? 0) >= 4)
    .sort((a, b) => b.score - a.score || (b.pitch.manager_grade ?? 0) - (a.pitch.manager_grade ?? 0))
    .slice(0, limit);

  return scored.map(({ pitch }) => ({
    title: pitch.title,
    reflection: pitch.reflection_text ?? "",
    managerFeedback: pitch.manager_feedback,
    managerGrade: pitch.manager_grade,
    personName: nameById.get(pitch.user_id) ?? "Teammate",
  }));
}

export function formatGoldenAnswersBlock(answers: GoldenAnswer[]): string {
  if (answers.length === 0) return "";
  return answers
    .map(
      (answer, index) =>
        `[Golden pitch ${index + 1}] ${answer.title} (${answer.personName}, mgr ${answer.managerGrade ?? "—"}/5)\nReflection: ${answer.reflection}\nManager note: ${answer.managerFeedback ?? "Approved for peer library."}`,
    )
    .join("\n\n");
}
