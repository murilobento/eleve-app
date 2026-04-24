"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { cn } from "@/lib/utils";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

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
    <article className="group h-full rounded-2xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:border-[#FCD34D]/30 hover:shadow-lg hover:shadow-[#FCD34D]/5">
      <Quote size={40} className="mb-4 text-[#FCD34D] opacity-25" />
      <p className="min-h-[6rem] text-base leading-8 text-gray-600">"{testimonial.text}"</p>
      <div className="mt-6 flex items-center gap-4 border-t border-gray-100 pt-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#FCD34D]/30 bg-[#FCD34D]/10 text-sm font-black text-[#F59E0B]">
          {testimonial.name.charAt(0)}
        </div>
        <div>
          <p className="font-bold text-gray-900">{testimonial.name}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{testimonial.role}</p>
        </div>
      </div>
    </article>
  );
}

export function TestimonialsCarousel({ testimonials, autoplayMs = 5000, className }: TestimonialsCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const hasMultiple = testimonials.length > 1;
  const canLoop = testimonials.length > 3;

  return (
    <div className={cn("relative", className)}>
      <Swiper
        modules={[Navigation, Autoplay, Pagination]}
        slidesPerView={1} spaceBetween={24} loop={canLoop}
        autoplay={hasMultiple ? { delay: autoplayMs, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
        navigation={{ prevEl: ".testimonials-nav-prev", nextEl: ".testimonials-nav-next" }}
        pagination={{ el: ".testimonials-pagination", clickable: true, bulletClass: "swiper-pagination-bullet !bg-gray-300 !opacity-100 !w-2 !h-2", bulletActiveClass: "swiper-pagination-bullet-active !bg-[#FCD34D] !w-6 !rounded-full" }}
        breakpoints={{ 640: { slidesPerView: testimonials.length > 1 ? 2 : 1 }, 860: { slidesPerView: testimonials.length > 2 ? 2 : testimonials.length }, 1024: { slidesPerView: testimonials.length > 3 ? 3 : testimonials.length } }}
        onSwiper={(swiper) => { swiperRef.current = swiper; }}
        className="!px-4"
      >
        {testimonials.map((testimonial, index) => (
          <SwiperSlide key={`testimonial-${index}`}><TestimonialCardView testimonial={testimonial} /></SwiperSlide>
        ))}
      </Swiper>
      {hasMultiple && (
        <>
          <button type="button" className="testimonials-nav-prev absolute left-0 top-1/2 z-10 -translate-y-1/2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-[#FCD34D] hover:bg-[#FCD34D] hover:text-gray-950 md:flex" aria-label="Depoimento anterior"><ChevronLeft size={18} /></button>
          <button type="button" className="testimonials-nav-next absolute right-0 top-1/2 z-10 -translate-y-1/2 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-[#FCD34D] hover:bg-[#FCD34D] hover:text-gray-950 md:flex" aria-label="Próximo depoimento"><ChevronRight size={18} /></button>
          <div className="testimonials-pagination mt-6 flex justify-center gap-2 md:hidden" />
        </>
      )}
    </div>
  );
}
