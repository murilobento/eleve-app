"use client";

import { useRef } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { cn } from "@/lib/utils";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

type ServiceCard = {
  tag: string;
  title: string;
  img: string;
  href?: string;
  imageAlt?: string | null;
  highlighted?: boolean;
};

type ServicesCarouselProps = {
  services: ServiceCard[];
  autoplayMs?: number;
  className?: string;
};

function ServiceCardView({ service }: { service: ServiceCard }) {
  const card = (
    <article className="group relative aspect-[1.2/1] w-full overflow-hidden rounded-2xl bg-gray-900">
      <img src={service.img} alt={service.imageAlt?.trim() || service.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute left-4 top-4 rounded-sm border border-white/20 bg-black/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white backdrop-blur-sm">{service.tag}</div>
      <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/10 bg-black/50 p-4 backdrop-blur-md transition-all duration-300 group-hover:border-[#FCD34D]/30">
        <h3 className="min-h-[3.5rem] line-clamp-2 text-lg font-bold text-white">{service.title}</h3>
        <div className="mt-3 flex items-center justify-between">
          <div className="h-[2px] w-10 bg-white/15 transition-all duration-300 group-hover:w-24 group-hover:bg-[#FCD34D]" />
          {service.highlighted ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.2em] text-[#FCD34D]">
              Ver detalhes <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (!service.href) return card;
  return <a href={service.href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]">{card}</a>;
}

export function ServicesCarousel({ services, autoplayMs = 5000, className }: ServicesCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const hasMultiple = services.length > 1;

  return (
    <div className={cn("relative", className)}>
      <Swiper
        modules={[Navigation, Autoplay, Pagination]}
        slidesPerView={1} spaceBetween={24} loop={hasMultiple}
        autoplay={hasMultiple ? { delay: autoplayMs, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
        navigation={{ prevEl: ".services-nav-prev", nextEl: ".services-nav-next" }}
        pagination={{ el: ".services-pagination", clickable: true, bulletClass: "swiper-pagination-bullet !bg-gray-300 !opacity-100 !w-2 !h-2", bulletActiveClass: "swiper-pagination-bullet-active !bg-[#FCD34D] !w-6 !rounded-full" }}
        breakpoints={{ 640: { slidesPerView: 2, spaceBetween: 24 }, 860: { slidesPerView: 2.5, spaceBetween: 24 }, 1024: { slidesPerView: 3, spaceBetween: 24 } }}
        onSwiper={(swiper) => { swiperRef.current = swiper; }}
        className="!px-4"
      >
        {services.map((service, index) => (
          <SwiperSlide key={`service-${index}`}><ServiceCardView service={service} /></SwiperSlide>
        ))}
      </Swiper>
      {hasMultiple && (
        <>
          <button type="button" className="services-nav-prev absolute left-0 top-1/2 z-10 -translate-y-1/2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-[#FCD34D] hover:bg-[#FCD34D] hover:text-gray-950 md:flex" aria-label="Serviço anterior"><ChevronLeft size={18} /></button>
          <button type="button" className="services-nav-next absolute right-0 top-1/2 z-10 -translate-y-1/2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-[#FCD34D] hover:bg-[#FCD34D] hover:text-gray-950 md:flex" aria-label="Próximo serviço"><ChevronRight size={18} /></button>
          <div className="services-pagination mt-6 flex justify-center gap-2 md:hidden" />
        </>
      )}
    </div>
  );
}
