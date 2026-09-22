import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoiceId = request.nextUrl.searchParams.get("invoice_id");
    const amount = request.nextUrl.searchParams.get("amount") || "0";

    const admin = createAdminClient();
    const { data: settings } = await admin.from("settings").select("upi_id, hospital_name").limit(1).single();

    const upiId = settings?.upi_id || "";
    if (!upiId) return NextResponse.json({ upi_uri: "", upi_id: "" });

    const payee = encodeURIComponent(upiId);
    const name = encodeURIComponent(settings?.hospital_name || "Hospital");
    const amt = encodeURIComponent(Number(amount).toFixed(2));
    const txn = encodeURIComponent(invoiceId || `TXN-${Date.now()}`);

    const upiUri = `upi://pay?pa=${payee}&pn=${name}&am=${amt}&cu=INR&tn=${txn}`;

    return NextResponse.json({ upi_uri: upiUri, upi_id: upiId });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
