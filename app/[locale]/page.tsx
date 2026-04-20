import { defaultLocale, isLocale } from "@/i18n/config";

import { SiteEleveLanding } from "../landing/site-eleve-landing";

export default function LocalizedRootPage({ params }: { params: { locale: string } }) {
  const locale = isLocale(params.locale) ? params.locale : defaultLocale;

  return <SiteEleveLanding locale={locale} />;
}
