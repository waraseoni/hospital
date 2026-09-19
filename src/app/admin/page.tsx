"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ doctors: 0, nurses: 0, patients: 0, appointments: 0, beds: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [doctors, nurses, patients, appointments, beds] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "doctor"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "nurse"),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
        supabase.from("beds").select("id", { count: "exact", head: true }).eq("is_occupied", true),
      ]);
      setStats({
        doctors: doctors.count || 0,
        nurses: nurses.count || 0,
        patients: patients.count || 0,
        appointments: appointments.count || 0,
        beds: beds.count || 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>;

  const cards = [
    { label: "Doctors", value: stats.doctors, color: "text-blue-600" },
    { label: "Nurses", value: stats.nurses, color: "text-green-600" },
    { label: "Total Patients", value: stats.patients, color: "text-purple-600" },
    { label: "Today Appointments", value: stats.appointments, color: "text-orange-600" },
    { label: "Occupied Beds", value: stats.beds, color: "text-red-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
