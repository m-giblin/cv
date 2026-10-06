import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { mapProfile } from "@/lib/data/get-dashboard-data";
import { createClient } from "@/lib/supabase/server";

export default async function MaintenancePage({
 searchParams,
}: {
 searchParams: Promise<{ message?: string }>;
}) {
 const supabase = await createClient();
 if (!supabase) redirect("/login");

 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) redirect("/login");

 const { data: profileRow } = await supabase
 .from("profiles")
 .select("id, email, full_name, role, level, manager_id, tenant_id, avatar_url, created_at")
 .eq("id", user.id)
 .maybeSingle();

 if (!profileRow) redirect("/login");

 const params = await searchParams;
 const message =
 params.message ??
 "This organization is temporarily unavailable while we perform maintenance. Please try again shortly.";

 return (
 <AppShell contentWidth="default" currentUser={mapProfile(profileRow)} notifications={[]}>
 <PageHeader eyebrow="Maintenance" title="We'll be right back" />
 <PageBody className="pb-8">
 <div
 className="max-w-2xl rounded-[14px] border border-line bg-white px-6 py-5 shadow-[inset_3px_0_0_var(--color-signal)]"
 role="status"
 >
 <StatusPill tone="warning">Temporarily unavailable</StatusPill>
 <p className="mt-3 max-w-[640px] text-base leading-normal text-ink">{message}</p>
 <p className="mt-3 text-sm text-ink-2">Your progress is saved. Refresh this page in a few minutes.</p>
 </div>
 </PageBody>
 </AppShell>
 );
}
