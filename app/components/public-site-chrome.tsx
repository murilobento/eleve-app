"use client";

import * as React from "react";
import { ArrowRight, Facebook, Instagram, Linkedin, Menu, Moon, Sun, X } from "lucide-react";

import type { AppLocale } from "@/i18n/config";
import { useTheme } from "@/hooks/use-theme";
import { getAppUrl } from "@/lib/utils";

import { EleveLogo } from "./eleve-logo";

export type PublicSiteCompanyInfo = {
  address?: string | null;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
};

const navigationItems = [
  { label: "Início", href: "#inicio" },
  { label: "Serviços", href: "#servicos", fallbackHref: "/servicos" },
  { label: "Equipamentos", href: "#equipamentos", fallbackHref: "/equipamentos" },
  { label: "Sobre nós", href: "#sobre" },
  { label: "Depoimentos", href: "#depoimentos" },
  { label: "Contato", href: "#contato" },
] as const;

function smoothScroll(target: string, onDone?: () => void) {
  const element = document.querySelector(target);
  if (!element) {
    onDone?.();
    return;
  }

  const headerOffset = 80;
  const startY = window.pageYOffset;
  const targetY = Math.max(0, element.getBoundingClientRect().top + startY - headerOffset);
  const distance = targetY - startY;

  if (Math.abs(distance) < 2) {
    window.scrollTo({ top: targetY });
    onDone?.();
    return;
  }

  const durationMs = 900;
  const startTime = performance.now();
  const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const easedProgress = easeInOutCubic(progress);

    window.scrollTo({
      top: startY + distance * easedProgress,
    });

    if (progress < 1) {
      window.requestAnimationFrame(step);
      return;
    }

    onDone?.();
  };

  window.requestAnimationFrame(step);
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) {
    return value;
  }

  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function WhatsAppOutlineIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M3.50002 12C3.50002 7.30558 7.3056 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C10.3278 20.5 8.77127 20.0182 7.45798 19.1861C7.21357 19.0313 6.91408 18.9899 6.63684 19.0726L3.75769 19.9319L4.84173 17.3953C4.96986 17.0955 4.94379 16.7521 4.77187 16.4751C3.9657 15.176 3.50002 13.6439 3.50002 12ZM12 1.5C6.20103 1.5 1.50002 6.20101 1.50002 12C1.50002 13.8381 1.97316 15.5683 2.80465 17.0727L1.08047 21.107C0.928048 21.4637 0.99561 21.8763 1.25382 22.1657C1.51203 22.4552 1.91432 22.5692 2.28599 22.4582L6.78541 21.1155C8.32245 21.9965 10.1037 22.5 12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5Z" />
      <path d="M14.2925 14.1824L12.9783 15.1081C12.3628 14.7575 11.6823 14.2681 10.9997 13.5855C10.2901 12.8759 9.76402 12.1433 9.37612 11.4713L10.2113 10.7624C10.5697 10.4582 10.6678 9.94533 10.447 9.53028L9.38284 7.53028C9.23954 7.26097 8.98116 7.0718 8.68115 7.01654C8.38113 6.96129 8.07231 7.046 7.84247 7.24659L7.52696 7.52195C6.76823 8.18414 6.3195 9.2723 6.69141 10.3741C7.07698 11.5163 7.89983 13.314 9.58552 14.9997C11.3991 16.8133 13.2413 17.5275 14.3186 17.8049C15.1866 18.0283 16.008 17.7288 16.5868 17.2572L17.1783 16.7752C17.4313 16.5691 17.5678 16.2524 17.544 15.9269C17.5201 15.6014 17.3389 15.308 17.0585 15.1409L15.3802 14.1409C15.0412 13.939 14.6152 13.9552 14.2925 14.1824Z" />
    </svg>
  );
}

export function PublicSiteTopbar({
  whatsAppUrl,
  isHome = false,
}: {
  whatsAppUrl: string;
  isHome?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    const syncTheme = () => {
      if (theme === "system") {
        setIsDarkMode(document.documentElement.classList.contains("dark"));
        return;
      }

      setIsDarkMode(theme === "dark");
    };

    syncTheme();
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-md transition-colors dark:border-white/5 dark:bg-[#1A1A1A]/90">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 md:h-20 md:px-6">
          <a
            href="/#inicio"
            className="flex flex-col"
            onClick={(event) => {
              if (!isHome) {
                return;
              }

              event.preventDefault();
              smoothScroll("#inicio");
            }}
          >
            <EleveLogo className="h-12 w-auto" />
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {navigationItems.map((item) => (
              <a
                key={item.href}
                href={isHome ? item.href : item.fallbackHref ?? `/${item.href}`}
                className="rounded-sm px-2 py-1 text-sm font-semibold tracking-[0.02em] text-gray-600 transition-colors hover:bg-[#FCD34D] hover:text-gray-950 dark:text-gray-400 dark:hover:bg-[#FCD34D] dark:hover:text-gray-950"
                onClick={(event) => {
                  if (!isHome) {
                    return;
                  }

                  event.preventDefault();
                  smoothScroll(item.href);
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-black/5 hover:text-black dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label="Alternar tema"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-sm bg-[#FCD34D] px-5 py-3 text-sm font-bold text-gray-950 transition-colors hover:bg-[#F59E0B]"
            >
              <WhatsAppOutlineIcon size={16} />
              Solicitar orçamento
            </a>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-black transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/5 lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-x-0 top-18 z-40 border-b border-black/5 bg-white/98 p-4 shadow-xl dark:border-white/5 dark:bg-[#1A1A1A]/98 lg:hidden">
          <nav className="flex flex-col gap-1">
            {navigationItems.map((item) => (
              <a
                key={item.href}
                href={isHome ? item.href : item.fallbackHref ?? `/${item.href}`}
                className="rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-[#FCD34D] hover:text-gray-950 dark:text-gray-300 dark:hover:bg-[#FCD34D] dark:hover:text-gray-950"
                onClick={(event) => {
                  if (!isHome) {
                    setMobileOpen(false);
                    return;
                  }

                  event.preventDefault();
                  smoothScroll(item.href, () => setMobileOpen(false));
                }}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-[auto_1fr] gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-black/10 text-black transition-colors hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                aria-label="Alternar tema"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#FCD34D] px-4 py-3 text-sm font-bold text-gray-950 transition-colors hover:bg-[#F59E0B]"
                onClick={() => setMobileOpen(false)}
              >
                <WhatsAppOutlineIcon size={16} />
                Solicitar orçamento
              </a>
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}

export function PublicSiteFooter({
  company,
  whatsAppUrl,
  locale,
  isHome = false,
}: {
  company: PublicSiteCompanyInfo;
  whatsAppUrl: string;
  locale?: AppLocale;
  isHome?: boolean;
}) {
  const companyAddress = company.address?.trim() || "Av. Industrial, 1200 - Bloco A";
  const companyCnpjRaw = company.cnpj?.trim() || "";
  const companyCnpj = companyCnpjRaw.length > 0 ? formatCnpj(companyCnpjRaw) : "-";
  const companyEmail = company.email?.trim() || "contato@eleve.com.br";
  const companyPhone = company.phone?.trim() || "(11) 4000-1234";
  const socialProfiles = [
    { name: "Facebook", icon: Facebook, href: company.facebookUrl?.trim() || "" },
    { name: "Instagram", icon: Instagram, href: company.instagramUrl?.trim() || "" },
    { name: "LinkedIn", icon: Linkedin, href: company.linkedinUrl?.trim() || "" },
  ].filter((item) => item.href.length > 0);

  return (
    <footer id="contato" className="border-t border-black/5 bg-white py-20 transition-colors dark:border-white/5 dark:bg-[#1A1A1A]">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-6 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
        <div className="max-w-sm">
          <a
            href="/#inicio"
            className="flex flex-col"
            onClick={(event) => {
              if (!isHome) {
                return;
              }

              event.preventDefault();
              smoothScroll("#inicio");
            }}
          >
            <EleveLogo className="h-12 w-auto" />
          </a>
          <p className="mt-6 text-sm leading-7 text-gray-600 dark:text-gray-400">
            Soluções de logística e locação para construção civil, indústria e operações especiais com resposta técnica rápida.
          </p>
          <div className="mt-8 flex gap-3">
            {socialProfiles.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-gray-50 text-gray-500 transition-colors hover:border-[#FCD34D] hover:text-[#F59E0B] dark:border-white/10 dark:bg-[#222222] dark:text-gray-400"
                aria-label={social.name}
              >
                <social.icon size={18} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="inline-block rounded-sm bg-[#FCD34D] px-2 py-1 text-sm font-bold uppercase tracking-[0.25em] text-gray-950">Contato</p>
          <div className="mt-6 space-y-4 text-sm leading-7 text-gray-600 dark:text-gray-400">
            <p><span className="font-semibold">Endereço:</span> {companyAddress}</p>
            <p><span className="font-semibold">CNPJ:</span> {companyCnpj}</p>
            <p>
              <span className="font-semibold">E-mail:</span>{" "}
              <a href={`mailto:${companyEmail}`} className="transition-colors hover:text-[#FCD34D] dark:hover:text-[#FCD34D]">{companyEmail}</a>
            </p>
            <p>
              <span className="font-semibold">Whatsapp/Telefone:</span>{" "}
              <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#FCD34D] dark:hover:text-[#FCD34D]">{companyPhone}</a>
            </p>
          </div>
        </div>

        <div>
          <p className="inline-block rounded-sm bg-[#FCD34D] px-2 py-1 text-sm font-bold uppercase tracking-[0.25em] text-gray-950">Acesso rápido</p>
          <div className="mt-6 flex flex-col gap-3">
            <a href={locale ? getAppUrl("/auth/sign-in", locale) : "/auth/sign-in"} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 transition-colors hover:text-[#FCD34D] dark:text-gray-300 dark:hover:text-[#FCD34D]">Entrar no sistema<ArrowRight size={15} /></a>
            <a href={locale ? getAppUrl("/dashboard", locale) : "/dashboard"} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 transition-colors hover:text-[#FCD34D] dark:text-gray-300 dark:hover:text-[#FCD34D]">Ir para o dashboard<ArrowRight size={15} /></a>
            <a
              href={isHome ? "#servicos" : "/servicos"}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 transition-colors hover:text-[#FCD34D] dark:text-gray-300 dark:hover:text-[#FCD34D]"
              onClick={(event) => {
                if (!isHome) {
                  return;
                }

                event.preventDefault();
                smoothScroll("#servicos");
              }}
            >
              Ver serviços<ArrowRight size={15} />
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-16 flex max-w-7xl flex-col gap-4 border-t border-black/5 px-4 pt-8 text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:border-white/5 dark:text-gray-400 md:flex-row md:items-center md:justify-between md:px-6">
        <p>© 2026 Eleve Locações. Todos os direitos reservados.</p>
        <a href="https://wa.me/5518996973332" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#FCD34D] dark:hover:text-[#FCD34D]">Desenvolvido por MB.</a>
      </div>
    </footer>
  );
}
