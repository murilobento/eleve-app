"use client";

import * as React from "react";

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

type TiltCardProps = {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glare?: boolean;
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLElement>;

export function TiltCard({
  children,
  className,
  maxTilt = 6,
  glare = true,
  ...props
}: TiltCardProps) {
  const hasHover = useHasHover();
  const ref = React.useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = React.useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = React.useState(false);

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!hasHover || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setTilt({
        x: (y - 0.5) * -maxTilt * 2,
        y: (x - 0.5) * maxTilt * 2,
      });
      setGlarePos({ x: x * 100, y: y * 100 });
    },
    [maxTilt, hasHover],
  );

  const handleMouseLeave = React.useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => hasHover && setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: hasHover
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isHovered ? "scale3d(1.02, 1.02, 1.02)" : "scale3d(1, 1, 1)"}`
          : undefined,
        transition: "transform 0.15s ease-out",
        willChange: hasHover ? "transform" : undefined,
        position: "relative",
      }}
      {...props}
    >
      {children}
      {glare && isHovered && hasHover && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            borderRadius: "inherit",
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(252, 211, 77, 0.06), transparent 60%)`,
            transition: "background 0.15s ease-out",
          }}
        />
      )}
    </div>
  );
}
