import { cookies } from "next/headers";

import { defaultLocale, isLocale } from "@/i18n/config";

export function getPreferredLocaleFromCookie() {
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get("app-locale")?.value;
  return cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;
}
