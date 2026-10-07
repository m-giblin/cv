import { QuestionBankAdmin } from "@/components/question-bank/question-bank-admin";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requirePathAccess } from "@/lib/auth/require-access";

export const metadata = { title: "Question bank · Content" };

export default async function AdminQuestionBankPage() {
  await requirePathAccess("/admin/content/question-bank");
  return (
    <>
      <PageHeader
        accent="Generate, review, rotate."
        eyebrow="Content"
        subtitle="Quiz questions drafted by AI from playbooks, SailPoint docs and the developer portal. Learners get a different mix each time."
        title="Question bank."
      />
      <PageBody className="pb-8">
        <QuestionBankAdmin />
      </PageBody>
    </>
  );
}
