import { redirect } from "next/navigation";
import { PlaybookAdmin } from "@/components/playbooks/playbook-admin";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requirePathAccess } from "@/lib/auth/require-access";
import { resolveTenantContext } from "@/lib/auth/tenant-context";
import { loadAdminPlaybooks } from "@/lib/playbooks/data";

export const metadata = { title: "Playbooks · Content" };

export default async function AdminPlaybooksPage() {
  await requirePathAccess("/admin/content/playbooks");
  const context = await resolveTenantContext();
  if (!context?.tenantId) redirect("/admin");
  const library = await loadAdminPlaybooks(context.tenantId);

  return (
    <>
      <PageHeader
        accent="Import, review, publish."
        eyebrow="Content"
        subtitle="Field guides as structured playbooks: pitches, discovery questions, stories and objections, one per capability."
        title="Playbooks."
      />
      <PageBody className="pb-8">
        {library ? (
          <PlaybookAdmin guides={library.guides} playbooks={library.playbooks} />
        ) : (
          <p className="rounded-[10px] bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
            Playbooks couldn&apos;t load. If this is a new install, the playbooks database migration may not be applied yet.
          </p>
        )}
      </PageBody>
    </>
  );
}
