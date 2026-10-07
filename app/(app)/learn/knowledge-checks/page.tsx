import { KnowledgeChecks } from "@/components/question-bank/knowledge-checks";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requirePathAccess } from "@/lib/auth/require-access";

export const metadata = { title: "Knowledge checks · Learn" };

export default async function KnowledgeChecksPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  await requirePathAccess("/learn/knowledge-checks");
  const { source } = await searchParams;
  return (
    <>
      <PageHeader
        accent="Five questions, different each time."
        eyebrow="Learn"
        subtitle="Quick checks on the playbooks and SailPoint docs. Questions rotate, so retaking one gives you new ones."
        title="Knowledge checks."
      />
      <PageBody className="pb-8">
        <KnowledgeChecks initialSource={source} />
      </PageBody>
    </>
  );
}
