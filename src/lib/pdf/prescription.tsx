import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { textAlign: "center", marginBottom: 20, borderBottomWidth: 2, borderBottomColor: "#0f766e", paddingBottom: 10 },
  hospitalName: { fontSize: 18, fontWeight: "bold", color: "#0f766e" },
  subtitle: { fontSize: 8, color: "#64748b", marginTop: 2 },
  patientRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15, padding: 10, backgroundColor: "#f8fafc", borderRadius: 4 },
  label: { fontSize: 8, color: "#64748b", marginBottom: 2 },
  value: { fontSize: 10, fontWeight: "bold" },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#0f766e", marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4 },
  medicineRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 4 },
  medicineCol1: { width: "30%", fontWeight: "bold" },
  medicineCol2: { width: "25%" },
  medicineCol3: { width: "20%" },
  medicineCol4: { width: "15%" },
  medicineCol5: { width: "10%" },
  note: { fontSize: 9, color: "#64748b", fontStyle: "italic", marginTop: 10 },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#64748b" },
  signature: { textAlign: "right", marginTop: 40 },
  signatureBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 30 },
  signatureImg: { width: 90, height: 40, objectFit: "contain", marginLeft: "auto", marginBottom: 2 },
  qr: { width: 64, height: 64 },
  verificationNote: { fontSize: 7, color: "#94a3b8", marginTop: 2, width: 64 },
});

interface PrescriptionPDFProps {
  hospitalName: string;
  hospitalAddress: string;
  patientName: string;
  patientUHID: string;
  patientAge: string;
  patientGender: string;
  doctorName: string;
  doctorSpecialization: string;
  diagnosis: string;
  symptoms: string;
  medicines: { name: string; dosage: string; frequency: string; duration: string; instructions: string }[];
  notes: string;
  date: string;
  signatureDataUrl?: string;
  qrDataUrl?: string;
  licenseNumber?: string;
}

export function PrescriptionPDF({
  hospitalName, hospitalAddress, patientName, patientUHID, patientAge, patientGender,
  doctorName, doctorSpecialization, diagnosis, symptoms, medicines, notes, date,
  signatureDataUrl, qrDataUrl, licenseNumber,
}: PrescriptionPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.hospitalName}>{hospitalName}</Text>
          <Text style={styles.subtitle}>{hospitalAddress}</Text>
          <Text style={styles.subtitle}>Prescription</Text>
        </View>

        <View style={styles.patientRow}>
          <View>
            <Text style={styles.label}>Patient Name</Text>
            <Text style={styles.value}>{patientName}</Text>
          </View>
          <View>
            <Text style={styles.label}>UHID</Text>
            <Text style={styles.value}>{patientUHID}</Text>
          </View>
          <View>
            <Text style={styles.label}>Age / Gender</Text>
            <Text style={styles.value}>{patientAge} / {patientGender}</Text>
          </View>
          <View>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnosis</Text>
          <Text>{diagnosis}</Text>
        </View>

        {symptoms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Symptoms</Text>
            <Text>{symptoms}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prescription</Text>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#0f766e", paddingBottom: 4, marginBottom: 4 }}>
            <Text style={[styles.medicineCol1, { color: "#0f766e" }]}>Medicine</Text>
            <Text style={[styles.medicineCol2, { color: "#0f766e" }]}>Dosage</Text>
            <Text style={[styles.medicineCol3, { color: "#0f766e" }]}>Frequency</Text>
            <Text style={[styles.medicineCol4, { color: "#0f766e" }]}>Duration</Text>
            <Text style={[styles.medicineCol5, { color: "#0f766e" }]}>Note</Text>
          </View>
          {medicines.map((med, i) => (
            <View key={i} style={styles.medicineRow}>
              <Text style={styles.medicineCol1}>{med.name}</Text>
              <Text style={styles.medicineCol2}>{med.dosage}</Text>
              <Text style={styles.medicineCol3}>{med.frequency}</Text>
              <Text style={styles.medicineCol4}>{med.duration}</Text>
              <Text style={styles.medicineCol5}>{med.instructions}</Text>
            </View>
          ))}
        </View>

        {notes && <Text style={styles.note}>Note: {notes}</Text>}

        <View style={styles.signatureBlock}>
          {qrDataUrl && (
            <View>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={qrDataUrl} style={styles.qr} />
              <Text style={styles.verificationNote}>Scan to verify authenticity</Text>
            </View>
          )}
          <View style={styles.signature}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {signatureDataUrl && <Image src={signatureDataUrl} style={styles.signatureImg} />}
            <Text style={{ fontWeight: "bold" }}>Dr. {doctorName}</Text>
            <Text style={{ fontSize: 8, color: "#64748b" }}>{doctorSpecialization}</Text>
            {licenseNumber && <Text style={{ fontSize: 7, color: "#64748b" }}>Reg. {licenseNumber}</Text>}
          </View>
        </View>

        <View style={styles.footer}>
          <Text>This is a computer-generated prescription</Text>
          <Text>{hospitalName}</Text>
        </View>
      </Page>
    </Document>
  );
}
