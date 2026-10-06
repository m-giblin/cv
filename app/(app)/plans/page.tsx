import { redirect } from "next/navigation";
import { requirePathAccess } from "@/lib/auth/require-access";

/** Assigning and building programs moved into the Programs workbench for each portal. */
export default async function PlansPage() {
  const { tier } = await requirePathAccess("/plans");
  redirect(tier === "admin" || tier === "super_admin" ? "/admin/programs" : "/manager/programs");
}
