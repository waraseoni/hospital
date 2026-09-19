import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { textAlign: "center", marginBottom: 20, borderBottomWidth: 2, borderBottomColor: "#0f766e", paddingBottom: 10 },
  hospitalName: { fontSize: 18, fontWeight: "bold", color: "#0f766e" },
  subtitle: { fontSize: 8, color: "#64748b", marginTop: 2 },
  patientRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15, padding: 10, backgroundColor: "#f8fafc", borderRadius: 4 },
  label: { fontSize: 8, color: "#64748b", marginBottom: 2 },
  value: { fontSize: 10, fontWeight: "bold" },
  sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#0f766e", marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 6, borderRadius: 2 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 4 },
  col1: { width: "45%" },
  col2: { width: "15%" },
  col3: { width: "15%" },
  col4: { width: "25%", textAlign: "right" },
  totals: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#0f766e", paddingTop: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#64748b" },
});

interface InvoicePDFProps {
  hospitalName: string;
  hospitalAddress: string;
  invoiceNumber: string;
  patientName: string;
  patientUHID: string;
  date: string;
  lineItems: { description: string; category: string; amount: number; quantity: number }[];
  totalAmount: number;
  discount: number;
  tax: number;
  netAmount: number;
  paymentStatus: string;
}

export function InvoicePDF({
  hospitalName, hospitalAddress, invoiceNumber, patientName, patientUHID, date,
  lineItems, totalAmount, discount, tax, netAmount, paymentStatus,
}: InvoicePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.hospitalName}>{hospitalName}</Text>
          <Text style={styles.subtitle}>{hospitalAddress}</Text>
          <Text style={styles.subtitle}>Invoice / Receipt</Text>
        </View>

        <View style={styles.patientRow}>
          <View>
            <Text style={styles.label}>Invoice No.</Text>
            <Text style={styles.value}>{invoiceNumber}</Text>
          </View>
          <View>
            <Text style={styles.label}>Patient</Text>
            <Text style={styles.value}>{patientName}</Text>
          </View>
          <View>
            <Text style={styles.label}>UHID</Text>
            <Text style={styles.value}>{patientUHID}</Text>
          </View>
          <View>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 15 }}>
          <Text style={styles.sectionTitle}>Charges</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, { fontWeight: "bold", color: "#0f766e" }]}>Description</Text>
            <Text style={[styles.col2, { fontWeight: "bold", color: "#0f766e" }]}>Qty</Text>
            <Text style={[styles.col3, { fontWeight: "bold", color: "#0f766e" }]}>Rate</Text>
            <Text style={[styles.col4, { fontWeight: "bold", color: "#0f766e" }]}>Amount</Text>
          </View>
          {lineItems.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.col1}>{item.description}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>₹{item.amount}</Text>
              <Text style={styles.col4}>₹{item.amount * item.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>₹{totalAmount}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>-₹{discount}</Text>
            </View>
          )}
          {tax > 0 && (
            <View style={styles.totalRow}>
              <Text>Tax</Text>
              <Text>₹{tax}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { fontWeight: "bold", fontSize: 12 }]}>
            <Text>Net Amount</Text>
            <Text style={{ color: "#0f766e" }}>₹{netAmount}</Text>
          </View>
        </View>

        <View style={{ marginTop: 15, padding: 10, backgroundColor: paymentStatus === "paid" ? "#f0fdf4" : "#fef3c7", borderRadius: 4 }}>
          <Text style={{ fontWeight: "bold", color: paymentStatus === "paid" ? "#16a34a" : "#d97706" }}>
            Payment Status: {paymentStatus.toUpperCase()}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>Thank you for choosing {hospitalName}</Text>
          <Text>This is a computer-generated invoice</Text>
        </View>
      </Page>
    </Document>
  );
}
