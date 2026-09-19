import { createClient } from "@/lib/supabase/admin";
import { whatsappTemplates } from "./templates";

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM;

interface SendWhatsAppParams {
  to: string;
  recipientName?: string;
  messageType: string;
  messageBody: string;
  pdfLink?: string;
}

export async function sendWhatsAppMessage({
  to, recipientName, messageType, messageBody, pdfLink,
}: SendWhatsAppParams) {
  const supabase = createClient();

  const { data: logEntry } = await supabase
    .from("whatsapp_logs")
    .insert({
      recipient_phone: to,
      recipient_name: recipientName || null,
      message_type: messageType,
      message_body: messageBody,
      pdf_link: pdfLink || null,
      status: "pending",
    })
    .select("id")
    .single();

  try {
    const formattedTo = to.startsWith("+") ? `whatsapp:${to}` : `whatsapp:+91${to}`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: TWILIO_FROM!,
          To: formattedTo,
          Body: messageBody,
        }).toString(),
      }
    );

    const result = await response.json();

    if (response.ok) {
      await supabase
        .from("whatsapp_logs")
        .update({
          status: "sent",
          external_message_id: result.sid,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logEntry?.id);
      return { success: true, sid: result.sid };
    } else {
      throw new Error(result.message || "Failed to send WhatsApp message");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await supabase
      .from("whatsapp_logs")
      .update({ status: "failed", error_message: errorMessage })
      .eq("id", logEntry?.id);
    return { success: false, error: errorMessage };
  }
}

export async function sendAppointmentConfirmation(
  patientPhone: string,
  patientName: string,
  doctorName: string,
  date: string,
  tokenNo: number,
  hospitalName: string,
  hospitalAddress: string
) {
  const mapLink = `https://maps.google.com/?q=${encodeURIComponent(hospitalAddress)}`;
  const message = whatsappTemplates.appointmentConfirmation({
    patientName, doctorName, date, tokenNo: String(tokenNo),
    hospitalName, hospitalAddress, mapLink, contactNumber: hospitalAddress,
  });

  return sendWhatsAppMessage({
    to: patientPhone,
    recipientName: patientName,
    messageType: "appointment_confirmation",
    messageBody: message,
  });
}

export async function sendPrescriptionToPatient(
  patientPhone: string,
  patientName: string,
  doctorName: string,
  pdfLink: string
) {
  const message = whatsappTemplates.prescriptionDispatch({
    patientName, doctorName, pdfLink,
  });

  return sendWhatsAppMessage({
    to: patientPhone,
    recipientName: patientName,
    messageType: "prescription",
    messageBody: message,
    pdfLink,
  });
}

export async function sendLabReportToPatient(
  patientPhone: string,
  patientName: string,
  testName: string,
  pdfLink: string,
  hospitalName: string
) {
  const message = whatsappTemplates.labReportDelivery({
    patientName, testName, pdfLink, hospitalName,
  });

  return sendWhatsAppMessage({
    to: patientPhone,
    recipientName: patientName,
    messageType: "lab_report",
    messageBody: message,
    pdfLink,
  });
}
