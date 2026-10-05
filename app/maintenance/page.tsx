import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
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
 <div className="px-[var(--gutter)]">
 <div className="max-w-2xl rounded-[16px] border-[1.5px] border-ink bg-signal-soft px-6 py-5" role="status">
 <p className="label-mono text-ink">
 <span aria-hidden>● </span>Temporarily unavailable
 </p>
 <p className="mt-2 text-base leading-normal text-ink">{message}</p>
 <p className="mt-3 text-sm text-ink-2">Your progress is saved. Refresh this page in a few minutes.</p>
 </div>
 </div>
 </AppShell>
 );
}
