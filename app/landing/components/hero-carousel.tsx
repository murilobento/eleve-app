"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { cn } from "@/lib/utils";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

type HeroCarouselProps = {
  images: string[];
  intervalMs?: number;
  className?: string;
};

export function HeroCarousel({
  images,
  intervalMs = 5000,
  className,
}: HeroCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const totalImages = images.length;
  const hasMultipleImages = totalImages > 1;

  if (!hasMultipleImages) {
    return (
      <div className={cn("absolute inset-0", className)}>
        <img
          src={images[0]}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      className={cn("absolute inset-0", className)}
      onMouseEnter={() => swiperRef.current?.autoplay.stop()}
      onMouseLeave={() => swiperRef.current?.autoplay.start()}
    >
      <Swiper
        modules={[Navigation, Autoplay, Pagination]}
        slidesPerView={1}
        loop={true}
        autoplay={{
          delay: intervalMs,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        navigation={{
          prevEl: ".hero-nav-prev",
          nextEl: ".hero-nav-next",
        }}
        pagination={{
          el: ".hero-pagination",
          clickable: true,
          bulletClass: "swiper-pagination-bullet !bg-white/50 !opacity-100 !bg-white",
          bulletActiveClass: "swiper-pagination-bullet-active !bg-[#FCD34D]",
        }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        className="h-full w-full"
      >
        {images.map((image, index) => (
          <SwiperSlide key={`hero-${index}`}>
            <img
              src={image}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation Buttons */}
      {hasMultipleImages && (
        <>
          <button
            type="button"
            className="hero-nav-prev absolute left-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
            aria-label="Imagem anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="hero-nav-next absolute right-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
            aria-label="Próxima imagem"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      <div className="hero-pagination absolute bottom-4 left-1/2 z-20 -translate-x-1/2" />
    </div>
  );
}