"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

function useHasHover() {
  const [hasHover, setHasHover] = React.useState(true);
  React.useEffect(() => {
    const mql = window.matchMedia("(hover: hover)");
    setHasHover(mql.matches);
    const handler = (e: MediaQueryListEvent) => setHasHover(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return hasHover;
}

type MagneticButtonProps = {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  as?: React.ElementType;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: React.MouseEventHandler;
} & React.HTMLAttributes<HTMLElement>;

export function MagneticButton({
  children,
  className,
  strength = 0.3,
  onClick,
  ...props
}: MagneticButtonProps) {
  const hasHover = useHasHover();
  const ref = React.useRef<HTMLButtonElement | HTMLAnchorElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!hasHover || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * strength);
      y.set((e.clientY - centerY) * strength);
    },
    [strength, x, y, hasHover],
  );

  const handleMouseLeave = React.useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const isAnchor = "href" in props;

  const Component = isAnchor ? motion.a : motion.button;

  return (
    <Component
      ref={ref as React.Ref<HTMLButtonElement & HTMLAnchorElement>}
      className={className}
      style={hasHover ? { x: springX, y: springY } : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  );
}
