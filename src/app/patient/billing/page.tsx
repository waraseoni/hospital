"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Invoice } from "@/types/database";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { useI18n } from "@/i18n/provider";

export default function PatientBillingPage() {
  const { t } = useI18n();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
      if (!patient) { setLoading(false); return; }

      const { data } = await supabase.from("invoices").select("*")
        .eq("patient_id", patient.id).order("created_at", { ascending: false });
      setInvoices((data as Invoice[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("billing.title")}</h1>
      {loading ? (
        <div className="animate-pulse text-muted-foreground">{t("billing.loading")}</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">{t("billing.noInvoices")}</div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <div key={inv.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div>
                <p className="font-medium">{inv.invoice_number}</p>
                <p className="text-xs text-muted-foreground">{formatDate(inv.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatCurrency(inv.net_amount)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inv.payment_status === "paid" ? "bg-green-100 text-green-800" : inv.payment_status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                  {inv.payment_status}
                </span>
                {inv.pdf_url && (
                  <a href={inv.pdf_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">{t("billing.pdf")}</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
