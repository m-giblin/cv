import { revalidatePath } from "next/cache";

/** Bust server-rendered plan data after any assignment step / due-date mutation. */
export function revalidatePlanSurfaces() {
  revalidatePath("/manager");
  revalidatePath("/plan-calendar");
  revalidatePath("/my-plan");
  revalidatePath("/dashboard");
}
