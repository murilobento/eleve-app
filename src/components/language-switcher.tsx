"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  defaultLocale,
  getLocaleLabel,
  localeCookieName,
  replacePathLocale,
  type AppLocale,
} from "@/i18n/config";
import { useI18n } from "@/i18n/provider";

function BrazilFlagIcon() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className="size-4 shrink-0" preserveAspectRatio="xMidYMid meet">
      <path fill="#009B3A" d="M36 27a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v18z" />
      <path fill="#FEDF01" d="M32.728 18L18 29.124L3.272 18L18 6.875z" />
      <circle fill="#002776" cx="17.976" cy="17.924" r="6.458" />
      <path fill="#CBE9D4" d="M12.277 14.887a6.406 6.406 0 0 0-.672 2.023c3.995-.29 9.417 1.891 11.744 4.595c.402-.604.7-1.28.883-2.004c-2.872-2.808-7.917-4.63-11.955-4.614z" />
      <path fill="#88C9F9" d="M12 18.233h1v1h-1zm1 2h1v1h-1z" />
      <path fill="#55ACEE" d="M15 18.233h1v1h-1zm2 1h1v1h-1zm4 2h1v1h-1zm-3 1h1v1h-1zm3-6h1v1h-1z" />
      <path fill="#3B88C3" d="M19 20.233h1v1h-1z" />
    </svg>
  );
}

function UsaFlagIcon() {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className="size-4 shrink-0" preserveAspectRatio="xMidYMid meet">
      <path fill="#B22334" d="M35.445 7C34.752 5.809 33.477 5 32 5H18v2h17.445zM0 25h36v2H0zm18-8h18v2H18zm0-4h18v2H18zM0 21h36v2H0zm4 10h28c1.477 0 2.752-.809 3.445-2H.555c.693 1.191 1.968 2 3.445 2zM18 9h18v2H18z" />
      <path fill="#EEE" d="M.068 27.679c.017.093.036.186.059.277c.026.101.058.198.092.296c.089.259.197.509.333.743L.555 29h34.89l.002-.004a4.22 4.22 0 0 0 .332-.741a3.75 3.75 0 0 0 .152-.576c.041-.22.069-.446.069-.679H0c0 .233.028.458.068.679zM0 23h36v2H0zm0-4v2h36v-2H18zm18-4h18v2H18zm0-4h18v2H18zM0 9zm.555-2l-.003.005L.555 7zM.128 8.044c.025-.102.06-.199.092-.297a3.78 3.78 0 0 0-.092.297zM18 9h18c0-.233-.028-.459-.069-.68a3.606 3.606 0 0 0-.153-.576A4.21 4.21 0 0 0 35.445 7H18v2z" />
      <path fill="#3C3B6E" d="M18 5H4a4 4 0 0 0-4 4v10h18V5z" />
      <path fill="#FFF" d="M2.001 7.726l.618.449l-.236.725L3 8.452l.618.448l-.236-.725L4 7.726h-.764L3 7l-.235.726zm2 2l.618.449l-.236.725l.617-.448l.618.448l-.236-.725L6 9.726h-.764L5 9l-.235.726zm4 0l.618.449l-.236.725l.617-.448l.618.448l-.236-.725L10 9.726h-.764L9 9l-.235.726zm4 0l.618.449l-.236.725l.617-.448l.618.448l-.236-.725L14 9.726h-.764L13 9l-.235.726zm-8 4l.618.449l-.236.725l.617-.448l.618.448l-.236-.725L6 13.726h-.764L5 13l-.235.726zm4 0l.618.449l-.236.725l.617-.448l.618.448l-.236-.725L10 13.726h-.764L9 13l-.235.726zm4 0l.618.449l-.236.725l.617-.448l.618.448l-.236-.725L14 13.726h-.764L13 13l-.235.726zm-6-6l.618.449l-.236.725L7 8.452l.618.448l-.236-.725L8 7.726h-.764L7 7l-.235.726zm4 0l.618.449l-.236.725l.617-.448l.618.448l-.236-.725L12 7.726h-.764L11 7l-.235.726zm4 0l.618.449l-.236.725l.617-.448l.618.448l-.236-.725L16 7.726h-.764L15 7l-.235.726zm-12 4l.618.449l-.236.725l.617-.448l.618.448l-.236-.725L4 11.726h-.764L3 11l-.235.726zM6.383 12.9L7 12.452l.618.448l-.236-.725l.618-.449h-.764L7 11l-.235.726h-.764l.618.449zm3.618-1.174l.618.449l-.236.725l.617-.448l.618.448l-.236-.725l.618-.449h-.764L11 11l-.235.726zm4 0l.618.449l-.236.725l.617-.448l.618.448l-.236-.725l.618-.449h-.764L15 11l-.235.726zm-12 4l.618.449l-.236.725l.617-.448l.618.448l-.236-.725L4 15.726h-.764L3 15l-.235.726zM6.383 16.9L7 16.452l.618.448l-.236-.725l.618-.449h-.764L7 15l-.235.726h-.764l.618.449zm3.618-1.174l.618.449l-.236.725l.617-.448l.618.448l-.236-.725l.618-.449h-.764L11 15l-.235.726zm4 0l.618.449l-.236.725l.617-.448l.618.448l-.236-.725l.618-.449h-.764L15 15l-.235.726z" />
    </svg>
  );
}

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const nextLocale: AppLocale = locale === "pt-BR" ? "en" : "pt-BR";

  const handleChange = (nextLocale: AppLocale) => {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.push(replacePathLocale(pathname || `/${defaultLocale}`, nextLocale));
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="cursor-pointer"
      onClick={() => handleChange(nextLocale)}
      aria-label={`${t("common.language")}: ${getLocaleLabel(locale)}`}
      title={getLocaleLabel(locale)}
    >
      {locale === "pt-BR" ? <BrazilFlagIcon /> : <UsaFlagIcon />}
      <span className="sr-only">{`${t("common.language")}: ${getLocaleLabel(locale)}`}</span>
    </Button>
  );
}
