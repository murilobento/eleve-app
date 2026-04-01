import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/provider";

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) {
    notFound();
  }

  return <I18nProvider locale={params.locale}>{children}</I18nProvider>;
}
