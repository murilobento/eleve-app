"use client";

type GrainOverlayProps = {
  className?: string;
  opacity?: number;
};

export function GrainOverlay({ className, opacity = 0.03 }: GrainOverlayProps) {
  return (
    <div
      className={className}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}
