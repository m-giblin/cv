import { redirect } from "next/navigation";
import { legacySeRedirect } from "@/lib/se/se-routes";

type LegacyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy route, now /readiness. Query strings are kept. */
export default async function LegacyRedirectPage({ searchParams }: LegacyPageProps) {
  redirect(legacySeRedirect("/growth/readiness", await searchParams) ?? "/readiness");
}
