"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";

type ScrollRevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  duration?: number;
  once?: boolean;
  as?: React.ElementType;
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 40,
  duration = 0.7,
  once = true,
  as = "div",
}: ScrollRevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-60px" });

  const offsets: Record<string, { x: number; y: number }> = {
    up: { x: 0, y: distance },
    down: { x: 0, y: -distance },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  };

  const offset = offsets[direction];

  return (
    <motion.div
      ref={ref}
      as={as}
      className={className}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: offset.x, y: offset.y }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  );
}

type StaggerContainerProps = {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  as?: React.ElementType;
};

export function StaggerContainer({
  children,
  className,
  stagger = 0.1,
  delay = 0,
  as = "div",
}: StaggerContainerProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      as={as}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
