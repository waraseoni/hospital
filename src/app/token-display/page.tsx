"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";

interface DoctorDisplay {
  doctor_name: string;
  specialization: string;
  current_token: number;
  current_patient: string;
  next_token: number;
  next_patient: string;
  waiting_count: number;
}

export default function TokenDisplayPage() {
  const { t } = useI18n();
  const [displays, setDisplays] = useState<DoctorDisplay[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/token-display");
      if (res.ok) {
        const data = await res.json();
        setDisplays(data.doctors || []);
        setLastUpdated(data.updated_at || "");
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">OPD QUEUE BOARD</h1>
          <p className="text-blue-200 text-lg">Hospital Management System</p>
          {lastUpdated && (
            <p className="text-blue-300 text-sm mt-2">Last updated: {new Date(lastUpdated).toLocaleTimeString()}</p>
          )}
        </div>

        {loading ? (
          <div className="text-center text-2xl text-blue-200">Loading...</div>
        ) : displays.length === 0 ? (
          <div className="text-center text-2xl text-blue-200">No appointments today</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displays.map((d, i) => (
              <div key={i} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6">
                {/* Doctor Name */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold">Dr. {d.doctor_name}</h2>
                  <p className="text-blue-200 text-sm">{d.specialization}</p>
                </div>

                {/* Current Token */}
                <div className="mb-4 p-4 rounded-xl bg-green-500/20 border border-green-400/30">
                  <p className="text-sm text-green-200 mb-1">NOW SERVING</p>
                  <div className="flex items-center gap-3">
                    <span className="text-5xl font-black text-green-400">#{d.current_token || "—"}</span>
                    <div>
                      <p className="text-lg font-semibold">{d.current_patient}</p>
                    </div>
                  </div>
                </div>

                {/* Next Token */}
                <div className="mb-3 p-3 rounded-xl bg-yellow-500/20 border border-yellow-400/30">
                  <p className="text-sm text-yellow-200 mb-1">NEXT</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-yellow-400">#{d.next_token || "—"}</span>
                    <p className="text-sm">{d.next_patient}</p>
                  </div>
                </div>

                {/* Waiting Count */}
                <div className="text-center">
                  <span className="text-2xl font-bold text-blue-200">{d.waiting_count}</span>
                  <span className="text-blue-300 text-sm ml-2">patients waiting</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Auto-refresh notice */}
        <p className="text-center text-blue-300 text-sm mt-8">Auto-refreshes every 10 seconds</p>
      </div>
    </div>
  );
}
