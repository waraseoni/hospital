interface WhatsAppTemplateParams {
  [key: string]: string;
}

export const whatsappTemplates = {
  appointmentConfirmation: (params: WhatsAppTemplateParams) =>
    `🏥 *${params.hospitalName}*\n\n` +
    `Dear *${params.patientName}*,\n\n` +
    `Your appointment has been booked successfully!\n\n` +
    `📅 Date: ${params.date}\n` +
    `👨‍⚕️ Doctor: Dr. ${params.doctorName}\n` +
    `🔢 Token No: #${params.tokenNo}\n` +
    `📍 Location: ${params.hospitalAddress}\n\n` +
    `📍 Directions: ${params.mapLink}\n\n` +
    `Please arrive 15 minutes before your appointment.\n` +
    `For any changes, contact us at ${params.contactNumber}\n\n` +
    `Get well soon! 🙏`,

  appointmentReminder: (params: WhatsAppTemplateParams) =>
    `⏰ *Appointment Reminder*\n\n` +
    `Dear *${params.patientName}*,\n\n` +
    `This is a reminder for your upcoming appointment:\n\n` +
    `📅 Date: ${params.date}\n` +
    `👨‍⚕️ Doctor: Dr. ${params.doctorName}\n` +
    `🔢 Token No: #${params.tokenNo}\n\n` +
    `Please arrive 15 minutes early. See you soon!`,

  prescriptionDispatch: (params: WhatsAppTemplateParams) =>
    `📋 *Prescription Ready*\n\n` +
    `Dear *${params.patientName}*,\n\n` +
    `Your prescription from Dr. ${params.doctorName} is ready.\n\n` +
    `🔗 View/Download PDF: ${params.pdfLink}\n\n` +
    `Please share this with your pharmacist.\n` +
    `Get well soon! 🙏`,

  labReportDelivery: (params: WhatsAppTemplateParams) =>
    `🔬 *Lab Report Ready*\n\n` +
    `Dear *${params.patientName}*,\n\n` +
    `Your ${params.testName} report is ready.\n\n` +
    `🔗 View/Download Report: ${params.pdfLink}\n\n` +
    `Please consult your doctor for interpretation.\n` +
    `${params.hospitalName}`,

  billingReceipt: (params: WhatsAppTemplateParams) =>
    `💰 *Billing Receipt*\n\n` +
    `Dear *${params.patientName}*,\n\n` +
    `Invoice: ${params.invoiceNumber}\n` +
    `Amount: ₹${params.amount}\n` +
    `Status: ${params.paymentStatus}\n\n` +
    `🔗 View/Download Receipt: ${params.pdfLink}\n\n` +
    `Thank you for choosing ${params.hospitalName}! 🙏`,
};
