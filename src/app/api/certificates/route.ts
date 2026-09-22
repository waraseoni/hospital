import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificatePDF } from "@/lib/pdf/certificate";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { certificate_id } = body;

    const { data: cert } = await supabase
      .from("medical_certificates")
      .select("*, patient:patients(name, uhid, dob, gender), doctor:profiles(full_name, specialization)")
      .eq("id", certificate_id)
      .single();

    if (!cert) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

    const { data: settings } = await supabase.from("settings").select("*").limit(1).single();
    const age = new Date().getFullYear() - new Date(cert.patient.dob).getFullYear();

    const pdfBuffer = await renderToBuffer(
      CertificatePDF({
        hospitalName: settings?.hospital_name || "Hospital Management System",
        hospitalAddress: settings?.hospital_address || "Medical Center, City",
        certificateType: cert.certificate_type,
        patientName: cert.patient.name,
        patientUHID: cert.patient.uhid,
        patientAge: String(age),
        patientGender: cert.patient.gender || "N/A",
        diagnosis: cert.diagnosis,
        content: cert.content,
        fromDate: cert.from_date,
        toDate: cert.to_date,
        doctorName: cert.doctor.full_name,
        doctorSpecialization: cert.doctor.specialization || "",
        date: new Date(cert.created_at).toLocaleDateString("en-IN"),
      })
    );

    const fileName = `certificate-${cert.patient.uhid}-${Date.now()}.pdf`;
    const { data: uploadData } = await supabase.storage
      .from("certificates")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf" });

    if (!uploadData) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

    const { data: urlData } = supabase.storage.from("certificates").getPublicUrl(uploadData.path);

    await supabase.from("medical_certificates").update({ pdf_url: urlData.publicUrl }).eq("id", certificate_id);

    return NextResponse.json({ pdf_url: urlData.publicUrl, success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
