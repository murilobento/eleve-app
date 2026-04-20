"use client";

import * as React from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Menu,
  MessageCircle,
  Moon,
  Sun,
  Wrench,
  ShieldCheck,
  Clock3,
  ArrowUp,
  Facebook,
  Instagram,
  Linkedin,
  X,
} from "lucide-react";

import { useTheme } from "@/hooks/use-theme";
import { cn, getAppUrl } from "@/lib/utils";
import type { AppLocale } from "@/i18n/config";

type LandingProps = {
  locale: AppLocale;
  fontClassName?: string;
};

type FeatureCardProps = {
  title: string;
  img: string;
  tag: string;
  highlighted?: boolean;
};

type EquipmentCardProps = {
  name: string;
  model: string;
  capacity: string;
  img: string;
};

const services = [
  {
    tag: "Pesados",
    title: "Locação de Guindastes",
    img: "https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=1200",
    highlighted: true,
  },
  {
    tag: "Versátil",
    title: "Munck",
    img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=1200",
  },
  {
    tag: "Logística",
    title: "Empilhadeiras",
    img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=1200",
  },
  {
    tag: "Extra-Longo",
    title: "Carreta Extensiva",
    img: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=1200",
  },
  {
    tag: "Especial",
    title: "Prancha",
    img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
  },
];

const equipment = [
  {
    name: "Guindaste LTM 11200",
    model: "Liebherr",
    capacity: "1200 ton",
    img: "https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=1200",
  },
  {
    name: "Empilhadeira Industrial",
    model: "Hyster",
    capacity: "16 ton",
    img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
  },
  {
    name: "Caminhão Munck",
    model: "Volvo",
    capacity: "45 ton",
    img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=1200",
  },
  {
    name: "Plataforma Elevatória",
    model: "JLG",
    capacity: "12m",
    img: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1200",
  },
];

const testimonials = [
  {
    name: "Carlos Oliveira",
    role: "Engenheiro de Produção",
    text: "O atendimento da Eleve é excepcional. Equipamentos impecáveis e operadores que realmente sabem o que fazem.",
  },
  {
    name: "Juliana Mendes",
    role: "Gestora de Logística",
    text: "Precisávamos de uma carreta extensiva de última hora e eles nos atenderam em tempo recorde. Empresa séria e comprometida com prazos.",
  },
  {
    name: "Roberto Silva",
    role: "Diretor de Operações",
    text: "A segurança é nossa prioridade e a Eleve compartilha esse valor. Recomendo fortemente para qualquer projeto de movimentação especial.",
  },
];

const reasons = [
  {
    title: "Segurança certificada",
    content:
      "Protocolos rigorosos, operadores treinados continuamente e processos alinhados às principais normas do setor.",
  },
  {
    title: "Experiência operacional",
    content:
      "Atuação em projetos industriais e civis de alta complexidade, com planejamento técnico e execução precisa.",
  },
  {
    title: "Frota renovada",
    content:
      "Equipamentos de marcas líderes globais com manutenção controlada e disponibilidade para contratos de curto e longo prazo.",
  },
  {
    title: "Suporte ágil",
    content:
      "Atendimento consultivo desde o dimensionamento até a operação em campo, reduzindo risco e tempo parado.",
  },
];

const navigationItems = [
  { label: "Início", href: "#inicio" },
  { label: "Serviços", href: "#servicos" },
  { label: "Equipamentos", href: "#equipamentos" },
  { label: "Sobre nós", href: "#sobre" },
  { label: "Contato", href: "#contato" },
];

function smoothScroll(target: string, onDone?: () => void) {
  const element = document.querySelector(target);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  onDone?.();
}

function LandingNavbar({ locale }: { locale: AppLocale }) {
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
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-md transition-colors dark:border-white/5 dark:bg-[#0A0A0A]/90">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 md:h-20 md:px-6">
          <a href="#inicio" className="flex flex-col">
            <span className="text-2xl font-extrabold tracking-tighter text-black dark:text-white">Eleve</span>
            <span className="pl-0.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#FCD34D]">
              Locações
            </span>
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {navigationItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-gray-600 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
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
              href={getAppUrl("/auth/sign-in", locale)}
              className="text-sm font-semibold text-gray-700 transition-colors hover:text-black dark:text-gray-300 dark:hover:text-white"
            >
              Entrar
            </a>
            <a
              href="#contato"
              className="inline-flex items-center gap-2 rounded-sm bg-[#FCD34D] px-5 py-3 text-sm font-bold text-gray-950 transition-colors hover:bg-[#F59E0B]"
            >
              <MessageCircle size={16} />
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
        <div className="fixed inset-x-0 top-18 z-40 border-b border-black/5 bg-white/98 p-4 shadow-xl dark:border-white/5 dark:bg-[#0A0A0A]/98 lg:hidden">
          <nav className="flex flex-col gap-1">
            {navigationItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-black/5 hover:text-black dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
                onClick={(event) => {
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
                href={getAppUrl("/auth/sign-in", locale)}
                className="inline-flex items-center justify-center rounded-lg border border-black/10 px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
              >
                Entrar
              </a>
              <a
                href="#contato"
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#FCD34D] px-4 py-3 text-sm font-bold text-gray-950 transition-colors hover:bg-[#F59E0B]"
                onClick={(event) => {
                  event.preventDefault();
                  smoothScroll("#contato", () => setMobileOpen(false));
                }}
              >
                <MessageCircle size={16} />
                Solicitar orçamento
              </a>
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}

function FeatureCard({ title, img, tag, highlighted }: FeatureCardProps) {
  return (
    <article className="group relative aspect-[1.2/1] w-[88vw] max-w-[380px] shrink-0 overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/15 sm:w-[360px]">
      <img
        src={img}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute left-4 top-4 rounded-sm border border-white/20 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-black dark:bg-[#0A0A0A]/90 dark:text-white">
        {tag}
      </div>
      <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/15 bg-white/95 p-4 backdrop-blur-sm transition-colors group-hover:bg-[#FCD34D] dark:bg-[#121212]/95 dark:group-hover:bg-[#FCD34D]">
        <h3 className="text-lg font-bold text-black dark:text-white dark:group-hover:text-black">{title}</h3>
        <div className="mt-3 flex items-center justify-between">
          <div className="h-0.5 w-10 bg-black/20 transition-all duration-300 group-hover:w-24" />
          {highlighted ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-700 group-hover:text-black dark:text-[#FCD34D] dark:group-hover:text-black">
              Ver detalhes
              <ArrowRight size={14} />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EquipmentCard({ name, model, capacity, img }: EquipmentCardProps) {
  return (
    <article className="group w-[88vw] max-w-[320px] shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-lg shadow-black/5 transition-transform duration-300 hover:-translate-y-1 dark:border-white/5 dark:bg-[#1A1A1A] dark:shadow-black/20 sm:w-[320px]">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={img}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute right-4 top-4 rounded-sm bg-[#FCD34D] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-950">
          {capacity}
        </div>
      </div>
      <div className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">{model}</p>
        <h3 className="mt-2 text-lg font-bold text-black transition-colors group-hover:text-amber-700 dark:text-white dark:group-hover:text-[#FCD34D]">
          {name}
        </h3>
        <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4 dark:border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
            Manual técnico
          </span>
          <ChevronRight size={18} className="text-amber-700 dark:text-[#FCD34D]" />
        </div>
      </div>
    </article>
  );
}

function Carousel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const container = ref.current;
    if (!container) return;

    const width = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === "left" ? -width : width,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div className="mb-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => scroll("left")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black transition-colors hover:bg-[#FCD34D] dark:border-white/10 dark:bg-[#1A1A1A] dark:text-white dark:hover:bg-[#FCD34D] dark:hover:text-black"
          aria-label={`Voltar no carrossel ${title}`}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => scroll("right")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black transition-colors hover:bg-[#FCD34D] dark:border-white/10 dark:bg-[#1A1A1A] dark:text-white dark:hover:bg-[#FCD34D] dark:hover:text-black"
          aria-label={`Avançar no carrossel ${title}`}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}

function AccordionItem({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="border-b border-black/5 py-1 dark:border-white/5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-bold uppercase tracking-[0.15em] text-black dark:text-white">{title}</span>
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 transition-all dark:border-white/10",
            open ? "rotate-90 bg-[#FCD34D] text-black" : "text-gray-500 dark:text-gray-400",
          )}
        >
          <ChevronRight size={16} />
        </span>
      </button>
      {open ? (
        <p className="pb-5 text-sm leading-7 text-gray-600 dark:text-gray-400">{content}</p>
      ) : null}
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420);

    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FCD34D] text-gray-950 shadow-2xl shadow-black/20 transition-all hover:scale-105",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
      aria-label="Voltar ao topo"
    >
      <ArrowUp size={22} />
    </button>
  );
}

export function SiteEleveLanding({ locale, fontClassName }: LandingProps) {
  return (
    <div
      className={cn(
        fontClassName,
        "min-h-screen bg-white text-black selection:bg-[#FCD34D] selection:text-gray-950 dark:bg-[#0A0A0A] dark:text-white",
      )}
    >
      <LandingNavbar locale={locale} />

      <main>
        <section
          id="inicio"
          className="relative overflow-hidden bg-gray-50 pb-20 pt-32 transition-colors dark:bg-[#0A0A0A] md:pb-32 md:pt-48"
        >
          <div className="absolute inset-0 opacity-[0.05]">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <pattern id="siteeleve-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
                <pattern id="siteeleve-triangles" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 0 40 L 20 0 L 40 40 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#siteeleve-triangles)" />
            </svg>
          </div>

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-6 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                <ShieldCheck size={14} className="text-[#FCD34D]" />
                Operação segura e precisa
              </div>
              <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.06em] sm:text-6xl md:text-7xl lg:text-8xl">
                Elevação e
                <br />
                <span className="text-transparent [webkit-text-stroke:2px_currentColor]">movimentação</span>
                <br />
                de precisão.
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-gray-700 dark:text-gray-400 lg:mx-0 lg:text-lg">
                Soluções premium em locação de guindastes, empilhadeiras e transporte pesado para projetos industriais e civis.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <a
                  href="#contato"
                  className="inline-flex items-center justify-center gap-3 rounded-sm bg-[#FCD34D] px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-gray-950 transition-colors hover:bg-[#F59E0B]"
                >
                  <MessageCircle size={18} />
                  Solicitar orçamento
                </a>
                <a
                  href={getAppUrl("/auth/sign-in", locale)}
                  className="inline-flex items-center justify-center gap-3 rounded-sm border border-black/10 px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                >
                  Entrar no sistema
                </a>
              </div>
              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/5 bg-white/80 p-4 text-left backdrop-blur-sm dark:border-white/5 dark:bg-white/5">
                  <Wrench className="mb-3 text-[#FCD34D]" size={22} />
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">Frota técnica</p>
                  <p className="mt-2 text-sm font-semibold">Equipamentos para carga pesada e logística especializada.</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/80 p-4 text-left backdrop-blur-sm dark:border-white/5 dark:bg-white/5">
                  <Clock3 className="mb-3 text-[#FCD34D]" size={22} />
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">Resposta rápida</p>
                  <p className="mt-2 text-sm font-semibold">Planejamento, mobilização e suporte para operações críticas.</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/80 p-4 text-left backdrop-blur-sm dark:border-white/5 dark:bg-white/5">
                  <ShieldCheck className="mb-3 text-[#FCD34D]" size={22} />
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">Confiabilidade</p>
                  <p className="mt-2 text-sm font-semibold">Execução segura com equipe experiente e operação monitorada.</p>
                </div>
              </div>
            </div>

            <div className="relative hidden sm:block">
              <div className="absolute -inset-6 rounded-full bg-[#FCD34D]/10 blur-3xl" />
              <img
                src="https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=1400"
                alt="Guindaste da Eleve em operação"
                className="relative w-full rounded-[2rem] object-cover shadow-2xl shadow-black/20"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </section>

        <section id="servicos" className="bg-white py-24 transition-colors dark:bg-[#0A0A0A] md:py-32">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="mb-14 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-700 dark:text-[#FCD34D]">O que oferecemos</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl">Nossos serviços</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-gray-600 dark:text-gray-400">
                Soluções completas para movimentação, elevação e transporte de alta complexidade.
              </p>
            </div>
            <Carousel title="serviços">
              {services.map((service) => (
                <div key={service.title} className="snap-start">
                  <FeatureCard {...service} />
                </div>
              ))}
            </Carousel>
          </div>
        </section>

        <section id="equipamentos" className="bg-gray-100 py-24 transition-colors dark:bg-[#121212] md:py-32">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-800 dark:bg-[#FCD34D]/10 dark:text-[#FCD34D]">
                  Frota de alta performance
                </p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl">Equipamentos em destaque</h2>
              </div>
              <a
                href="#contato"
                className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-gray-600 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
              >
                Solicitar disponibilidade
                <ArrowRight size={16} />
              </a>
            </div>
            <Carousel title="equipamentos">
              {equipment.map((item) => (
                <div key={item.name} className="snap-start">
                  <EquipmentCard {...item} />
                </div>
              ))}
            </Carousel>
          </div>
        </section>

        <section id="sobre" className="bg-white py-24 transition-colors dark:bg-[#0A0A0A] md:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-6 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-700 dark:text-[#FCD34D]">Excelência em elevação</p>
              <h2 className="mt-4 text-4xl font-black leading-none tracking-[-0.05em] md:text-6xl">
                Por que escolher a Eleve Locações?
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-gray-600 dark:text-gray-400">
                Combinamos precisão de engenharia com agilidade operacional para entregar segurança, performance e previsibilidade.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/5 bg-gray-50 p-6 dark:border-white/5 dark:bg-[#121212]">
                  <p className="text-3xl font-black">10+</p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-gray-400">
                    Anos de mercado
                  </p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-gray-50 p-6 dark:border-white/5 dark:bg-[#121212]">
                  <p className="text-3xl font-black">2k+</p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-gray-400">
                    Obras concluídas
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-xl shadow-black/5 dark:border-white/5 dark:bg-[#1A1A1A] dark:shadow-black/20 md:p-10">
              {reasons.map((reason) => (
                <AccordionItem key={reason.title} {...reason} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-100 py-24 transition-colors dark:bg-[#121212] md:py-32">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="mb-14">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-700 dark:text-[#FCD34D]">Depoimentos</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-5xl">O que dizem nossos clientes</h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <article
                  key={testimonial.name}
                  className="rounded-[1.75rem] border border-black/5 bg-white p-8 shadow-lg shadow-black/5 dark:border-white/5 dark:bg-[#1A1A1A] dark:shadow-black/20"
                >
                  <div className="mb-6 flex items-center gap-4">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#FCD34D] bg-gray-100 text-lg font-black text-black dark:bg-[#0A0A0A] dark:text-white">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold">{testimonial.name}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                  <p className="text-base leading-8 text-gray-600 dark:text-gray-300">"{testimonial.text}"</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="contato" className="border-t border-black/5 bg-white py-20 transition-colors dark:border-white/5 dark:bg-[#0A0A0A]">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-6 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
          <div className="max-w-sm">
            <a href="#inicio" className="flex flex-col">
              <span className="text-2xl font-extrabold tracking-tighter text-black dark:text-white">Eleve</span>
              <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#FCD34D]">Locações</span>
            </a>
            <p className="mt-6 text-sm leading-7 text-gray-600 dark:text-gray-400">
              Soluções de logística e locação para construção civil, indústria e operações especiais com resposta técnica rápida.
            </p>
            <div className="mt-8 flex gap-3">
              {[Facebook, Instagram, Linkedin].map((Icon, index) => (
                <a
                  key={index}
                  href="#contato"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-gray-50 text-gray-500 transition-colors hover:border-[#FCD34D] hover:text-[#F59E0B] dark:border-white/10 dark:bg-[#1A1A1A] dark:text-gray-400"
                  aria-label="Rede social"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-black dark:text-white">Contato</p>
            <div className="mt-6 space-y-4 text-sm leading-7 text-gray-600 dark:text-gray-400">
              <p>Av. Industrial, 1200 - Bloco A</p>
              <p>São Paulo, SP - 01000-000</p>
              <p>contato@eleve.com.br</p>
              <p>(11) 4000-1234</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-black dark:text-white">Acesso rápido</p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href={getAppUrl("/auth/sign-in", locale)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 transition-colors hover:text-black dark:text-gray-300 dark:hover:text-white"
              >
                Entrar no sistema
                <ArrowRight size={15} />
              </a>
              <a
                href={getAppUrl("/dashboard", locale)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 transition-colors hover:text-black dark:text-gray-300 dark:hover:text-white"
              >
                Ir para o dashboard
                <ArrowRight size={15} />
              </a>
              <a
                href="#servicos"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 transition-colors hover:text-black dark:text-gray-300 dark:hover:text-white"
              >
                Ver serviços
                <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-7xl flex-col gap-4 border-t border-black/5 px-4 pt-8 text-[11px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:border-white/5 dark:text-gray-400 md:flex-row md:items-center md:justify-between md:px-6">
          <p>© 2026 Eleve Locações. Todos os direitos reservados.</p>
          <p>Desenvolvido com precisão.</p>
        </div>
      </footer>

      <BackToTop />
    </div>
  );
}
