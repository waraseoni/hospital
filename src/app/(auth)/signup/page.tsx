"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", role: "patient" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">Hospital HMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your account
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-2">
            <p className="text-sm text-green-600 font-medium">Account created successfully!</p>
            <p className="text-xs text-muted-foreground">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium mb-1">Full Name</label>
              <input id="full_name" type="text" placeholder="John Doe" value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" required />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
              <input id="email" type="email" placeholder="you@example.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" required />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
              <input id="password" type="password" placeholder="Min 6 characters" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" required minLength={6} />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone (optional)</label>
              <input id="phone" type="tel" placeholder="+91 98765 43210" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-1">I am a</label>
              <select id="role" value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="lab">Lab Technician</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-primary hover:underline">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
