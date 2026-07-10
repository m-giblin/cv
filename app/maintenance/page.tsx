import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
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
 <div className="mx-auto max-w-lg py-16 text-center">
 <p className="text-xs font-bold uppercase tracking-wider text-[#6B6860]">Maintenance</p>
 <h1 className="mt-2 font-display text-2xl font-extrabold text-[#0D0E12]">We&apos;ll be right back</h1>
 <p className="mt-4 text-sm leading-relaxed text-[#3D3C38]">{message}</p>
 </div>
 </AppShell>
 );
}
