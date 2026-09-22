import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ReportType = "revenue" | "doctor" | "inventory" | "mis";

interface InvoiceRow {
  id: string;
  net_amount: number;
  total_amount: number;
  discount: number;
  tax: number;
  payment_status: string;
  line_items: { description: string; category: string; amount: number; quantity: number }[] | null;
  created_at: string;
  appointment?: {
    doctor_id?: string;
    doctor?: { full_name?: string; specialization?: string }[] | { full_name?: string; specialization?: string } | null;
  }[] | {
    doctor_id?: string;
    doctor?: { full_name?: string; specialization?: string }[] | { full_name?: string; specialization?: string } | null;
  } | null;
}

interface PaymentRow {
  amount: number;
  method: string;
  paid_at: string;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  let cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 400) {
    days.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getTime() + 86400000);
    guard++;
  }
  return days;
}

function unwrap<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const type = (params.get("type") || "revenue") as ReportType;
    const to = params.get("to") || new Date().toISOString().slice(0, 10);
    const fromDefault = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const from = params.get("from") || fromDefault;

    const admin = createAdminClient();
    const fromTs = `${from}T00:00:00`;
    const toTs = `${to}T23:59:59.999`;

    if (type === "revenue") {
      const [invRes, payRes] = await Promise.all([
        admin
          .from("invoices")
          .select("id, net_amount, total_amount, discount, tax, payment_status, line_items, created_at")
          .gte("created_at", fromTs)
          .lte("created_at", toTs)
          .neq("payment_status", "cancelled")
          .limit(5000),
        admin
          .from("payments")
          .select("amount, method, paid_at")
          .gte("paid_at", fromTs)
          .lte("paid_at", toTs)
          .limit(5000),
      ]);

      const invoices = (invRes.data || []) as InvoiceRow[];
      const payments = (payRes.data || []) as PaymentRow[];

      const categories = ["opd", "ipd", "lab", "pharmacy", "other"] as const;
      const byCategory: Record<string, number> = Object.fromEntries(categories.map((c) => [c, 0]));
      let totalBilled = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      const dailyMap: Record<string, { billed: number; collected: number; invoices: number }> = {};
      eachDay(from, to).forEach((d) => {
        dailyMap[d] = { billed: 0, collected: 0, invoices: 0 };
      });

      for (const inv of invoices) {
        totalBilled += Number(inv.net_amount) || 0;
        totalDiscount += Number(inv.discount) || 0;
        totalTax += Number(inv.tax) || 0;
        const d = dayKey(inv.created_at);
        if (dailyMap[d]) {
          dailyMap[d].billed += Number(inv.net_amount) || 0;
          dailyMap[d].invoices += 1;
        }
        for (const li of inv.line_items || []) {
          const cat = categories.includes(li.category as (typeof categories)[number]) ? li.category : "other";
          byCategory[cat] = (byCategory[cat] || 0) + Number(li.amount || 0) * Number(li.quantity || 1);
        }
      }

      let totalCollected = 0;
      const paymentMethods: Record<string, number> = {};
      for (const p of payments) {
        const amt = Number(p.amount) || 0;
        totalCollected += amt;
        paymentMethods[p.method || "other"] = (paymentMethods[p.method || "other"] || 0) + amt;
        const d = dayKey(p.paid_at);
        if (dailyMap[d]) dailyMap[d].collected += amt;
      }

      return NextResponse.json({
        type: "revenue",
        from,
        to,
        summary: {
          total_billed: totalBilled,
          total_collected: totalCollected,
          total_discount: totalDiscount,
          total_tax: totalTax,
          invoice_count: invoices.length,
          by_category: byCategory,
          payment_methods: paymentMethods,
        },
        daily: Object.entries(dailyMap).map(([date, v]) => ({ date, ...v })),
      });
    }

    if (type === "doctor") {
      const { data, error } = await admin
        .from("invoices")
        .select("id, net_amount, payment_status, created_at, appointment:appointments(doctor_id, doctor:profiles(full_name, specialization))")
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
        .neq("payment_status", "cancelled")
        .limit(5000);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      const invoices = (data || []) as unknown as InvoiceRow[];
      const map: Record<string, { doctor_id: string; doctor_name: string; specialization: string; invoice_count: number; total_billed: number }> = {};

      for (const inv of invoices) {
        const apt = unwrap(inv.appointment);
        const doctorId = apt?.doctor_id || "unassigned";
        const doc = unwrap(apt?.doctor);
        if (!map[doctorId]) {
          map[doctorId] = {
            doctor_id: doctorId,
            doctor_name: doc?.full_name || (doctorId === "unassigned" ? "Unassigned" : "Unknown"),
            specialization: doc?.specialization || "",
            invoice_count: 0,
            total_billed: 0,
          };
        }
        map[doctorId].invoice_count += 1;
        map[doctorId].total_billed += Number(inv.net_amount) || 0;
      }

      const doctors = Object.values(map).sort((a, b) => b.total_billed - a.total_billed);
      return NextResponse.json({
        type: "doctor",
        from,
        to,
        doctors,
        summary: {
          total_billed: doctors.reduce((s, d) => s + d.total_billed, 0),
          doctor_count: doctors.length,
          invoice_count: doctors.reduce((s, d) => s + d.invoice_count, 0),
        },
      });
    }

    if (type === "inventory") {
      const { data, error } = await admin
        .from("inventory_items")
        .select("id, name, category, quantity, unit, minimum_stock, price_per_unit, expiry_date, batch_number, supplier")
        .order("name")
        .limit(5000);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      const items = (data || []) as {
        id: string; name: string; category: string; quantity: number; unit: string;
        minimum_stock: number; price_per_unit: number; expiry_date: string | null;
        batch_number: string | null; supplier: string | null;
      }[];

      const now = Date.now();
      const in30 = now + 30 * 86400000;
      const totalValue = items.reduce((s, i) => s + Number(i.quantity) * Number(i.price_per_unit), 0);
      const lowStock = items.filter((i) => i.quantity <= i.minimum_stock);
      const outOfStock = items.filter((i) => i.quantity <= 0);
      const expiring = items.filter((i) => {
        if (!i.expiry_date) return false;
        const t = new Date(i.expiry_date + "T00:00:00").getTime();
        return t <= in30;
      });

      const byCategory: Record<string, { items: number; value: number }> = {};
      for (const i of items) {
        const c = i.category || "Other";
        if (!byCategory[c]) byCategory[c] = { items: 0, value: 0 };
        byCategory[c].items += 1;
        byCategory[c].value += Number(i.quantity) * Number(i.price_per_unit);
      }

      return NextResponse.json({
        type: "inventory",
        summary: {
          total_items: items.length,
          total_value: totalValue,
          low_stock_count: lowStock.length,
          out_of_stock_count: outOfStock.length,
          expiring_count: expiring.length,
          by_category: byCategory,
        },
        low_stock: lowStock.slice(0, 100),
        expiring: expiring.sort((a, b) => (a.expiry_date || "").localeCompare(b.expiry_date || "")).slice(0, 100),
      });
    }

    if (type === "mis") {
      const today = new Date().toISOString().slice(0, 10);
      const [
        admissionsRes,
        dischargesRes,
        censusRes,
        bedsTotalRes,
        bedsOccupiedRes,
        apptsRes,
        apptsCompletedRes,
        apptsTodayRes,
        labPendingRes,
      ] = await Promise.all([
        admin.from("admissions").select("id, admission_date").gte("admission_date", fromTs).lte("admission_date", toTs).limit(5000),
        admin
          .from("admissions")
          .select("admission_date, discharge_date")
          .eq("status", "discharged")
          .gte("discharge_date", fromTs)
          .lte("discharge_date", toTs)
          .limit(5000),
        admin.from("admissions").select("id", { count: "exact", head: true }).eq("status", "active"),
        admin.from("beds").select("id", { count: "exact", head: true }),
        admin.from("beds").select("id", { count: "exact", head: true }).eq("is_occupied", true),
        admin.from("appointments").select("id", { count: "exact", head: true }).gte("date_slot", fromTs).lte("date_slot", toTs).neq("status", "cancelled"),
        admin.from("appointments").select("id", { count: "exact", head: true }).gte("date_slot", fromTs).lte("date_slot", toTs).eq("status", "completed"),
        admin
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("date_slot", `${today}T00:00`)
          .lte("date_slot", `${today}T23:59`)
          .neq("status", "cancelled"),
        admin.from("lab_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      const discharges = (dischargesRes.data || []) as { admission_date: string; discharge_date: string | null }[];
      let staySum = 0;
      let stayN = 0;
      for (const d of discharges) {
        if (!d.discharge_date) continue;
        const a = new Date(d.admission_date).getTime();
        const b = new Date(d.discharge_date).getTime();
        if (b >= a) {
          staySum += (b - a) / 86400000;
          stayN += 1;
        }
      }

      const dailyMap: Record<string, { admissions: number; discharges: number }> = {};
      eachDay(from, to).forEach((d) => {
        dailyMap[d] = { admissions: 0, discharges: 0 };
      });
      for (const a of admissionsRes.data || []) {
        const k = dayKey(a.admission_date);
        if (dailyMap[k]) dailyMap[k].admissions += 1;
      }
      for (const d of discharges) {
        if (!d.discharge_date) continue;
        const k = dayKey(d.discharge_date);
        if (dailyMap[k]) dailyMap[k].discharges += 1;
      }

      return NextResponse.json({
        type: "mis",
        from,
        to,
        summary: {
          admissions: admissionsRes.data?.length || 0,
          discharges: discharges.length,
          active_census: censusRes.count || 0,
          avg_stay_days: stayN ? Math.round((staySum / stayN) * 10) / 10 : 0,
          appointments: apptsRes.count || 0,
          completed_appointments: apptsCompletedRes.count || 0,
          appointments_today: apptsTodayRes.count || 0,
          beds_total: bedsTotalRes.count || 0,
          beds_occupied: bedsOccupiedRes.count || 0,
          lab_pending: labPendingRes.count || 0,
        },
        daily: Object.entries(dailyMap).map(([date, v]) => ({ date, ...v })),
      });
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
