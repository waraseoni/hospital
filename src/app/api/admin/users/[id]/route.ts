import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getSuperAdminOr403() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "super_admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { error: null };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await getSuperAdminOr403();
  if (check.error) return check.error;
  const { id } = await params;
  const { role, is_active } = await request.json();
  const admin = createAdminClient();

  const { error: authError } = await admin.auth.admin.updateUserById(id, { user_metadata: { role } });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const { error: profileError } = await admin.from("profiles").update({ role, is_active: is_active ?? true }).eq("id", id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await getSuperAdminOr403();
  if (check.error) return check.error;
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const check = await getSuperAdminOr403();
  if (check.error) return check.error;
  const { id } = await params;
  const { newPassword } = await request.json();
  if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password: newPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, message: "Password reset successfully" });
}
