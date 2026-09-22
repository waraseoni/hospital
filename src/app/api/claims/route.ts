import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function genClaimNumber() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CLM-${date}-${rand}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { invoice_id, panel_id = null, insurer_code = "", policy_no = "", amount, notes = "" } = await request.json();

    if (!invoice_id || !insurer_code) {
      return NextResponse.json({ error: "invoice_id and insurer_code required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: invoice } = await admin
      .from("invoices")
      .select("id, net_amount")
      .eq("id", invoice_id)
      .single();
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const { data: existing } = await admin
      .from("claims")
      .select("id")
      .eq("invoice_id", invoice_id)
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Claim already exists for this invoice" }, { status: 400 });
    }

    const { data: claim, error } = await admin.from("claims").insert({
      claim_number: genClaimNumber(),
      invoice_id,
      panel_id,
      insurer_code,
      policy_no,
      amount: amount !== undefined ? Number(amount) : Number(invoice.net_amount),
      notes,
      status: "draft",
      stage: "intimation",
      created_by: user.id,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, claim });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("claims")
      .select("*, invoice:invoices(invoice_number, net_amount, payment_status, patient:patients(name, uhid)), panel:insurance_panels(name, code)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ claims: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
