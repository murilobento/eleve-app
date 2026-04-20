import { getPreferredLocaleFromCookie } from "@/i18n/server";

import { SiteEleveLanding } from "./site-eleve-landing";

export default function LandingPage() {
  return <SiteEleveLanding locale={getPreferredLocaleFromCookie()} />;
}
