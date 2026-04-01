import { getLocalizedPath } from "@/i18n/config";
import { getPreferredLocaleFromCookie } from "@/i18n/server";
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect(getLocalizedPath("/dashboard", getPreferredLocaleFromCookie()));
}
