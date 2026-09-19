import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendAppointmentConfirmation, sendPrescriptionToPatient, sendLabReportToPatient } from "@/lib/whatsapp/client";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { type, patient_id, appointment_id, prescription_id, report_id } = body;

    switch (type) {
      case "appointment_confirmation": {
        const { data: appointment } = await supabase
          .from("appointments")
          .select("*, patient:patients(name, phone, uhid), doctor:profiles(full_name)")
          .eq("id", appointment_id)
          .single();

        if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

        const result = await sendAppointmentConfirmation(
          appointment.patient.phone,
          appointment.patient.name,
          appointment.doctor.full_name,
          new Date(appointment.date_slot).toLocaleDateString("en-IN"),
          appointment.token_no,
          "Hospital Management System",
          "Medical Center, City"
        );
        return NextResponse.json(result);
      }

      case "prescription": {
        const { data: prescription } = await supabase
          .from("prescriptions")
          .select("*, patient:patients(name, phone), doctor:profiles(full_name)")
          .eq("id", prescription_id)
          .single();

        if (!prescription) return NextResponse.json({ error: "Prescription not found" }, { status: 404 });

        const result = await sendPrescriptionToPatient(
          prescription.patient.phone,
          prescription.patient.name,
          prescription.doctor.full_name,
          prescription.pdf_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/prescriptions`
        );
        return NextResponse.json(result);
      }

      case "lab_report": {
        const { data: report } = await supabase
          .from("lab_reports")
          .select("*, patient:patients(name, phone)")
          .eq("id", report_id)
          .single();

        if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

        const result = await sendLabReportToPatient(
          report.patient.phone,
          report.patient.name,
          report.test_name,
          report.pdf_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/lab-reports`,
          "Hospital Management System"
        );
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
