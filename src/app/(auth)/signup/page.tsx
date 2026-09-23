"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { LanguageSwitcher, ThemeSwitcher } from "@/components/theme/theme-controls";

export default function SignupPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", role: "patient", dob: "", gender: "other", blood_group: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg sm:p-8">
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher compact />
        </div>

        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon.svg" alt="" className="mx-auto mb-3 h-12 w-12 rounded-xl" />
          <h1 className="text-xl font-bold text-primary sm:text-2xl">
            {t("app.name")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("auth.signUpTitle")}
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-2">
            <p className="text-sm text-success font-medium">Account created successfully!</p>
            <p className="text-xs text-muted-foreground">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium mb-1">{t("auth.fullName")}</label>
              <input id="full_name" type="text" placeholder={t("auth.fullNamePlaceholder")} value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" required />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">{t("auth.email")}</label>
              <input id="email" type="email" placeholder={t("auth.emailPlaceholder")} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" required />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">{t("auth.password")}</label>
              <input id="password" type="password" placeholder="Min 6 characters" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" required minLength={6} />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">{t("common.phone")} (optional)</label>
              <input id="phone" type="tel" placeholder={t("auth.phonePlaceholder")} value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-1">{t("auth.role")}</label>
              <select id="role" value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="patient">{t("roles.patient")}</option>
                <option value="doctor">{t("roles.doctor")}</option>
                <option value="nurse">{t("roles.nurse")}</option>
                <option value="lab">{t("roles.lab")}</option>
                <option value="staff">{t("roles.staff")}</option>
              </select>
            </div>

            {form.role === "patient" && (
              <>
                <div className="rounded-lg border border-dashed border-border p-3 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground">{t("auth.patientDetails")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="dob" className="block text-sm font-medium mb-1">{t("auth.dob")}</label>
                      <input id="dob" type="date" value={form.dob}
                        onChange={(e) => setForm({ ...form, dob: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium mb-1">{t("auth.gender")}</label>
                      <select id="gender" value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
                        <option value="male">{t("auth.male")}</option>
                        <option value="female">{t("auth.female")}</option>
                        <option value="other">{t("auth.other")}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="blood_group" className="block text-sm font-medium mb-1">{t("auth.bloodGroup")}</label>
                    <select id="blood_group" value={form.blood_group}
                      onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring">
                      <option value="">--</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium mb-1">{t("auth.address")}</label>
                    <input id="address" type="text" value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {loading ? t("auth.signingUp") : t("auth.submit")}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm text-primary hover:underline">
            {t("auth.haveAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}