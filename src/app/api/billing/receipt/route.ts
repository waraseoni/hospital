import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/lib/pdf/invoice";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { invoice_id, kind = "invoice" } = body;
    if (!invoice_id) return NextResponse.json({ error: "invoice_id required" }, { status: 400 });

    const admin = createAdminClient();
    const { data: invoice } = await admin
      .from("invoices")
      .select("*, patient:patients(name, uhid), payments:payments(amount, method, paid_at)")
      .eq("id", invoice_id)
      .single();

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const { data: settings } = await admin.from("settings").select("*").limit(1).single();

    const lastPayment = (invoice.payments || []).slice(-1)[0];

    const pdfBuffer = await renderToBuffer(
      InvoicePDF({
        hospitalName: settings?.hospital_name || "Hospital Management System",
        hospitalAddress: settings?.hospital_address || "",
        invoiceNumber: invoice.invoice_number,
        patientName: invoice.patient?.name || "Walk-in",
        patientUHID: invoice.patient?.uhid || "—",
        date: new Date(invoice.created_at).toLocaleDateString("en-IN"),
        lineItems: invoice.line_items || [],
        totalAmount: Number(invoice.total_amount),
        discount: Number(invoice.discount),
        tax: Number(invoice.tax),
        netAmount: Number(invoice.net_amount),
        paymentStatus: invoice.payment_status,
        paymentMethod: lastPayment?.method || invoice.payment_method || "",
        upiId: settings?.upi_id || "",
        receiptFooter: settings?.receipt_footer || "",
        kind: kind === "receipt" ? "receipt" : "invoice",
      })
    );

    const prefix = kind === "receipt" ? "receipt" : "invoice";
    const fileName = `${prefix}-${invoice.invoice_number}-${Date.now()}.pdf`;
    const { data: uploadData } = await supabase.storage
      .from("invoices")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (!uploadData) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

    const { data: urlData } = supabase.storage.from("invoices").getPublicUrl(uploadData.path);

    if (kind !== "receipt") {
      await admin.from("invoices").update({ pdf_url: urlData.publicUrl }).eq("id", invoice_id);
    }

    return NextResponse.json({ pdf_url: urlData.publicUrl, success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
