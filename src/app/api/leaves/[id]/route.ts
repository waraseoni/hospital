import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { status, approval_notes = "" } = await request.json();
    if (!STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin.from("leaves").update({
      status,
      approved_by: user.id,
      approval_notes,
    }).eq("id", id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, leave: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
