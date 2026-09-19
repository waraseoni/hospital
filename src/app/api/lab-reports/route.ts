import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { LabReportPDF } from "@/lib/pdf/lab-report";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { report_id } = body;

    const { data: report } = await supabase
      .from("lab_reports")
      .select("*, patient:patients(name, uhid)")
      .eq("id", report_id)
      .single();

    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const pdfBuffer = await renderToBuffer(
      LabReportPDF({
        hospitalName: "Hospital Management System",
        hospitalAddress: "Medical Center, City",
        patientName: report.patient.name,
        patientUHID: report.patient.uhid,
        testName: report.test_name,
        testData: report.test_data,
        normalRanges: report.normal_ranges || {},
        date: new Date(report.created_at).toLocaleDateString("en-IN"),
        notes: report.notes || "",
      })
    );

    const fileName = `lab-report-${report.patient.uhid}-${Date.now()}.pdf`;
    const { data: uploadData } = await supabase.storage
      .from("lab-reports")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf" });

    if (!uploadData) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

    const { data: urlData } = supabase.storage.from("lab-reports").getPublicUrl(uploadData.path);

    await supabase
      .from("lab_reports")
      .update({ pdf_url: urlData.publicUrl })
      .eq("id", report_id);

    return NextResponse.json({ pdf_url: urlData.publicUrl, success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
