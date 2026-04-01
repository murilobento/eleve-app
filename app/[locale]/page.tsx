import { redirect } from "next/navigation";

import { defaultLocale, isLocale } from "@/i18n/config";

export default function LocalizedRootPage({ params }: { params: { locale: string } }) {
  redirect(`/${isLocale(params.locale) ? params.locale : defaultLocale}/dashboard`);
}
