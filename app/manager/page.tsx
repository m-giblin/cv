import { redirect } from "next/navigation";
import { ManagerSectionPage } from "@/components/manager/manager-section-page";
import { canonicalHref } from "@/lib/manager/manager-routes";

type ManagerPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerPage({ searchParams }: ManagerPageProps) {
  const params = await searchParams;

  // Legacy `/manager?section=x` links (stored notifications, bookmarks) go to the section's own route.
  if (typeof params.section === "string") {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") query.set(key, value);
    }
    const target = canonicalHref(`/manager?${query.toString()}`);
    if (!target.startsWith("/manager?section=")) redirect(target);
  }

  return <ManagerSectionPage section="command" />;
}
