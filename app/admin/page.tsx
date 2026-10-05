import { redirect } from "next/navigation";
import { AdminSectionPage } from "@/components/admin/admin-section-page";
import { canonicalAdminHref } from "@/lib/admin/admin-routes";

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;

  // Legacy `/admin?tab=x` links go to the view's own route.
  if (typeof params.tab === "string") {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") query.set(key, value);
    }
    const target = canonicalAdminHref(`/admin?${query.toString()}`);
    if (!target.startsWith("/admin?tab=")) redirect(target);
  }

  return <AdminSectionPage />;
}
