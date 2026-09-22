import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ALL_ROLES,
  IMP_DEFAULT_MAX_AGE_SECONDS,
  IMP_FROM_COOKIE,
  IMP_MODE_COOKIE,
  IMP_MODE_RO,
  IMP_MODE_RW,
  IMP_ROLE_COOKIE,
  IMP_SID_COOKIE,
  IMP_UID_COOKIE,
  ImpMode,
  isValidImpersonation,
  readImpersonationCookies,
} from "@/lib/auth/role";

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: IMP_DEFAULT_MAX_AGE_SECONDS,
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

async function audit(admin: ReturnType<typeof createAdminClient>, entry: {
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  new_data: Record<string, unknown>;
  old_data?: Record<string, unknown> | null;
}) {
  const { error } = await admin.from("audit_logs").insert({
    ...entry,
    old_data: entry.old_data ?? null,
  });
  return error;
}

function setImpersonationCookies(
  response: NextResponse,
  role: string,
  sid: string,
  uid: string,
  mode: ImpMode,
  maxAge: number
) {
  response.cookies.set(IMP_ROLE_COOKIE, role, COOKIE_BASE);
  response.cookies.set(IMP_FROM_COOKIE, "super_admin", COOKIE_BASE);
  response.cookies.set(IMP_SID_COOKIE, sid, { ...COOKIE_BASE, maxAge });
  response.cookies.set(IMP_UID_COOKIE, uid, { ...COOKIE_BASE, maxAge });
  response.cookies.set(IMP_MODE_COOKIE, mode, { ...COOKIE_BASE, maxAge });
}

function clearImpersonationCookies(response: NextResponse) {
  response.cookies.delete(IMP_ROLE_COOKIE);
  response.cookies.delete(IMP_FROM_COOKIE);
  response.cookies.delete(IMP_SID_COOKIE);
  response.cookies.delete(IMP_UID_COOKIE);
  response.cookies.delete(IMP_MODE_COOKIE);
}

export async function POST(request: NextRequest) {
  try {
    const check = await getSuperAdmin();
    if (check.error || !check.user) return check.error!;

    let targetUserId: string | undefined;
    const body = await request.json().catch(() => ({}));
    const targetRole: string | undefined = body.targetRole;
    const reasonValue = typeof body.reason === "string" ? body.reason.slice(0, 200) : undefined;

    const admin = createAdminClient();

    if (targetRole) {
      if (targetRole === "super_admin" || !(ALL_ROLES as string[]).includes(targetRole)) {
        return NextResponse.json({ error: "Invalid target role" }, { status: 400 });
      }
      const { data: candidates } = await admin
        .from("profiles")
        .select("id, role, full_name")
        .eq("role", targetRole)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1);
      const target = candidates?.[0];
      if (!target) {
        return NextResponse.json({ error: `No active ${targetRole} user found to switch to` }, { status: 404 });
      }
      targetUserId = target.id;
    } else {
      targetUserId = body.targetUserId;
      if (!targetUserId || typeof targetUserId !== "string") {
        return NextResponse.json({ error: "targetUserId or targetRole is required" }, { status: 400 });
      }
    }

    if (targetUserId === check.user.id) {
      return NextResponse.json({ error: "Cannot impersonate yourself" }, { status: 400 });
    }

    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("id, role, full_name, email, is_active")
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
    if (target.is_active === false) {
      return NextResponse.json({ error: "Cannot impersonate an inactive user" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const oldImp = readImpersonationCookies((name) => cookieStore.get(name)?.value);
    const oldValid = oldImp.role && isValidImpersonation("super_admin", oldImp.from, oldImp.role);

    const sid = randomUUID();
    const response = NextResponse.json({
      success: true,
      redirectTo: `/${target.role}`,
      impersonating: { role: target.role, name: target.full_name, email: target.email },
      expiresAt: Date.now() + IMP_DEFAULT_MAX_AGE_SECONDS * 1000,
    });
    setImpersonationCookies(response, target.role, sid, target.id, IMP_MODE_RW, IMP_DEFAULT_MAX_AGE_SECONDS);

    if (oldValid && oldImp.sid) {
      await audit(admin, {
        user_id: check.user.id,
        action: "IMPERSONATE_END",
        table_name: "profiles",
        record_id: null,
        new_data: { sid: oldImp.sid, ended_role: oldImp.role, reason: "switch" },
      });
    }

    const auditError = await audit(admin, {
      user_id: check.user.id,
      action: "IMPERSONATE_START",
      table_name: "profiles",
      record_id: target.id,
      new_data: {
        sid,
        target_role: target.role,
        target_name: target.full_name,
        target_email: target.email,
        reason: reasonValue,
      },
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

export async function PATCH(request: NextRequest) {
  try {
    const check = await getSuperAdmin();
    if (check.error || !check.user) return check.error!;

    const cookieStore = await cookies();
    const imp = readImpersonationCookies((name) => cookieStore.get(name)?.value);
    if (!imp.role || !isValidImpersonation("super_admin", imp.from, imp.role)) {
      return NextResponse.json({ error: "No active impersonation" }, { status: 400 });
    }
    if (imp.role === "super_admin") {
      return NextResponse.json({ error: "Invalid impersonation state" }, { status: 400 });
    }

    const { mode } = await request.json().catch(() => ({}));
    if (mode !== IMP_MODE_RO && mode !== IMP_MODE_RW) {
      return NextResponse.json({ error: "mode must be 'ro' or 'rw'" }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, mode });
    response.cookies.set(IMP_MODE_COOKIE, mode, COOKIE_BASE);
    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await getSuperAdmin();
    if (check.error || !check.user) return check.error!;

    const cookieStore = await cookies();
    const imp = readImpersonationCookies((name) => cookieStore.get(name)?.value);
    if (!imp.role || !isValidImpersonation("super_admin", imp.from, imp.role)) {
      return NextResponse.json({ success: true, message: "No active impersonation" });
    }

    const { signOutTarget } = await request.json().catch(() => ({}));
    const admin = createAdminClient();

    if (imp.sid) {
      await audit(admin, {
        user_id: check.user.id,
        action: "IMPERSONATE_END",
        table_name: "profiles",
        record_id: null,
        new_data: {
          sid: imp.sid,
          ended_role: imp.role,
          signed_out_target: Boolean(signOutTarget),
        },
      });
    }

    if (signOutTarget) {
      // Per-user session invalidation requires the target's JWT, which the
      // service-role SDK cannot obtain without a client session. Audited above;
      // admin.user.updateUserById(uid, { … }) on a managed lockout could be used.
    }

    const response = NextResponse.json({ success: true, redirectTo: "/super-admin" });
    clearImpersonationCookies(response);
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

    const { data: profile } = await supabase.from("profiles").select("role, full_name, id").eq("id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cookieStore = await cookies();
    const imp = readImpersonationCookies((name) => cookieStore.get(name)?.value);
    const active = isValidImpersonation(profile.role, imp.from, imp.role);

    let targetName: string | null = null;
    let targetEmail: string | null = null;
    if (active && imp.uid) {
      const admin = createAdminClient();
      const { data: target } = await admin
        .from("profiles")
        .select("full_name, email")
        .eq("id", imp.uid)
        .maybeSingle();
      targetName = target?.full_name ?? null;
      targetEmail = target?.email ?? null;
    }

    return NextResponse.json({
      active,
      role: active ? imp.role : null,
      from: active ? imp.from : null,
      uid: active ? imp.uid ?? null : null,
      mode: active ? imp.mode ?? "rw" : null,
      realRole: profile.role,
      realName: profile.full_name,
      targetName,
      targetEmail,
      expiresAt: active ? Date.now() + IMP_DEFAULT_MAX_AGE_SECONDS * 1000 : null,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}