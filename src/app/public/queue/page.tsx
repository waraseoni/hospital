"use client";

import { useEffect, useState } from "react";

interface QueueDoctor {
  doctor: { full_name: string; specialization: string } | null;
  current: number | null;
  waiting: number;
  next: number[];
}

interface QueueData {
  date: string;
  generated_at: string;
  doctors: QueueDoctor[];
}

export default function PublicQueuePage() {
  const [data, setData] = useState<QueueData | null>(null);
  const [error, setError] = useState("");
  const [clock, setClock] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/public/queue", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setData(json);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
    const poll = setInterval(load, 8000);
    const tick = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="flex items-center justify-between border-b border-slate-800 px-8 py-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-teal-400">OPD Token Display</h1>
          <p className="text-sm text-slate-400 mt-1">
            {data?.date ? new Date(data.date + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-bold text-teal-300">{clock || "--:--:--"}</p>
          <p className="text-xs text-slate-500 mt-1">Live · updates every 8s</p>
        </div>
      </header>

      <main className="p-8">
        {error && (
          <div className="rounded-xl border border-red-800 bg-red-950/50 p-6 text-red-300">
            {error} — retrying...
          </div>
        )}

        {!error && (!data || data.doctors.length === 0) && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400 text-lg">
            No patients in queue
          </div>
        )}

        {data && data.doctors.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {data.doctors.map((d, i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
                <div className="bg-teal-700 px-5 py-3">
                  <p className="font-semibold text-lg">{d.doctor?.full_name || "Doctor"}</p>
                  <p className="text-xs text-teal-100/80">{d.doctor?.specialization || ""}</p>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 uppercase tracking-wide">Now Serving</span>
                    <span className="text-5xl font-black text-amber-400 font-mono">
                      {d.current !== null ? `T${d.current}` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                    <span className="text-sm text-slate-400">Waiting</span>
                    <span className="text-2xl font-bold text-sky-400">{d.waiting}</span>
                  </div>
                  {d.next.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Up Next</p>
                      <div className="flex flex-wrap gap-2">
                        {d.next.map(n => (
                          <span key={n} className="rounded-lg bg-slate-800 px-3 py-1.5 font-mono text-sm text-slate-200">
                            T{n}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 px-8 py-4 text-center text-xs text-slate-600">
        Star Hospital — Queue Display (TV mode)
      </footer>
    </div>
  );
}
