import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/lib/pdf/invoice";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { invoice_id } = body;

    const { data: invoice } = await supabase
      .from("invoices")
      .select("*, patient:patients(name, uhid)")
      .eq("id", invoice_id)
      .single();

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const { data: settings } = await supabase.from("settings").select("*").limit(1).single();
    const hospitalName = settings?.hospital_name || "Hospital Management System";
    const hospitalAddress = settings?.hospital_address || "Medical Center, City";

    const pdfBuffer = await renderToBuffer(
      InvoicePDF({
        hospitalName,
        hospitalAddress,
        invoiceNumber: invoice.invoice_number,
        patientName: invoice.patient.name,
        patientUHID: invoice.patient.uhid,
        date: new Date(invoice.created_at).toLocaleDateString("en-IN"),
        lineItems: invoice.line_items,
        totalAmount: invoice.total_amount,
        discount: invoice.discount,
        tax: invoice.tax,
        netAmount: invoice.net_amount,
        paymentStatus: invoice.payment_status,
      })
    );

    const fileName = `invoice-${invoice.invoice_number}-${Date.now()}.pdf`;
    const { data: uploadData } = await supabase.storage
      .from("invoices")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf" });

    if (!uploadData) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

    const { data: urlData } = supabase.storage.from("invoices").getPublicUrl(uploadData.path);

    await supabase
      .from("invoices")
      .update({ pdf_url: urlData.publicUrl })
      .eq("id", invoice_id);

    return NextResponse.json({ pdf_url: urlData.publicUrl, success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
