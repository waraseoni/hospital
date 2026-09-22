import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const STAGES = ["intimation", "preauth", "claim", "settled", "rejected"] as const;
const STATUSES = ["draft", "submitted", "approved", "paid", "rejected"] as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { stage, status, approval_no, policy_no, notes } = body;

    const update: Record<string, unknown> = {};
    if (stage !== undefined) {
      if (!STAGES.includes(stage)) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
      update.stage = stage;
    }
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      update.status = status;
    }
    if (approval_no !== undefined) update.approval_no = approval_no;
    if (policy_no !== undefined) update.policy_no = policy_no;
    if (notes !== undefined) update.notes = notes;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.from("claims").update(update).eq("id", id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, claim: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
