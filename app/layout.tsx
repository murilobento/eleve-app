import type { Metadata, Viewport } from "next";
import { Chakra_Petch, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { defaultLocale, getHtmlLang } from "@/i18n/config";
import { getPublicSiteBaseUrl } from "@/lib/public-site-seo";
import "@/index.css";

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteBaseUrl()),
  title: "Eleve Locações",
  description: "Locação de guindastes, empilhadeiras e transporte pesado para operações industriais e civis.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={getHtmlLang(defaultLocale)} suppressHydrationWarning>
      <body className={`${chakraPetch.variable} ${jetBrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
