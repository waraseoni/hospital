import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

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
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 6, borderRadius: 2 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 4 },
  col1: { width: "40%" },
  col2: { width: "30%" },
  col3: { width: "30%" },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#64748b" },
});

interface LabReportPDFProps {
  hospitalName: string;
  hospitalAddress: string;
  patientName: string;
  patientUHID: string;
  testName: string;
  testData: Record<string, string>;
  normalRanges: Record<string, string>;
  date: string;
  notes: string;
}

export function LabReportPDF({
  hospitalName, hospitalAddress, patientName, patientUHID, testName, testData, normalRanges, date, notes,
}: LabReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.hospitalName}>{hospitalName}</Text>
          <Text style={styles.subtitle}>{hospitalAddress}</Text>
          <Text style={styles.subtitle}>Laboratory Report</Text>
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
            <Text style={styles.label}>Test</Text>
            <Text style={styles.value}>{testName}</Text>
          </View>
          <View>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, { fontWeight: "bold", color: "#0f766e" }]}>Parameter</Text>
            <Text style={[styles.col2, { fontWeight: "bold", color: "#0f766e" }]}>Result</Text>
            <Text style={[styles.col3, { fontWeight: "bold", color: "#0f766e" }]}>Normal Range</Text>
          </View>
          {Object.entries(testData).map(([key, value], i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.col1}>{key}</Text>
              <Text style={styles.col2}>{value}</Text>
              <Text style={styles.col3}>{normalRanges[key] || "—"}</Text>
            </View>
          ))}
        </View>

        {notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>This is a computer-generated report</Text>
          <Text>{hospitalName}</Text>
        </View>
      </Page>
    </Document>
  );
}
