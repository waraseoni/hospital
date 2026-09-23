import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return NextResponse.json({ error: "Only admins can create staff" }, { status: 403 });
    }

    const { full_name, email, password, phone, role, specialization } = await request.json();

    if (!full_name || !email || !password || !role) {
      return NextResponse.json({ error: "Name, email, password and role are required" }, { status: 400 });
    }

    // Only super_admin can create admin/super_admin accounts
    if ((role === "admin" || role === "super_admin") && profile.role !== "super_admin") {
      return NextResponse.json({ error: "Only super admin can create admin accounts" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      phone: phone || undefined,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        phone: phone || "",
        specialization: specialization || null,
      },
    });

    if (createError) {
      console.error("staff route createUser error:", {
        code: createError.code,
        message: createError.message,
        email,
        role,
      });
      return NextResponse.json({ error: createError.message, code: createError.code }, { status: 400 });
    }

    // Create profile record (trigger was removed, so we do it manually)
    const { error: profileError } = await admin.from("profiles").upsert({
      id: data.user.id,
      full_name,
      role,
      phone: phone || null,
      email,
      specialization: specialization || null,
    }, { onConflict: "id" });

    if (profileError) {
      return NextResponse.json({ error: "User created but profile failed: " + profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `${role} account created successfully`,
      user_id: data.user.id,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
