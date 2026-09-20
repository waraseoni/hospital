"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Eye, EyeOff, Activity } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { LanguageSwitcher, ThemeSwitcher } from "@/components/theme/theme-controls";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEmail(localStorage.getItem("hms_remembered_email") || "");
    setRemember(localStorage.getItem("hms_remember") === "1");
    setMounted(true);
  }, []);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [error, setError] = useState("");

  async function handleForgotPassword() {
    if (!email) return;
    setForgotLoading(true);
    setForgotSent(false);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    setForgotLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setError("");
    setForgotSent(true);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (remember) {
      localStorage.setItem("hms_remembered_email", email);
      localStorage.setItem("hms_remember", "1");
    } else {
      localStorage.removeItem("hms_remembered_email");
      localStorage.removeItem("hms_remember");
    }

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const roleRoutes: Record<string, string> = {
        super_admin: "/super-admin",
        admin: "/admin",
        doctor: "/doctor",
        nurse: "/nurse",
        lab: "/lab",
        staff: "/staff",
        patient: "/patient",
      };

      router.push(roleRoutes[profile?.role || "patient"] || "/login");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg sm:p-8">
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher compact />
        </div>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Activity size={24} />
          </div>
          <h1 className="text-xl font-bold text-primary sm:text-2xl">
            {t("app.name")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("auth.signInTitle")}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              {t("auth.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              {t("auth.password")}
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              {t("auth.rememberMe")}
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={!mounted || forgotLoading || !email}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              {forgotLoading ? t("auth.sending") : t("auth.forgotPassword")}
            </button>
          </div>

          {forgotSent && (
            <p className="text-xs text-success">
              {t("auth.resetSent").replace("{email}", email)}
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? t("auth.signingIn") : t("auth.signIn")}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/signup" className="text-sm text-primary hover:underline">
            {t("auth.noAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}