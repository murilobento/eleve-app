import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getHtmlLang } from "@/i18n/config";
import { getPreferredLocaleFromCookie } from "@/i18n/server";
import "@/index.css";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Operational dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getPreferredLocaleFromCookie();

  return (
    <html lang={getHtmlLang(locale)} suppressHydrationWarning>
      <body className="font-sans antialiased" style={{ fontFamily: 'var(--font-inter)' }}>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
