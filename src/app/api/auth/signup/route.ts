import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, password, phone, role, dob, gender, blood_group, address } = await request.json();

    if (!full_name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Only allow patient self-registration. Admin/super_admin must be created by existing admin/super_admin.
    const allowedRole = role || "patient";
    if (["admin", "super_admin"].includes(allowedRole)) {
      return NextResponse.json({ error: "Self-registration for admin roles is not allowed" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: role || "patient",
        phone: phone || "",
        dob: dob || "",
        gender: gender || "",
        blood_group: blood_group || "",
        address: address || "",
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Create profile record for patient
    await admin.from("profiles").upsert({
      id: data.user.id,
      full_name,
      role: allowedRole,
      phone: phone || null,
      email,
    }, { onConflict: "id" });

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user_id: data.user.id,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
