"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { cn } from "@/lib/utils";

import "swiper/css";
import "swiper/css/navigation";

type TestimonialCard = {
  name: string;
  role: string;
  text: string;
};

type TestimonialsCarouselProps = {
  testimonials: TestimonialCard[];
  autoplayMs?: number;
  className?: string;
};

function TestimonialCardView({ testimonial }: { testimonial: TestimonialCard }) {
  return (
    <article className="h-full rounded-[1.75rem] border border-black/5 bg-white p-8 shadow-lg shadow-black/5 dark:border-white/5 dark:bg-[#1A1A1A] dark:shadow-black/20">
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
  );
}

export function TestimonialsCarousel({
  testimonials,
  autoplayMs = 5000,
  className,
}: TestimonialsCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const hasMultipleTestimonials = testimonials.length > 1;

  return (
    <div className={cn("relative", className)}>
      <Swiper
        modules={[Navigation, Autoplay]}
        slidesPerView={1}
        spaceBetween={24}
        loop={hasMultipleTestimonials}
        autoplay={
          hasMultipleTestimonials
            ? {
                delay: autoplayMs,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }
            : false
        }
        navigation={{
          prevEl: ".testimonials-nav-prev",
          nextEl: ".testimonials-nav-next",
        }}
        breakpoints={{
          640: {
            slidesPerView: testimonials.length > 1 ? 2 : 1,
          },
          1024: {
            slidesPerView: testimonials.length > 3 ? 3 : testimonials.length,
          },
        }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        className="!px-4"
      >
        {testimonials.map((testimonial, index) => (
          <SwiperSlide key={`testimonial-${index}`}>
            <TestimonialCardView testimonial={testimonial} />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation Buttons */}
      {hasMultipleTestimonials && (
        <>
          <button
            type="button"
            className="testimonials-nav-prev absolute left-0 top-1/2 z-10 -translate-y-1/2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-lg transition-colors hover:bg-[#FCD34D] dark:border-white/10 dark:bg-[#1A1A1A] dark:text-white dark:hover:bg-[#FCD34D] lg:flex"
            aria-label="Depoimento anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="testimonials-nav-next absolute right-0 top-1/2 z-10 -translate-y-1/2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-lg transition-colors hover:bg-[#FCD34D] dark:border-white/10 dark:bg-[#1A1A1A] dark:text-white dark:hover:bg-[#FCD34D] lg:flex"
            aria-label="Próximo depoimento"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
}