import { createClient } from "@/lib/supabase/admin";
import { whatsappTemplates } from "./templates";

const WHATSAPP_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const GRAPH_VERSION = "v21.0";

interface SendWhatsAppParams {
  to: string;
  recipientName?: string;
  messageType: string;
  messageBody: string;
  pdfLink?: string;
}

function toE164(to: string): string {
  const digits = to.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
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
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${WHATSAPP_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toE164(to),
          type: "text",
          text: {
            body: messageBody,
            preview_url: true,
          },
        }),
      }
    );

    const result = await response.json();

    if (response.ok && result.messages?.[0]?.id) {
      await supabase
        .from("whatsapp_logs")
        .update({
          status: "sent",
          external_message_id: result.messages[0].id,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logEntry?.id);
      return { success: true, sid: result.messages[0].id };
    } else {
      throw new Error(result.error?.message || "Failed to send WhatsApp message");
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

export async function sendAppointmentReminder(
  patientPhone: string,
  patientName: string,
  doctorName: string,
  date: string
) {
  const message = whatsappTemplates.appointmentReminder({
    patientName, doctorName, date,
  });

  return sendWhatsAppMessage({
    to: patientPhone,
    recipientName: patientName,
    messageType: "appointment_reminder",
    messageBody: message,
  });
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
