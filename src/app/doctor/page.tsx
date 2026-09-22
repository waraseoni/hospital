"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FlaskConical, Clock, Send, UserRound } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

interface FollowUp {
  id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis: string;
  follow_up_date: string;
  patient?: { name: string; uhid: string; phone: string };
}

export default function DoctorDashboardPage() {
  const { t } = useI18n();
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [pendingLabOrders, setPendingLabOrders] = useState(0);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const today = new Date().toISOString().split("T")[0];
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    const [appts, pending, fu] = await Promise.all([
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("doctor_id", user.id).gte("date_slot", `${today}T00:00`).lte("date_slot", `${today}T23:59`).in("status", ["scheduled", "in_progress"]),
      supabase.from("lab_reports").select("id", { count: "exact", head: true }).eq("doctor_id", user.id).eq("status", "pending"),
      supabase.from("prescriptions")
        .select("id, patient_id, doctor_id, diagnosis, follow_up_date, patient:patients(name, uhid, phone)")
        .eq("doctor_id", user.id)
        .not("follow_up_date", "is", null)
        .gte("follow_up_date", today)
        .lte("follow_up_date", weekEnd)
        .order("follow_up_date", { ascending: true }),
    ]);
    setTodayAppointments(appts.count || 0);
    setPendingLabOrders(pending.count || 0);
    setFollowUps((fu.data as unknown as FollowUp[]) || []);
    setLoading(false);
  }

  async function sendFollowUpReminder(fu: FollowUp) {
    if (!fu.patient?.phone) return;
    const supabase = createClient();
    const { data: settings } = await supabase.from("settings").select("hospital_name, whatsapp_number").limit(1).single();
    if (!settings?.whatsapp_number) {
      addToast("error", "WhatsApp number not configured in settings");
      return;
    }
    const res = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: fu.patient.phone,
        message_type: "follow_up_reminder",
        message_body: `📋 Follow-up Reminder\n\nDear ${fu.patient.name},\n\nFollow-up date: ${fu.follow_up_date}\nDiagnosis: ${fu.diagnosis}\n\nPlease visit us for your review.`,
      }),
    });
    if (res.ok) addToast("success", "Reminder sent");
    else addToast("error", "Failed to send");
  }

  if (loading) return <PageContainer><Skeleton lines={6} /></PageContainer>;

  const cards = [
    { labelKey: "dash.todayAppointments" as const, value: String(todayAppointments), icon: <Calendar size={20} /> },
    { labelKey: "dash.pendingLabOrders" as const, value: String(pendingLabOrders), icon: <FlaskConical size={20} /> },
    { labelKey: "dash.followUps" as const, value: String(followUps.length), icon: <Clock size={20} /> },
  ];

  return (
    <PageContainer>
      <div className="mb-5"><h1 className="text-xl font-bold">{t("dash.welcomeDoctor")}</h1></div>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {cards.map(({ labelKey, value, icon }) => (
          <StatCard key={labelKey} icon={icon} label={t(labelKey)} value={value} />
        ))}
      </div>

      <PageHeader title="Upcoming Follow-ups (7 days)" subtitle={`${followUps.length} patient(s) need review`} />

      {followUps.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card/50 py-8 text-center text-sm text-muted-foreground">
          No follow-ups due this week
        </div>
      ) : (
        <div className="space-y-2">
          {followUps.map((fu) => (
            <div key={fu.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserRound size={15} />
                </div>
                <div>
                  <p className="text-sm font-medium">{fu.patient?.name} <span className="text-xs text-muted-foreground">({fu.patient?.uhid})</span></p>
                  <p className="text-xs text-muted-foreground">Dx: {fu.diagnosis}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={fu.follow_up_date === new Date().toISOString().split("T")[0] ? "warning" : "info"}>
                  {fu.follow_up_date}
                </Badge>
                <button
                  onClick={() => sendFollowUpReminder(fu)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Send WhatsApp reminder"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
