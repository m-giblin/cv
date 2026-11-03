import { KnowledgeChecks } from "@/components/question-bank/knowledge-checks";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requirePathAccess } from "@/lib/auth/require-access";

export const metadata = { title: "Quizzes · Practice" };

/** Every quiz in one place: the weekly mix across the bank, then one check per chapter or product topic. */
export default async function QuizzesPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  await requirePathAccess("/practice/quizzes");
  const { source } = await searchParams;
  return (
    <>
      <PageHeader
        accent="Different questions every time."
        eyebrow="Practice"
        subtitle="A weekly mix from the whole question bank, and a quick check for every playbook chapter and product topic."
        title="Quizzes."
      />
      <PageBody className="pb-8">
        <KnowledgeChecks initialSource={source} />
      </PageBody>
    </>
  );
}
