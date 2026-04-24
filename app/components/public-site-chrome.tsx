"use client";

import * as React from "react";
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowRight, Facebook, Instagram, Linkedin, Menu, X } from "lucide-react";

import type { AppLocale } from "@/i18n/config";
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
  if (!element) { onDone?.(); return; }
  const headerOffset = 80;
  const startY = window.pageYOffset;
  const targetY = Math.max(0, element.getBoundingClientRect().top + startY - headerOffset);
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) { window.scrollTo({ top: targetY }); onDone?.(); return; }
  const durationMs = 900;
  const startTime = performance.now();
  const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    window.scrollTo({ top: startY + distance * easeInOutCubic(progress) });
    if (progress < 1) { window.requestAnimationFrame(step); return; }
    onDone?.();
  };
  window.requestAnimationFrame(step);
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return value;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function WhatsAppOutlineIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className} fill="currentColor">
      <path d="M3.50002 12C3.50002 7.30558 7.3056 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C10.3278 20.5 8.77127 20.0182 7.45798 19.1861C7.21357 19.0313 6.91408 18.9899 6.63684 19.0726L3.75769 19.9319L4.84173 17.3953C4.96986 17.0955 4.94379 16.7521 4.77187 16.4751C3.9657 15.176 3.50002 13.6439 3.50002 12ZM12 1.5C6.20103 1.5 1.50002 6.20101 1.50002 12C1.50002 13.8381 1.97316 15.5683 2.80465 17.0727L1.08047 21.107C0.928048 21.4637 0.99561 21.8763 1.25382 22.1657C1.51203 22.4552 1.91432 22.5692 2.28599 22.4582L6.78541 21.1155C8.32245 21.9965 10.1037 22.5 12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5Z" />
      <path d="M14.2925 14.1824L12.9783 15.1081C12.3628 14.7575 11.6823 14.2681 10.9997 13.5855C10.2901 12.8759 9.76402 12.1433 9.37612 11.4713L10.2113 10.7624C10.5697 10.4582 10.6678 9.94533 10.447 9.53028L9.38284 7.53028C9.23954 7.26097 8.98116 7.0718 8.68115 7.01654C8.38113 6.96129 8.07231 7.046 7.84247 7.24659L7.52696 7.52195C6.76823 8.18414 6.3195 9.2723 6.69141 10.3741C7.07698 11.5163 7.89983 13.314 9.58552 14.9997C11.3991 16.8133 13.2413 17.5275 14.3186 17.8049C15.1866 18.0283 16.008 17.7288 16.5868 17.2572L17.1783 16.7752C17.4313 16.5691 17.5678 16.2524 17.544 15.9269C17.5201 15.6014 17.3389 15.308 17.0585 15.1409L15.3802 14.1409C15.0412 13.939 14.6152 13.9552 14.2925 14.1824Z" />
    </svg>
  );
}

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

function NavLink({
  href,
  children,
  onClick,
  scrolled,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  scrolled?: boolean;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <a
      href={href}
      className={cn("relative px-2 py-1 text-sm font-semibold tracking-[0.02em] transition-colors", scrolled ? "text-gray-700 hover:text-gray-950" : "text-white/90 hover:text-white")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {children}
      <motion.div
        className={cn("absolute bottom-0 left-0 right-0 h-[2px]", scrolled ? "bg-[#FCD34D]" : "bg-white/60")}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: hovered ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{ transformOrigin: "left" }}
      />
    </a>
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
  const [scrolled, setScrolled] = React.useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <>
      <motion.header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled ? "border-b border-gray-200 bg-white/95 backdrop-blur-xl shadow-sm" : "border-b border-transparent bg-transparent",
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 md:h-20 md:px-6">
          <a
            href="/#inicio"
            className="flex flex-col transition-transform duration-200 hover:scale-[1.03]"
            onClick={(event) => { if (!isHome) return; event.preventDefault(); smoothScroll("#inicio"); }}
          >
            <EleveLogo className={cn("h-12 w-auto transition-[filter] duration-300", !scrolled && "brightness-0 invert")} />
          </a>

          <nav className="hidden items-center gap-4 lg:gap-8 md:flex">
            {navigationItems.map((item) => (
              <NavLink key={item.href} href={isHome ? item.href : item.fallbackHref ?? `/${item.href}`} scrolled={scrolled}
                onClick={(event) => { if (!isHome) return; event.preventDefault(); smoothScroll(item.href); }}
              >
                <span className="hidden lg:inline">{item.label}</span>
                <span className="lg:hidden text-xs">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group relative inline-flex items-center gap-2 overflow-hidden rounded-sm px-4 py-2.5 text-xs font-bold transition-colors lg:px-5 lg:py-3 lg:text-sm",
                scrolled ? "bg-[#FCD34D] text-gray-950 hover:bg-[#F59E0B]" : "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
              )}
            >
              {scrolled && <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />}
              <WhatsAppOutlineIcon size={16} />
              <span className="hidden sm:inline">Solicitar orçamento</span>
            </a>
          </div>

          <button
            type="button"
            className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors md:hidden", scrolled ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/10")}
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className={cn("fixed inset-x-0 top-18 z-40 p-6 backdrop-blur-xl md:hidden", scrolled ? "border-b border-gray-200 bg-white/98" : "border-b border-white/10 bg-[#0A0A0A]/98")}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            <nav className="flex flex-col gap-1">
              {navigationItems.map((item, index) => (
                <motion.a
                  key={item.href}
                  href={isHome ? item.href : item.fallbackHref ?? `/${item.href}`}
                  className={cn("rounded-lg px-4 py-3 text-sm font-semibold transition-colors", scrolled ? "text-gray-700 hover:bg-gray-100 hover:text-gray-950" : "text-gray-300 hover:bg-white/6 hover:text-white")}
                  onClick={(event) => { if (!isHome) { setMobileOpen(false); return; } event.preventDefault(); smoothScroll(item.href, () => setMobileOpen(false)); }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {item.label}
                </motion.a>
              ))}
              <div className="mt-4">
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FCD34D] px-4 py-3 text-sm font-bold text-gray-950 transition-colors hover:bg-[#F59E0B]"
                  onClick={() => setMobileOpen(false)}
                >
                  <WhatsAppOutlineIcon size={16} />
                  Solicitar orçamento
                </a>
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
  const companyAddress = company.address?.trim() || "Rua Benedito Virgínio Garcia, 535. Distrito Industrial - 19043-020. Presidente Prudente, SP";
  const companyCnpjRaw = company.cnpj?.trim() || "04616748000174";
  const companyCnpj = companyCnpjRaw.length > 0 ? formatCnpj(companyCnpjRaw) : "-";
  const companyEmail = company.email?.trim() || "comercial@eleve.com.br";
  const companyPhone = company.phone?.trim() || "(18) 99776-6064";
  const socialProfiles = [
    { name: "Facebook", icon: Facebook, href: company.facebookUrl?.trim() || "" },
    { name: "Instagram", icon: Instagram, href: company.instagramUrl?.trim() || "" },
    { name: "LinkedIn", icon: Linkedin, href: company.linkedinUrl?.trim() || "" },
  ].filter((item) => item.href.length > 0);

  return (
    <footer id="contato" className="border-t border-gray-200 bg-white py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-6 md:grid-cols-2 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
        <div className="max-w-sm">
          <a href="/#inicio" className="flex flex-col transition-transform duration-200 hover:scale-[1.03]" onClick={(event) => { if (!isHome) return; event.preventDefault(); smoothScroll("#inicio"); }}>
            <EleveLogo className="h-12 w-auto" />
          </a>
          <p className="mt-6 text-sm leading-7 text-gray-500">
            Soluções de logística e locação para construção civil, indústria e operações especiais com resposta técnica rápida.
          </p>
          <div className="mt-8 flex gap-3">
            {socialProfiles.map((social) => (
              <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition-all hover:border-[#FCD34D]/40 hover:text-[#F59E0B]" aria-label={social.name}>
                <social.icon size={18} />
              </a>
            ))}
          </div>
        </div>
        <div>
          <p className="inline-block bg-[#FCD34D] px-2 py-1 text-sm font-bold uppercase tracking-[0.25em] text-gray-950">Contato</p>
          <div className="mt-6 space-y-4 text-sm leading-7 text-gray-500">
            <p><span className="font-semibold text-gray-700">Endereço:</span> <a href="https://maps.app.goo.gl/DmjrE6qVkLGhsgen7" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#F59E0B]">{companyAddress}</a></p>
            <p><span className="font-semibold text-gray-700">CNPJ:</span> {companyCnpj}</p>
            <p><span className="font-semibold text-gray-700">E-mail:</span> <a href={`mailto:${companyEmail}`} className="transition-colors hover:text-[#F59E0B]">{companyEmail}</a></p>
            <p><span className="font-semibold text-gray-700">Whatsapp/Telefone:</span> <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#F59E0B]">{companyPhone}</a></p>
          </div>
        </div>
         <div className="md:col-span-2 lg:col-span-1">
           <p className="inline-block bg-[#FCD34D] px-2 py-1 text-sm font-bold uppercase tracking-[0.25em] text-gray-950">Acesso rápido</p>
          <div className="mt-6 flex flex-col gap-3">
            <a href={locale ? getAppUrl("/auth/sign-in", locale) : "/auth/sign-in"} className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-[#F59E0B]">Entrar no sistema <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></a>
            <a href={isHome ? "#servicos" : "/servicos"} className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-[#F59E0B]" onClick={(event) => { if (!isHome) return; event.preventDefault(); smoothScroll("#servicos"); }}>Ver serviços <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></a>
            <a href={isHome ? "#equipamentos" : "/equipamentos"} className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-[#F59E0B]" onClick={(event) => { if (!isHome) return; event.preventDefault(); smoothScroll("#equipamentos"); }}>Ver equipamentos <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></a>
            <a href={isHome ? "#depoimentos" : "/#depoimentos"} className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-[#F59E0B]" onClick={(event) => { if (!isHome) return; event.preventDefault(); smoothScroll("#depoimentos"); }}>Ver depoimentos <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-16 flex max-w-7xl flex-col gap-4 border-t border-gray-200 px-4 pt-8 text-[11px] font-bold uppercase tracking-[0.28em] text-gray-400 md:flex-row md:items-center md:justify-between md:px-6">
        <p>© 2026 Eleve Locações. Todos os direitos reservados.</p>
        <a href="https://wa.me/5518996973332" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[#F59E0B]">Desenvolvido por MB.</a>
      </div>
    </footer>
  );
}
