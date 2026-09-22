import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      patient_id,
      package_id = null,
      line_items = [],
      discount = 0,
      tax = 0,
      payment_method = null,
      payment_status = "pending",
      notes = "",
    } = body;

    if (!patient_id) return NextResponse.json({ error: "patient_id required" }, { status: 400 });

    const admin = createAdminClient();
    let items = line_items;
    let pkgDiscount = Number(discount) || 0;
    let pkgName = "";

    if (package_id) {
      const { data: pkg } = await admin.from("packages").select("*").eq("id", package_id).single();
      if (pkg) {
        pkgName = pkg.name;
        items = (pkg.services || []).map((s: { description: string; category: string; amount: number; quantity: number }) => ({
          description: s.description,
          category: s.category,
          amount: Number(s.amount),
          quantity: Number(s.quantity || 1),
        }));
        if (pkgDiscount === 0) pkgDiscount = Number(pkg.discount_percent) || 0;
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "line_items or package required" }, { status: 400 });
    }

    const subtotal = items.reduce((sum: number, it: { amount: number; quantity: number }) => {
      return sum + Number(it.amount || 0) * Number(it.quantity || 1);
    }, 0);
    const discountAmt = subtotal * pkgDiscount / 100;
    const taxable = subtotal - discountAmt;
    const taxAmt = taxable * (Number(tax) || 0) / 100;
    const net = taxable + taxAmt;

    const d = new Date();
    const date = d.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${date}-${rand}`;

    const finalItems = pkgName
      ? [...items, ...(notes ? [] : [])]
      : items;

    const { data: invoice, error } = await admin.from("invoices").insert({
      patient_id,
      invoice_number: invoiceNumber,
      line_items: finalItems,
      total_amount: subtotal,
      discount: discountAmt,
      tax: taxAmt,
      net_amount: net,
      payment_status,
      payment_method: payment_method === "other" ? null : payment_method,
      notes: pkgName ? `Package: ${pkgName}` : notes,
      created_by: user.id,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, invoice });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const statusParam = request.nextUrl.searchParams.get("status");
    const admin = createAdminClient();
    let q = admin
      .from("invoices")
      .select("*, patient:patients(name, uhid), payments:payments(amount, method, paid_at)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (statusParam) q = q.eq("payment_status", statusParam);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ invoices: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
