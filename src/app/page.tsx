"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { LanguageSwitcher, ThemeSwitcher } from "@/components/theme/theme-controls";
import {
  Shield, Stethoscope, HeartPulse, FlaskConical, User, Building2, Crown,
} from "lucide-react";

const cards = [
  { icon: Crown, titleKey: "landing.superAdminCard" as const },
  { icon: Shield, titleKey: "landing.adminCard" as const },
  { icon: Stethoscope, titleKey: "landing.doctorCard" as const },
  { icon: HeartPulse, titleKey: "landing.nurseCard" as const },
  { icon: FlaskConical, titleKey: "landing.labCard" as const },
  { icon: User, titleKey: "landing.patientCard" as const },
  { icon: Building2, titleKey: "landing.staffCard" as const },
];

export default function HomePage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 sm:p-8">
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher compact />
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary sm:text-4xl">
          {t("landing.title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground sm:text-lg">
          {t("landing.subtitle")}
        </p>
      </div>

      <div className="grid w-full max-w-sm gap-3">
        <Link
          href="/login"
          className="flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          {t("landing.login")}
        </Link>
        <Link
          href="/signup"
          className="flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          {t("landing.createAccount")}
        </Link>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ icon: Icon, titleKey }) => (
          <div
            key={titleKey}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon size={18} />
            </span>
            <p className="text-sm font-medium leading-tight text-foreground">
              {t(titleKey)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}