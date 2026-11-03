import { redirect } from "next/navigation";

/** Knowledge checks moved to Practice → Quizzes; old links (plan steps, chapters) keep their topic. */
export default async function KnowledgeChecksPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const { source } = await searchParams;
  redirect(source ? `/practice/quizzes?source=${encodeURIComponent(source)}` : "/practice/quizzes");
}
