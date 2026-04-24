"use client";

import * as React from "react";
import { useInView } from "motion/react";

type CountUpProps = {
  target: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  decimals?: number;
};

export function CountUp({
  target,
  duration = 2,
  suffix = "",
  prefix = "",
  className,
  decimals = 0,
}: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = React.useState("0");

  React.useEffect(() => {
    if (!isInView) return;

    const startTime = performance.now();
    const ms = duration * 1000;

    const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / ms, 1);
      const eased = easeOutExpo(progress);
      const current = eased * target;

      setDisplay(decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString("pt-BR"));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [isInView, target, duration, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
