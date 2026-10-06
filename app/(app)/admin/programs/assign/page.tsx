import { redirect } from "next/navigation";

/** Enrolling now happens in each program's People tab. */
export default function Page() {
  redirect("/admin/programs");
}
