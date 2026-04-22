"use client";

import { useRef } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { cn } from "@/lib/utils";

import "swiper/css";
import "swiper/css/navigation";

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

function ServiceCard({ service }: { service: ServiceCard }) {
  const card = (
    <article className="group relative aspect-[1.2/1] w-full overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/15">
      <img
        src={service.img}
        alt={service.imageAlt?.trim() || service.title}
        className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute left-4 top-4 rounded-sm border border-white/20 bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-black dark:bg-[#0A0A0A]/90 dark:text-white">
        {service.tag}
      </div>
      <div className="absolute inset-x-4 bottom-4 rounded-xl border border-white/15 bg-white/95 p-4 backdrop-blur-sm transition-colors group-hover:bg-[#FCD34D] dark:bg-[#121212]/95 dark:group-hover:bg-[#FCD34D]">
        <h3 className="text-lg font-bold text-black dark:text-white dark:group-hover:text-black">{service.title}</h3>
        <div className="mt-3 flex items-center justify-between">
          <div className="h-0.5 w-10 bg-black/20 transition-all duration-300 group-hover:w-24" />
          {service.highlighted ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-700 group-hover:text-black dark:text-[#FCD34D] dark:group-hover:text-black">
              Ver detalhes
              <ArrowRight size={14} />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (!service.href) {
    return card;
  }

  return (
    <a href={service.href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]">
      {card}
    </a>
  );
}

export function ServicesCarousel({
  services,
  autoplayMs = 5000,
  className,
}: ServicesCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const hasMultipleServices = services.length > 1;

  return (
    <div className={cn("relative", className)}>
      <Swiper
        modules={[Navigation, Autoplay]}
        slidesPerView={1}
        spaceBetween={24}
        loop={hasMultipleServices}
        autoplay={
          hasMultipleServices
            ? {
                delay: autoplayMs,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }
            : false
        }
        navigation={{
          prevEl: ".services-nav-prev",
          nextEl: ".services-nav-next",
        }}
        breakpoints={{
          640: {
            slidesPerView: 2,
            spaceBetween: 24,
          },
          1024: {
            slidesPerView: 3,
            spaceBetween: 24,
          },
        }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        className="!px-4"
      >
        {services.map((service, index) => (
          <SwiperSlide key={`service-${index}`}>
            <ServiceCard service={service} />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation Buttons */}
      {hasMultipleServices && (
        <>
          <button
            type="button"
            className="services-nav-prev absolute left-0 top-1/2 z-10 -translate-y-1/2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-lg transition-colors hover:bg-[#FCD34D] dark:border-white/10 dark:bg-[#1A1A1A] dark:text-white dark:hover:bg-[#FCD34D] lg:flex"
            aria-label="Serviço anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="services-nav-next absolute right-0 top-1/2 z-10 -translate-y-1/2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-lg transition-colors hover:bg-[#FCD34D] dark:border-white/10 dark:bg-[#1A1A1A] dark:text-white dark:hover:bg-[#FCD34D] lg:flex"
            aria-label="Próximo serviço"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
}