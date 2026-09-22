import { NextResponse } from "next/server";
import type { UserRole } from "@/types/database";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { readImpersonationCookies, resolveEffectiveRole } from "./role";

type RequireRoleResult =
  | {
      error: NextResponse;
      user: null;
      profile: null;
      effectiveRole: null;
    }
  | {
      error: null;
      user: { id: string };
      profile: { id: string; role: UserRole; full_name: string | null };
      effectiveRole: UserRole;
    };

export async function requireRole(allowed: UserRole[]): Promise<RequireRoleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
      profile: null,
      effectiveRole: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
      profile: null,
      effectiveRole: null,
    };
  }

  const cookieStore = await cookies();
  const imp = readImpersonationCookies((name) => cookieStore.get(name)?.value);
  const effectiveRole = resolveEffectiveRole(profile.role, imp.from, imp.role);

  if (!allowed.includes(effectiveRole)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null,
      profile: null,
      effectiveRole: null,
    };
  }

  return { error: null, user, profile, effectiveRole };
}
