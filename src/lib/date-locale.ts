import { enUS, ptBR } from "date-fns/locale";

import type { AppLocale } from "@/i18n/config";

export function getDateFnsLocale(locale: AppLocale) {
  return locale === "pt-BR" ? ptBR : enUS;
}
