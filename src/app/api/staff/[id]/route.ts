import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { full_name, phone, role, specialization, email } = await request.json();

    const admin = createAdminClient();

    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      email: email || undefined,
      user_metadata: {
        full_name,
        phone,
        role,
        specialization: specialization || null,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const { error: profileError } = await admin.from("profiles").update({
      full_name,
      phone: phone || null,
      role,
      specialization: specialization || null,
      email: email || null,
    }).eq("id", id);

    if (profileError) {
      return NextResponse.json({ error: "Auth updated but profile failed: " + profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Staff updated successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const admin = createAdminClient();

    const { error } = await admin.auth.admin.deleteUser(id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Staff deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
