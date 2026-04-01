export const localeCookieName = "app-locale";
export const locales = ["pt-BR", "en"] as const;
export const defaultLocale = "pt-BR" as const;

export type AppLocale = (typeof locales)[number];

export function isLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}

export function getLocaleLabel(locale: AppLocale) {
  return locale === "pt-BR" ? "Português (Brasil)" : "English";
}

export function getHtmlLang(locale: AppLocale) {
  return locale === "pt-BR" ? "pt-BR" : "en";
}

export function stripLocaleFromPath(pathname: string) {
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = cleanPath.split("/").filter(Boolean);
  const [first, ...rest] = segments;

  if (!first || !isLocale(first)) {
    return cleanPath === "" ? "/" : cleanPath;
  }

  return rest.length === 0 ? "/" : `/${rest.join("/")}`;
}

export function extractLocaleFromPath(pathname: string) {
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const [first] = cleanPath.split("/").filter(Boolean);
  return first && isLocale(first) ? first : null;
}

export function getLocalizedPath(pathname: string, locale: AppLocale) {
  const strippedPath = stripLocaleFromPath(pathname);
  return strippedPath === "/" ? `/${locale}` : `/${locale}${strippedPath}`;
}

export function replacePathLocale(pathname: string, locale: AppLocale) {
  return getLocalizedPath(pathname, locale);
}
