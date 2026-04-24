"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  Wrench,
  ShieldCheck,
  Truck,
  Target,
  ArrowUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { AppLocale } from "@/i18n/config";
import type { PublicSiteContent } from "@/lib/public-site-admin";
import { PublicSiteFooter, PublicSiteTopbar } from "../components/public-site-chrome";
import {
  HeroCarousel,
  ServicesCarousel,
  EquipmentCarousel,
  TestimonialsCarousel,
} from "./components";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/scroll-reveal";
import { MagneticButton } from "@/components/magnetic-button";
import { CountUp } from "@/components/count-up";
import { GrainOverlay } from "@/components/grain-overlay";
import { ScrollProgress } from "@/components/scroll-progress";
import { TiltCard } from "@/components/tilt-card";

type LandingProps = {
  locale: AppLocale;
  fontClassName?: string;
  initialContent?: PublicSiteContent | null;
};

type EquipmentCardProps = {
  tag: string;
  title: string;
  capacity?: string;
  technicalInfo: string;
  manualUrl?: string | null;
  img: string;
  href?: string;
  imageAlt?: string | null;
  className?: string;
};

type TestimonialCard = {
  name: string;
  role: string;
  text: string;
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

const equipment: Omit<EquipmentCardProps, "className">[] = [
  {
    tag: "Guindaste",
    title: "Guindaste LTM 11200",
    capacity: "1200 ton",
    technicalInfo: "Guindaste telescopico de alta capacidade para operacoes de elevacao em projetos industriais e civis.",
    manualUrl: null,
    img: "https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=1200",
  },
  {
    tag: "Empilhadeira",
    title: "Empilhadeira Hyster",
    capacity: "16 ton",
    technicalInfo: "Equipamento para movimentacao de carga paletizada em ambientes industriais com operacao continua.",
    manualUrl: null,
    img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
  },
  {
    tag: "Munck",
    title: "Munck Volvo",
    capacity: "45 ton",
    technicalInfo: "Veiculo com munck para operacoes de carga, descarga e apoio logistico em obras e plantas industriais.",
    manualUrl: null,
    img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=1200",
  },
  {
    tag: "Plataforma",
    title: "Plataforma JLG",
    capacity: "12m",
    technicalInfo: "Plataforma para trabalhos em altura com alcance vertical e horizontal para manutencoes e montagens.",
    manualUrl: null,
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

const aboutFeatures = [
  {
    icon: ShieldCheck,
    title: "Segurança em primeiro lugar",
    description:
      "Toda operação segue protocolos de segurança rigorosos. Nossos operadores são treinados e certificados para atuar em ambientes industriais, obras civis e operações de risco controlado.",
    span: "full",
  },
  {
    icon: Wrench,
    title: "Frota própria e preparada",
    description:
      "Guindastes de 25 a 130 toneladas, muncks, empilhadeiras, carretas e containers — todos com manutenção preventiva em dia e prontos para mobilização imediata.",
    span: "half",
  },
  {
    icon: Target,
    title: "Planejamento técnico",
    description:
      "Do dimensionamento do equipamento ao plano rigging, cada projeto é estudado para garantir eficiência, reduzir imprevistos e cumprir prazos com precisão.",
    span: "half",
  },
  {
    icon: Truck,
    title: "Logística completa",
    description:
      "Transporte de cargas especiais e superdimensionadas com escolta, análise de rota e controle operacional ponta a ponta, do canteiro ao destino final.",
    span: "half",
  },
];

const HERO_LOOP_IMAGES = [
  "https://www.truck1eu.com.br/img/xxl/44492/XCMG-QY130K-130-ton-120-ton-140ton-150ton-160ton-200t-truck-crane-China_44492_5937391341.jpg",
  "https://www.euroequipamentos.com.br/imagens/equipamentos/xcmg-750.png",
  "https://sc04.alicdn.com/kf/Hde8d1becba464377b75e018b733da39fM.jpg",
  "https://www.briquerural.com.br/fotos/anuncio9129-d466a0ec1563ef2f9cc415261c9207ba.jpg",
  "https://www.carretaextensiva.com.br/images/gallery/large/2.jpg",
];

function WhatsAppOutlineIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M3.50002 12C3.50002 7.30558 7.3056 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C10.3278 20.5 8.77127 20.0182 7.45798 19.1861C7.21357 19.0313 6.91408 18.9899 6.63684 19.0726L3.75769 19.9319L4.84173 17.3953C4.96986 17.0955 4.94379 16.7521 4.77187 16.4751C3.9657 15.176 3.50002 13.6439 3.50002 12ZM12 1.5C6.20103 1.5 1.50002 6.20101 1.50002 12C1.50002 13.8381 1.97316 15.5683 2.80465 17.0727L1.08047 21.107C0.928048 21.4637 0.99561 21.8763 1.25382 22.1657C1.51203 22.4552 1.91432 22.5692 2.28599 22.4582L6.78541 21.1155C8.32245 21.9965 10.1037 22.5 12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5ZM14.2925 14.1824L12.9783 15.1081C12.3628 14.7575 11.6823 14.2681 10.9997 13.5855C10.2901 12.8759 9.76402 12.1433 9.37612 11.4713L10.2113 10.7624C10.5697 10.4582 10.6678 9.94533 10.447 9.53028L9.38284 7.53028C9.23954 7.26097 8.98116 7.0718 8.68115 7.01654C8.38113 6.96129 8.07231 7.046 7.84247 7.24659L7.52696 7.52195C6.76823 8.18414 6.3195 9.2723 6.69141 10.3741C7.07698 11.5163 7.89983 13.314 9.58552 14.9997C11.3991 16.8133 13.2413 17.5275 14.3186 17.8049C15.1866 18.0283 16.008 17.7288 16.5868 17.2572L17.1783 16.7752C17.4313 16.5691 17.5678 16.2524 17.544 15.9269C17.5201 15.6014 17.3389 15.308 17.0585 15.1409L15.3802 14.1409C15.0412 13.939 14.6152 13.9552 14.2925 14.1824Z" fill="currentColor" />
    </svg>
  );
}

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

function toPhoneDigits(value: string) { return value.replace(/\D/g, ""); }

function buildWhatsAppUrl(phone: string, message = "Olá! Gostaria de solicitar um orçamento.") {
  const digits = toPhoneDigits(phone);
  const normalizedPhone = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

function EquipmentCardComponent({ tag, title, capacity, img, href, imageAlt, className }: EquipmentCardProps) {
  const content = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl">
        <img src={img} alt={imageAlt?.trim() || title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
        <div className="absolute right-4 top-4 rounded-sm bg-[#FCD34D] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-950">{tag}</div>
      </div>
      <div className="p-5">
        {capacity ? <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">{capacity}</p> : null}
        <h3 className={cn("text-lg font-bold tracking-tight text-gray-900 transition-colors group-hover:text-amber-700", capacity ? "mt-2" : "")}>{title}</h3>
        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">Ver detalhes</span>
          <ChevronRight size={18} className="text-amber-600 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </>
  );

  return (
    <TiltCard className={cn("group w-full overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm", className)}>
      {href ? <a href={href} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]">{content}</a> : <div className="block w-full text-left">{content}</div>}
    </TiltCard>
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
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FCD34D] text-gray-950 shadow-lg"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Voltar ao topo"
        >
          <ArrowUp size={22} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

const LazyCraneWireframe = React.lazy(() =>
  import("@/components/crane-wireframe").then((m) => ({ default: m.CraneWireframe }))
);

function HeroSection({ whatsAppUrl, heroImages }: { whatsAppUrl: string; heroImages: string[] }) {
  return (
    <section id="inicio" className="relative flex min-h-[100dvh] items-center overflow-hidden bg-[#0A0A0A] pb-16 pt-28 md:pb-24 md:pt-40">
      <HeroCarousel images={heroImages} />
      <div className="absolute inset-0 bg-black/40" />
      <GrainOverlay className="absolute inset-0 z-[1] hidden lg:block" opacity={0.04} />
      <div className="absolute inset-0 z-[2] opacity-[0.04]">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <pattern id="siteeleve-triangles" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 0 40 L 20 0 L 40 40 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#siteeleve-triangles)" />
        </svg>
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start px-4 md:flex-row md:items-center md:px-6">
        <div className="max-w-3xl lg:text-left">
          <motion.div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-white backdrop-blur-sm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <ShieldCheck size={14} className="text-[#FCD34D]" />
            Operação segura e precisa
          </motion.div>
          <div className="overflow-hidden">
            <motion.h1 className="text-fluid-hero font-black text-white" initial={{ y: 80 }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}>Elevação e</motion.h1>
          </div>
          <div className="overflow-hidden">
            <motion.h1 className="text-fluid-hero font-black" initial={{ y: 80 }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}>
              <span className="inline-block bg-[#FCD34D] px-3 py-1 text-gray-950">movimentação</span>
            </motion.h1>
          </div>
          <div className="overflow-hidden">
            <motion.h1 className="text-fluid-hero font-black text-white" initial={{ y: 80 }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}>de precisão.</motion.h1>
          </div>
          <motion.p className="mx-auto mt-6 max-w-xl text-base leading-8 text-white/70 lg:mx-0 lg:text-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}>
            Soluções premium em locação de guindastes, empilhadeiras e transporte pesado para projetos industriais e civis.
          </motion.p>
          <motion.div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.7 }}>
            <MagneticButton href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 rounded-sm bg-[#FCD34D] px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] text-gray-950 transition-colors hover:bg-[#F59E0B] min-h-[44px]" strength={0.2}>
              <WhatsAppOutlineIcon size={18} />
              Solicitar orçamento
            </MagneticButton>
          </motion.div>
        </div>
        <div className="pointer-events-none absolute right-0 top-1/2 hidden h-[500px] w-[500px] -translate-y-1/2 lg:block xl:right-8">
          <React.Suspense fallback={null}>
            <LazyCraneWireframe className="h-full w-full" />
          </React.Suspense>
        </div>
        <div className="pointer-events-none absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-[#FCD34D]/10 blur-3xl lg:hidden" aria-hidden="true" />
      </div>
    </section>
  );
}

export function SiteEleveLanding({ locale, fontClassName, initialContent = null }: LandingProps) {
  const publicContent = initialContent;

  const serviceCards = publicContent?.services?.length
    ? publicContent.services.map((service, index) => ({ tag: service.tag, title: service.title, img: service.imageUrl, imageAlt: service.imageAlt, href: `/servicos/${service.slug}`, highlighted: index === 0 }))
    : services;

  const categoryTagMap: Record<string, string> = { guindastes: "Guindaste", munck: "Munck", empilhadeiras: "Empilhadeira", "guinchos-e-carretas": "Transporte", containers: "Container" };

  const equipmentCards = publicContent?.equipment?.length
    ? publicContent.equipment.map((item) => {
        const categorySlug = item.slug.split("/")[0] || "";
        const tag = categoryTagMap[categorySlug] || item.capacity;
        const isCapacityActual = /\d/.test(item.capacity);
        return { tag, title: `${tag} ${item.model}`, capacity: isCapacityActual ? item.capacity : undefined, technicalInfo: item.technicalInfo, manualUrl: item.manualUrl, img: item.imageUrl, imageAlt: item.imageAlt, href: `/equipamentos/${item.slug}` };
      })
    : equipment;

  const testimonialCards: TestimonialCard[] = publicContent?.testimonials?.length
    ? publicContent.testimonials.map((item) => ({ name: item.name, role: item.role, text: item.quote }))
    : testimonials;

  const companyPhone = publicContent?.company?.phone?.trim() || "(18) 99776-6064";
  const whatsAppUrl = buildWhatsAppUrl(companyPhone);
  const heroImages = HERO_LOOP_IMAGES;

  return (
    <div className={cn(fontClassName, "min-h-screen bg-white text-gray-900 selection:bg-[#FCD34D] selection:text-gray-950")}>
      <ScrollProgress className="fixed left-0 top-0 z-[60] hidden h-[2px] w-full bg-[#FCD34D] md:block" />
      <PublicSiteTopbar whatsAppUrl={whatsAppUrl} isHome />
      <main>
        <HeroSection whatsAppUrl={whatsAppUrl} heroImages={heroImages} />

        <section id="servicos" className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <ScrollReveal className="mb-14 text-center" direction="up">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-700">O que oferecemos</p>
              <h2 className="mt-4 text-fluid-section-title font-black">
                <span className="inline-block bg-[#FCD34D] px-3 py-1 text-gray-950">Nossos serviços</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-gray-500">
                Soluções completas para movimentação, elevação e transporte de alta complexidade.
              </p>
            </ScrollReveal>
            <ServicesCarousel services={serviceCards} autoplayMs={5000} />
          </div>
        </section>

        <section id="equipamentos" className="bg-[#F5F4F0] py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <ScrollReveal className="mb-14 text-center" direction="up">
              <div className="mx-auto max-w-2xl">
                <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-800">
                  Frota de alta performance
                </p>
                <h2 className="mt-4 text-fluid-section-title font-black">
                  <span className="inline-block bg-[#FCD34D] px-3 py-1 text-gray-950">Equipamentos em destaque</span>
                </h2>
              </div>
            </ScrollReveal>
            <EquipmentCarousel equipment={equipmentCards} autoplayMs={5000} />
          </div>
        </section>

        <section id="sobre" className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <ScrollReveal className="mx-auto max-w-3xl text-center" direction="up">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-700">Sobre a Eleve Locações</p>
              <h2 className="mt-4 text-fluid-detail-hero font-black leading-none">
                Estrutura própria para operações que exigem <span className="inline-block bg-[#FCD34D] px-3 py-1 text-gray-950">precisão</span>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-gray-500">
                Com sede em Presidente Prudente e atuação em todo o estado de São Paulo, a Eleve oferece locação de guindastes, muncks, empilhadeiras e transporte especial com planejamento técnico, frota própria e equipe dedicada a cada projeto.
              </p>
            </ScrollReveal>

            <StaggerContainer className="mt-16 grid gap-6 sm:grid-cols-2" stagger={0.12}>
              {aboutFeatures.map((feature) => (
                <StaggerItem
                  key={feature.title}
                  className={cn(
                    "group rounded-2xl border border-gray-200 bg-gray-50 p-6 transition-all duration-300 hover:border-[#FCD34D]/30 hover:shadow-lg hover:shadow-[#FCD34D]/5 md:p-8",
                    feature.span === "full" && "sm:col-span-2",
                  )}
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#FCD34D]/10 text-[#F59E0B] transition-colors group-hover:bg-[#FCD34D]/20">
                    <feature.icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-gray-500">{feature.description}</p>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 sm:grid-cols-3">
              {[
                { value: 10, suffix: "+", label: "Anos de atuação no mercado" },
                { value: 2000, suffix: "+", label: "Operações concluídas com segurança" },
                { value: 130, suffix: "t", label: "Capacidade máxima de elevação" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white p-8 text-center">
                  <p className="text-4xl font-black text-[#F59E0B] md:text-5xl">
                    <CountUp target={stat.value} suffix={stat.suffix} duration={2.5} />
                  </p>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.28em] text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="depoimentos" className="bg-[#F5F4F0] py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <ScrollReveal className="mb-14" direction="up">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-700">Depoimentos</p>
              <h2 className="mt-4 text-fluid-section-title font-black">
                <span className="inline-block bg-[#FCD34D] px-3 py-1 text-gray-950">O que dizem nossos clientes</span>
              </h2>
            </ScrollReveal>
            <TestimonialsCarousel testimonials={testimonialCards} autoplayMs={5000} />
          </div>
        </section>
      </main>
      <PublicSiteFooter company={publicContent?.company ?? {}} whatsAppUrl={whatsAppUrl} locale={locale} isHome />
      <BackToTop />
    </div>
  );
}
