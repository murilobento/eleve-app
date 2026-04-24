"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { cn } from "@/lib/utils";
import { TiltCard } from "@/components/tilt-card";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

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

function EquipmentCardView({ equipment }: { equipment: EquipmentCard }) {
  const content = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl">
        <img src={equipment.img} alt={equipment.imageAlt?.trim() || equipment.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
        <div className="absolute right-4 top-4 rounded-sm bg-[#FCD34D] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-950">{equipment.tag}</div>
      </div>
      <div className="p-5">
        {equipment.capacity ? <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">{equipment.capacity}</p> : null}
        <h3 className={cn("min-h-[3.5rem] line-clamp-2 text-lg font-bold tracking-tight text-gray-900 transition-colors group-hover:text-amber-700", equipment.capacity ? "mt-2" : "")}>{equipment.title}</h3>
        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">Ver detalhes</span>
          <ChevronRight size={18} className="text-amber-600 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </>
  );

  return (
    <TiltCard className="group w-full overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm" maxTilt={5}>
      {equipment.href ? <a href={equipment.href} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]">{content}</a> : <div className="block w-full text-left">{content}</div>}
    </TiltCard>
  );
}

export function EquipmentCarousel({ equipment, autoplayMs = 5000, className }: EquipmentCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const hasMultiple = equipment.length > 1;

  return (
    <div className={cn("relative", className)}>
      <Swiper
        modules={[Navigation, Autoplay, Pagination]}
        slidesPerView={1} spaceBetween={24} loop={hasMultiple}
        autoplay={hasMultiple ? { delay: autoplayMs, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
        navigation={{ prevEl: ".equipment-nav-prev", nextEl: ".equipment-nav-next" }}
        pagination={{ el: ".equipment-pagination", clickable: true, bulletClass: "swiper-pagination-bullet !bg-gray-300 !opacity-100 !w-2 !h-2", bulletActiveClass: "swiper-pagination-bullet-active !bg-[#FCD34D] !w-6 !rounded-full" }}
        breakpoints={{ 640: { slidesPerView: equipment.length > 1 ? 2 : 1 }, 860: { slidesPerView: equipment.length > 2 ? 3 : equipment.length, spaceBetween: 24 }, 1024: { slidesPerView: equipment.length > 3 ? 4 : equipment.length, spaceBetween: 24 } }}
        onSwiper={(swiper) => { swiperRef.current = swiper; }}
        className="!px-4"
      >
        {equipment.map((item, index) => (
          <SwiperSlide key={`equipment-${index}`}><EquipmentCardView equipment={item} /></SwiperSlide>
        ))}
      </Swiper>
      {hasMultiple && (
        <>
          <button type="button" className="equipment-nav-prev absolute left-0 top-1/2 z-10 -translate-y-1/2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-[#FCD34D] hover:bg-[#FCD34D] hover:text-gray-950 md:flex" aria-label="Equipamento anterior"><ChevronLeft size={18} /></button>
          <button type="button" className="equipment-nav-next absolute right-0 top-1/2 z-10 -translate-y-1/2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-[#FCD34D] hover:bg-[#FCD34D] hover:text-gray-950 md:flex" aria-label="Próximo equipamento"><ChevronRight size={18} /></button>
          <div className="equipment-pagination mt-6 flex justify-center gap-2 md:hidden" />
        </>
      )}
    </div>
  );
}
