import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { validateSailPointEmail, requireAdminSession } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/database.types";
import { ProfileRole, SeLevel } from "@/lib/types";

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z
    .enum([
      "basic_se",
      "senior_se",
      "advisory_solutions_consultant",
      "mentor",
      "manager",
      "director",
      "admin",
    ] as [ProfileRole, ...ProfileRole[]])
    .optional(),
  level: z.enum(["Basic", "Senior", "Advisory"] as [SeLevel, ...SeLevel[]]).optional(),
  managerId: z.string().uuid().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json({ error: "Service role key not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  const parsed = updateUserSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existingProfile } = await admin.from("profiles").select("role, level, manager_id").eq("id", id).maybeSingle();

  if (parsed.data.email) {
    const emailError = validateSailPointEmail(parsed.data.email);

    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(id, {
      email: parsed.data.email.trim().toLowerCase(),
      user_metadata: parsed.data.fullName ? { full_name: parsed.data.fullName } : undefined,
    });

    if (authUpdateError) {
      return NextResponse.json({ error: authUpdateError.message }, { status: 400 });
    }
  } else if (parsed.data.fullName) {
    await admin.auth.admin.updateUserById(id, {
      user_metadata: { full_name: parsed.data.fullName },
    });
  }

  const profileUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {};

  if (parsed.data.fullName) {
    profileUpdate.full_name = parsed.data.fullName;
  }

  if (parsed.data.email) {
    profileUpdate.email = parsed.data.email.trim().toLowerCase();
  }

  if (parsed.data.role) {
    profileUpdate.role = parsed.data.role;
  }

  if (parsed.data.level) {
    profileUpdate.level = parsed.data.level;
  }

  if (parsed.data.managerId !== undefined) {
    profileUpdate.manager_id = parsed.data.managerId;
  }

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await admin.from("profiles").update(profileUpdate).eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();

  await logAuditEvent(session.supabase, {
    action: "user.updated",
    targetType: "profile",
    targetId: id,
    details: {
      ...parsed.data,
      previousRole: existingProfile?.role ?? null,
      previousLevel: existingProfile?.level ?? null,
      previousManagerId: existingProfile?.manager_id ?? null,
    },
  });

  return NextResponse.json({ user: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const admin = createAdminClient();
  const { id } = await context.params;

  if (!admin) {
    return NextResponse.json({ error: "Service role key not configured." }, { status: 503 });
  }

  if (session.user.id === id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAuditEvent(session.supabase, {
    action: "user.deleted",
    targetType: "profile",
    targetId: id,
  });

  return NextResponse.json({ success: true });
}
