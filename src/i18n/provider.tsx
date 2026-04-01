"use client";

import * as React from "react";

import { defaultLocale, getHtmlLang, type AppLocale } from "@/i18n/config";
import { getMessages, type AppMessages } from "@/i18n/messages";

type I18nContextValue = {
  locale: AppLocale;
  messages: AppMessages;
  t: (key: string, values?: Record<string, string | number>) => string;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

function resolveMessage(messages: AppMessages, key: string) {
  return key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[part];
  }, messages);
}

export function I18nProvider({
  locale,
  children,
}: {
  locale: AppLocale;
  children: React.ReactNode;
}) {
  const messages = React.useMemo(() => getMessages(locale), [locale]);

  React.useEffect(() => {
    document.documentElement.lang = getHtmlLang(locale);
  }, [locale]);

  const value = React.useMemo<I18nContextValue>(() => ({
    locale,
    messages,
    t: (key, values) => {
      const resolved = resolveMessage(messages, key);
      if (typeof resolved !== "string") {
        return key;
      }

      if (!values) {
        return resolved;
      }

      return Object.entries(values).reduce(
        (current, [token, value]) => current.replaceAll(`{${token}}`, String(value)),
        resolved,
      );
    },
  }), [locale, messages]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = React.useContext(I18nContext);
  if (!context) {
    return {
      locale: defaultLocale,
      messages: getMessages(defaultLocale),
      t: (key: string) => key,
    };
  }

  return context;
}

export function useLocale() {
  return useI18n().locale;
}
