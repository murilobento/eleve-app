"use client";

import { useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import "swiper/css";
import "swiper/css/navigation";

type EquipmentCard = {
  name: string;
  model: string;
  capacity: string;
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

function EquipmentCard({
  equipment,
  onOpenDetails,
}: {
  equipment: EquipmentCard;
  onOpenDetails?: () => void;
}) {
  return (
    <article className="group w-full overflow-hidden rounded-2xl border border-black/5 bg-white text-left shadow-lg shadow-black/5 transition-transform duration-300 hover:-translate-y-1 dark:border-white/5 dark:bg-[#1A1A1A] dark:shadow-black/20">
      <button
        type="button"
        onClick={onOpenDetails}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D]"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={equipment.img}
            alt={equipment.imageAlt?.trim() || equipment.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute right-4 top-4 rounded-sm bg-[#FCD34D] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-950">
            {equipment.capacity}
          </div>
        </div>
        <div className="p-5 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
            {equipment.model}
          </p>
          <h3 className="mt-2 text-lg font-bold text-black transition-colors group-hover:text-amber-700 dark:text-white dark:group-hover:text-[#FCD34D]">
            {equipment.name}
          </h3>
          <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
              Ver detalhes
            </span>
            <ChevronRight size={18} className="text-amber-700 dark:text-[#FCD34D]" />
          </div>
        </div>
      </button>
      {equipment.href ? (
        <a
          href={equipment.href}
          className="mx-5 mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-700 transition-colors hover:text-black dark:text-[#FCD34D] dark:hover:text-white"
        >
          Página do equipamento
          <ArrowRight size={14} />
        </a>
      ) : null}
    </article>
  );
}

function EquipmentDetailsModal({
  equipment,
  open,
  onOpenChange,
}: {
  equipment: EquipmentCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!equipment) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-3xl border-black/10 bg-white p-0 dark:border-white/10 dark:bg-[#121212]">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative h-full min-h-64">
            <img
              src={equipment.img}
              alt={equipment.imageAlt?.trim() || equipment.name}
              className="h-full w-full rounded-t-3xl object-cover md:rounded-l-3xl md:rounded-tr-none"
              referrerPolicy="no-referrer"
            />
            <div className="absolute left-4 top-4 rounded-sm bg-[#FCD34D] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-950">
              {equipment.capacity}
            </div>
          </div>
          <div className="p-6 md:p-8">
            <DialogHeader className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gray-500 dark:text-gray-400">
                {equipment.model}
              </p>
              <DialogTitle className="text-2xl font-black tracking-[-0.03em]">
                {equipment.name}
              </DialogTitle>
              <DialogDescription className="text-sm leading-7 text-gray-600 dark:text-gray-300">
                {equipment.technicalInfo}
              </DialogDescription>
            </DialogHeader>

            {equipment.manualUrl ? (
              <a
                href={equipment.manualUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-sm bg-[#FCD34D] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-gray-950 transition-colors hover:bg-[#F59E0B]"
              >
                Download manual
                <ArrowRight size={14} />
              </a>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EquipmentCarousel({
  equipment,
  autoplayMs = 5000,
  className,
}: EquipmentCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasMultipleEquipment = equipment.length > 1;

  const handleOpenDetails = (item: EquipmentCard) => {
    setSelectedEquipment(item);
    setIsModalOpen(true);
  };

  // Calculate responsive classes based on equipment count
  const getSlideClass = () => {
    const count = equipment.length;
    if (count <= 1) return "basis-full";
    if (count === 2) return "basis-[calc(50%-0.75rem)]";
    if (count === 3) return "basis-[calc(33.333%-1rem)]";
    return "basis-[calc(25%-1.125rem)]";
  };

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
            <div className={cn("w-full", getSlideClass())}>
              <EquipmentCard
                equipment={item}
                onOpenDetails={() => handleOpenDetails(item)}
              />
            </div>
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

      {/* Details Modal */}
      <EquipmentDetailsModal
        equipment={selectedEquipment}
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedEquipment(null);
          }
        }}
      />
    </div>
  );
}