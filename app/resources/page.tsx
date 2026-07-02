import { AppShell } from "@/components/app-shell";
import { ContentLibraryBrowser } from "@/components/resources/content-library-browser";
import { PageHeader } from "@/components/page-hero";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function ResourcesPage() {
  const { data } = await requireAppAccess("/resources");

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="space-y-8">
        <PageHeader
          description="Browse solution briefs, decks, and recordings assigned by your manager or uploaded by enablement."
          eyebrow="Learning resources"
          title="Resource library"
        />
        <ContentLibraryBrowser />
      </div>
    </AppShell>
  );
}
