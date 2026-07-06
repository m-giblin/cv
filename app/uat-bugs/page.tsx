import { redirect } from "next/navigation";
import { UatBugTrackerPanel } from "@/components/uat/uat-bug-tracker";
import { isForgeConfigured } from "@/lib/forge/config";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "UAT Bug Tracker",
};

export default async function UatBugsPage() {
  if (!isForgeConfigured()) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <UatBugTrackerPanel
      reporterEmail={profile?.email ?? user.email ?? ""}
      reporterName={profile?.full_name ?? user.email ?? "Reporter"}
    />
  );
}
