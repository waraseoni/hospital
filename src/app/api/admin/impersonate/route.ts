import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ALL_ROLES,
  IMP_FROM_COOKIE,
  IMP_ROLE_COOKIE,
  IMP_SID_COOKIE,
  isValidImpersonation,
  readImpersonationCookies,
} from "@/lib/auth/role";

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 8 * 60 * 60,
};

async function getSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null, role: null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "super_admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null, role: null };
  }
  return { error: null, user, role: profile.role as string };
}

export async function POST(request: NextRequest) {
  try {
    const check = await getSuperAdmin();
    if (check.error || !check.user) return check.error!;

    const { targetUserId } = await request.json();
    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }
    if (targetUserId === check.user.id) {
      return NextResponse.json({ error: "Cannot impersonate yourself" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", targetUserId)
      .single();
    if (targetError || !target) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }
    if (target.role === "super_admin") {
      return NextResponse.json({ error: "Cannot impersonate a super admin" }, { status: 400 });
    }
    if (!(ALL_ROLES as string[]).includes(target.role)) {
      return NextResponse.json({ error: "Invalid target role" }, { status: 400 });
    }

    const sid = randomUUID();
    const response = NextResponse.json({
      success: true,
      redirectTo: `/${target.role}`,
      impersonating: { role: target.role, name: target.full_name },
    });
    response.cookies.set(IMP_ROLE_COOKIE, target.role, COOKIE_BASE);
    response.cookies.set(IMP_FROM_COOKIE, "super_admin", COOKIE_BASE);
    response.cookies.set(IMP_SID_COOKIE, sid, { ...COOKIE_BASE, maxAge: 8 * 60 * 60 });

    const { error: auditError } = await admin.from("audit_logs").insert({
      user_id: check.user.id,
      action: "IMPERSONATE_START",
      table_name: "profiles",
      record_id: target.id,
      new_data: { sid, target_role: target.role, target_name: target.full_name },
    });
    if (auditError) {
      return NextResponse.json(
        { error: "Failed to record audit log: " + auditError.message },
        { status: 500 }
      );
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const check = await getSuperAdmin();
    if (check.error || !check.user) return check.error!;

    const cookieStore = await cookies();
    const imp = readImpersonationCookies((name) => cookieStore.get(name)?.value);
    if (!imp.role || !isValidImpersonation("super_admin", imp.from, imp.role)) {
      return NextResponse.json({ success: true, message: "No active impersonation" });
    }

    const admin = createAdminClient();
    if (imp.sid) {
      await admin.from("audit_logs").insert({
        user_id: check.user.id,
        action: "IMPERSONATE_END",
        table_name: "profiles",
        record_id: null,
        new_data: { sid: imp.sid, ended_role: imp.role },
      });
    }

    const response = NextResponse.json({ success: true, redirectTo: "/super-admin" });
    response.cookies.delete(IMP_ROLE_COOKIE);
    response.cookies.delete(IMP_FROM_COOKIE);
    response.cookies.delete(IMP_SID_COOKIE);
    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cookieStore = await cookies();
    const imp = readImpersonationCookies((name) => cookieStore.get(name)?.value);
    const active = isValidImpersonation(profile.role, imp.from, imp.role);

    return NextResponse.json({
      active,
      role: active ? imp.role : null,
      from: active ? imp.from : null,
      realRole: profile.role,
      realName: profile.full_name,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
