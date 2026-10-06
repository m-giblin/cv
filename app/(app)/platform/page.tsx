import { redirect } from "next/navigation";
import { PlatformSectionPage } from "@/components/platform/platform-section-page";
import { canonicalPlatformHref } from "@/lib/platform/platform-routes";

type PlatformPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PlatformPage({ searchParams }: PlatformPageProps) {
  const params = await searchParams;

  // Legacy `/platform?view=x` links go to the view's own route.
  if (typeof params.view === "string") {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") query.set(key, value);
    }
    const target = canonicalPlatformHref(`/platform?${query.toString()}`);
    if (!target.startsWith("/platform?view=")) redirect(target);
  }

  return <PlatformSectionPage />;
}
