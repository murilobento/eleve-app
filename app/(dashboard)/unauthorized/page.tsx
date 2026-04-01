"use client"

import { useI18n } from "@/i18n/provider";

export default function UnauthorizedPage() {
  const { t } = useI18n();

  return (
    <div className="px-4 lg:px-6">
      <div className="rounded-xl border p-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.unauthorizedTitle")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("dashboard.unauthorizedDescription")}
        </p>
      </div>
    </div>
  );
}
