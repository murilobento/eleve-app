"use client";

import * as React from "react";
import { motion, useScroll, useSpring } from "motion/react";

export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className={className}
      style={{ scaleX, transformOrigin: "left" }}
    />
  );
}
