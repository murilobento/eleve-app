"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  defaultLocale,
  getLocaleLabel,
  localeCookieName,
  locales,
  replacePathLocale,
  type AppLocale,
} from "@/i18n/config";
import { useI18n } from "@/i18n/provider";

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useI18n();

  const handleChange = (nextLocale: AppLocale) => {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.push(replacePathLocale(pathname || `/${defaultLocale}`, nextLocale));
  };

  return (
    <div className="flex items-center gap-1 rounded-md border px-1 py-1">
      <span className="sr-only">{t("common.language")}</span>
      <Languages className="size-4 text-muted-foreground" />
      {locales.map((option) => (
        <Button
          key={option}
          type="button"
          variant={locale === option ? "secondary" : "ghost"}
          size="sm"
          className="h-7 cursor-pointer px-2"
          onClick={() => handleChange(option)}
          aria-pressed={locale === option}
          aria-label={getLocaleLabel(option)}
        >
          {option === "pt-BR" ? "PT" : "EN"}
        </Button>
      ))}
    </div>
  );
}
