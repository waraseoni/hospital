import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, password } = await request.json();

    if (!full_name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Create user with admin role
    const { data, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: "admin",
        phone: "",
      },
    });

    if (createError) {
      return NextResponse.json({
        error: createError.message,
        code: createError.code,
      }, { status: 400 });
    }

    // Manually create profile (no trigger needed)
    const { error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: data.user.id,
        full_name,
        role: "admin",
        phone: null,
        email,
      }, { onConflict: "id" });

    if (profileError) {
      return NextResponse.json({
        error: "User created but profile failed: " + profileError.message,
        user_id: data.user.id,
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully",
      user_id: data.user.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
