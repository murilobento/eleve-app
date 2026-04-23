"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { cn } from "@/lib/utils";

import "swiper/css";
import "swiper/css/navigation";

type EquipmentCard = {
  tag: string;
  title: string;
  capacity?: string;
  technicalInfo?: string;
  manualUrl?: string | null;
  img: string;
  href?: string;
  imageAlt?: string | null;
};

type EquipmentCarouselProps = {
  equipment: EquipmentCard[];
  autoplayMs?: number;
  className?: string;
};

function EquipmentCard({ equipment }: { equipment: EquipmentCard }) {
  const content = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={equipment.img}
          alt={equipment.imageAlt?.trim() || equipment.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute right-4 top-4 rounded-sm bg-[#FCD34D] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-950">
          {equipment.tag}
        </div>
      </div>
      <div className="p-5">
        {equipment.capacity ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
            {equipment.capacity}
          </p>
        ) : null}
        <h3 className={cn("text-lg font-bold text-black transition-colors group-hover:text-amber-700 dark:text-white dark:group-hover:text-[#FCD34D]", equipment.capacity ? "mt-2" : "")}>
          {equipment.title}
        </h3>
        <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4 dark:border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
            Ver detalhes
          </span>
          <ChevronRight size={18} className="text-amber-700 dark:text-[#FCD34D]" />
        </div>
      </div>
    </>
  );

  return (
    <article className="group w-full overflow-hidden rounded-2xl border border-black/5 bg-white text-left shadow-lg shadow-black/5 transition-transform duration-300 hover:-translate-y-1 dark:border-white/5 dark:bg-[#1A1A1A] dark:shadow-black/20">
      {equipment.href ? (
        <a
          href={equipment.href}
          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
        >
          {content}
        </a>
      ) : (
        <div className="block w-full text-left">{content}</div>
      )}
    </article>
  );
}

export function EquipmentCarousel({
  equipment,
  autoplayMs = 5000,
  className,
}: EquipmentCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const hasMultipleEquipment = equipment.length > 1;

  return (
    <div className={cn("relative", className)}>
      <Swiper
        modules={[Navigation, Autoplay]}
        slidesPerView={1}
        spaceBetween={24}
        loop={hasMultipleEquipment}
        autoplay={
          hasMultipleEquipment
            ? {
                delay: autoplayMs,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }
            : false
        }
        navigation={{
          prevEl: ".equipment-nav-prev",
          nextEl: ".equipment-nav-next",
        }}
        breakpoints={{
          640: {
            slidesPerView: equipment.length > 1 ? 2 : 1,
          },
          1024: {
            slidesPerView: equipment.length > 3 ? 4 : equipment.length,
            spaceBetween: 24,
          },
        }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        className="!px-4"
      >
        {equipment.map((item, index) => (
          <SwiperSlide key={`equipment-${index}`}>
            <EquipmentCard equipment={item} />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation Buttons */}
      {hasMultipleEquipment && (
        <>
          <button
            type="button"
            className="equipment-nav-prev absolute left-0 top-1/2 z-10 -translate-y-1/2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-lg transition-colors hover:bg-[#FCD34D] dark:border-white/10 dark:bg-[#1A1A1A] dark:text-white dark:hover:bg-[#FCD34D] lg:flex"
            aria-label="Equipamento anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="equipment-nav-next absolute right-0 top-1/2 z-10 -translate-y-1/2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-lg transition-colors hover:bg-[#FCD34D] dark:border-white/10 dark:bg-[#1A1A1A] dark:text-white dark:hover:bg-[#FCD34D] lg:flex"
            aria-label="Próximo equipamento"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
}