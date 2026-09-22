import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 11, fontFamily: "Helvetica" },
  header: { textAlign: "center", marginBottom: 30, borderBottomWidth: 2, borderBottomColor: "#0f766e", paddingBottom: 15 },
  hospitalName: { fontSize: 20, fontWeight: "bold", color: "#0f766e" },
  subtitle: { fontSize: 9, color: "#64748b", marginTop: 3 },
  title: { fontSize: 16, fontWeight: "bold", textAlign: "center", marginVertical: 25, textDecoration: "underline", color: "#1e293b" },
  content: { marginBottom: 30, lineHeight: 1.8 },
  patientRow: { flexDirection: "row", gap: 20, marginBottom: 5 },
  label: { fontWeight: "bold", color: "#334155" },
  signature: { position: "absolute", bottom: 60, right: 50, textAlign: "right" },
  signatureLine: { width: 180, borderTopWidth: 1, borderTopColor: "#94a3b8", marginTop: 30, paddingTop: 5 },
  footer: { position: "absolute", bottom: 40, left: 50, right: 50, fontSize: 8, color: "#94a3b8", textAlign: "center", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8 },
});

interface CertificatePDFProps {
  hospitalName: string;
  hospitalAddress: string;
  certificateType: string;
  patientName: string;
  patientUHID: string;
  patientAge: string;
  patientGender: string;
  diagnosis: string;
  content: string;
  fromDate?: string;
  toDate?: string;
  doctorName: string;
  doctorSpecialization: string;
  date: string;
}

const TITLES: Record<string, string> = {
  fitness: "MEDICAL FITNESS CERTIFICATE",
  sick_leave: "SICK LEAVE CERTIFICATE",
  discharge: "DISCHARGE SUMMARY",
  referral: "REFERRAL LETTER",
  death: "DEATH CERTIFICATE",
};

export function CertificatePDF(props: CertificatePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.hospitalName}>{props.hospitalName}</Text>
          <Text style={styles.subtitle}>{props.hospitalAddress}</Text>
        </View>

        <Text style={styles.title}>{TITLES[props.certificateType] || "MEDICAL CERTIFICATE"}</Text>

        <View style={styles.content}>
          <View style={styles.patientRow}>
            <Text><Text style={styles.label}>Name: </Text>{props.patientName}</Text>
            <Text><Text style={styles.label}>UHID: </Text>{props.patientUHID}</Text>
          </View>
          <View style={styles.patientRow}>
            <Text><Text style={styles.label}>Age/Gender: </Text>{props.patientAge} / {props.patientGender}</Text>
            <Text><Text style={styles.label}>Date: </Text>{props.date}</Text>
          </View>
          {props.diagnosis && (
            <View style={styles.patientRow}>
              <Text><Text style={styles.label}>Diagnosis: </Text>{props.diagnosis}</Text>
            </View>
          )}
          {props.fromDate && props.toDate && (
            <View style={styles.patientRow}>
              <Text><Text style={styles.label}>Period: </Text>{props.fromDate} to {props.toDate}</Text>
            </View>
          )}

          <Text style={{ marginTop: 20, lineHeight: 1.8 }}>{props.content}</Text>
        </View>

        <View style={styles.signature}>
          <Text style={styles.label}>Dr. {props.doctorName}</Text>
          <Text>{props.doctorSpecialization}</Text>
          <View style={styles.signatureLine}>
            <Text>Signature & Seal</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>This is a computer-generated certificate and is valid without physical signature.</Text>
        </View>
      </Page>
    </Document>
  );
}
