import { AppShell } from "@/components/app-shell";
import { ContentLibraryBrowser } from "@/components/resources/content-library-browser";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireAppAccess } from "@/lib/auth/require-access";
import { getUserReleaseProjectTags } from "@/lib/corpus/user-release-tags";
import { createClient } from "@/lib/supabase/server";

export default async function ResourcesPage() {
 const { data } = await requireAppAccess("/resources");
 const supabase = await createClient();
 const releaseProjectTags =
 supabase && data.currentUser.id
 ? await getUserReleaseProjectTags(supabase, data.currentUser.id)
 : [];

 return (
 <AppShell currentUser={data.currentUser} notifications={data.notifications}>
 <SEPageLayout
 eyebrow="Enablement"
 subtitle="Battle cards, demo guides, one-pagers, and playbooks — everything you need in the field"
 title="Resources"
 >
 <ContentLibraryBrowser releaseProjectTags={releaseProjectTags} />
 </SEPageLayout>
 </AppShell>
 );
}
