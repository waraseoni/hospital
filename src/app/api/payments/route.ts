import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { invoice_id, amount, method = "cash", reference = "", notes = "" } = body;

    if (!invoice_id || !amount || amount <= 0) {
      return NextResponse.json({ error: "invoice_id and amount > 0 required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select("id, net_amount, payment_status")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const { data: payment, error: payErr } = await admin.from("payments").insert({
      invoice_id,
      amount: Number(amount),
      method,
      reference,
      notes,
      received_by: user.id,
    }).select().single();

    if (payErr) return NextResponse.json({ error: payErr.message }, { status: 400 });

    const { data: totalPaid } = await admin
      .from("payments")
      .select("amount")
      .eq("invoice_id", invoice_id);

    const paid = (totalPaid || []).reduce((s, p) => s + Number(p.amount), 0);
    const net = Number(invoice.net_amount);
    let status: "pending" | "paid" | "partial" = "pending";
    if (paid >= net) status = "paid";
    else if (paid > 0) status = "partial";

    await admin.from("invoices").update({
      payment_status: status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      payment_method: method === "other" ? null : method,
    }).eq("id", invoice_id);

    return NextResponse.json({ success: true, payment, payment_status: status, total_paid: paid });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoiceId = request.nextUrl.searchParams.get("invoice_id");
    const admin = createAdminClient();
    let q = admin.from("payments").select("*").order("paid_at", { ascending: false }).limit(100);
    if (invoiceId) q = q.eq("invoice_id", invoiceId);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ payments: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
