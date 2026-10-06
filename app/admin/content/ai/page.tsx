import { redirect } from "next/navigation";
import { LEGACY_ADMIN_PATHS } from "@/lib/admin/admin-routes";

/** "AI & sims" became Content › Practice; provider settings moved to Settings › AI. */
export default function Page() {
  redirect(LEGACY_ADMIN_PATHS["/admin/content/ai"]!);
}
