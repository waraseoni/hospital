import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { PrescriptionPDF } from "@/lib/pdf/prescription";
import { sendPrescriptionToPatient } from "@/lib/whatsapp/client";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { prescription_id } = body;

    const { data: prescription } = await supabase
      .from("prescriptions")
      .select("*, patient:patients(name, uhid, dob, gender, phone), doctor:profiles(full_name, specialization)")
      .eq("id", prescription_id)
      .single();

    if (!prescription) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });

    const { data: settings } = await supabase.from("settings").select("*").limit(1).single();
    const hospitalName = settings?.hospital_name || "Hospital Management System";
    const hospitalAddress = settings?.hospital_address || "Medical Center, City";

    const age = new Date().getFullYear() - new Date(prescription.patient.dob).getFullYear();

    const pdfBuffer = await renderToBuffer(
      PrescriptionPDF({
        hospitalName,
        hospitalAddress,
        patientName: prescription.patient.name,
        patientUHID: prescription.patient.uhid,
        patientAge: String(age),
        patientGender: prescription.patient.gender,
        doctorName: prescription.doctor.full_name,
        doctorSpecialization: prescription.doctor.specialization || "",
        diagnosis: prescription.diagnosis,
        symptoms: prescription.symptoms || "",
        medicines: prescription.medicines,
        notes: prescription.notes || "",
        date: new Date(prescription.created_at).toLocaleDateString("en-IN"),
      })
    );

    const fileName = `prescription-${prescription.patient.uhid}-${Date.now()}.pdf`;
    const { data: uploadData } = await supabase.storage
      .from("prescriptions")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf" });

    if (!uploadData) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

    const { data: urlData } = supabase.storage.from("prescriptions").getPublicUrl(uploadData.path);

    await supabase
      .from("prescriptions")
      .update({ pdf_url: urlData.publicUrl })
      .eq("id", prescription_id);

    if (prescription.patient.phone && settings?.whatsapp_number) {
      sendPrescriptionToPatient(
        prescription.patient.phone,
        prescription.patient.name,
        prescription.doctor.full_name,
        urlData.publicUrl
      ).catch(() => {});
    }

    return NextResponse.json({ pdf_url: urlData.publicUrl, success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
