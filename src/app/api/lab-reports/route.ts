import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { LabReportPDF } from "@/lib/pdf/lab-report";
import { sendLabReportToPatient } from "@/lib/whatsapp/client";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { report_id } = body;

    const { data: report } = await supabase
      .from("lab_reports")
      .select("*, patient:patients(name, uhid, phone)")
      .eq("id", report_id)
      .single();

    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const { data: settings } = await supabase.from("settings").select("*").limit(1).single();
    const hospitalName = settings?.hospital_name || "Hospital Management System";
    const hospitalAddress = settings?.hospital_address || "Medical Center, City";

    const pdfBuffer = await renderToBuffer(
      LabReportPDF({
        hospitalName,
        hospitalAddress,
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

    if (report.patient.phone && settings?.whatsapp_number) {
      sendLabReportToPatient(
        report.patient.phone,
        report.patient.name,
        report.test_name,
        urlData.publicUrl,
        hospitalName
      ).catch(() => {});
    }

    return NextResponse.json({ pdf_url: urlData.publicUrl, success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
