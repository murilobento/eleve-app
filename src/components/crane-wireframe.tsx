"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

type CraneControls = {
  baseRotation: number;
  lift: number;
  extension: number;
};

type SliderControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  precision?: number;
  onChange: (value: number) => void;
};

const HOOK_LENGTH = 2;

function CylinderBetween({
  from,
  to,
  radius,
  color,
  metalness = 0.8,
  roughness = 0.25,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  radius: number;
  color: string;
  metalness?: number;
  roughness?: number;
}) {
  const { midpoint, length, quaternion } = React.useMemo(() => {
    const direction = new THREE.Vector3().subVectors(to, from);
    const cylinderLength = Math.max(direction.length(), 0.001);
    const cylinderMidpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const cylinderQuaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );

    return {
      midpoint: cylinderMidpoint,
      length: cylinderLength,
      quaternion: cylinderQuaternion,
    };
  }, [from, to]);

  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 16]} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

function Wheel({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, -0.25, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.55, 0.55, 0.45, 28]} />
      <meshStandardMaterial color="#171717" metalness={0.65} roughness={0.35} />
    </mesh>
  );
}

function Outrigger({ side, z }: { side: 1 | -1; z: number }) {
  return (
    <group position={[side * 1.25, 0.05, z]}>
      <mesh position={[side * 0.55, 0, 0]} castShadow>
        <boxGeometry args={[1.7, 0.3, 0.32]} />
        <meshStandardMaterial color="#1f2933" metalness={0.75} roughness={0.28} />
      </mesh>
      <mesh position={[side * 1.35, -0.35, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.18, 18]} />
        <meshStandardMaterial color="#111827" metalness={0.75} roughness={0.24} />
      </mesh>
    </group>
  );
}

function CraneModel({ controls }: { controls: CraneControls }) {
  const rootRef = React.useRef<THREE.Group>(null);
  const baseRotation = THREE.MathUtils.degToRad(controls.baseRotation);
  const lift = THREE.MathUtils.degToRad(controls.lift);
  const extension = controls.extension;

  useFrame(({ clock }) => {
    if (!rootRef.current) {
      return;
    }

    rootRef.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.05;
  });

  const pistonStart = React.useMemo(() => new THREE.Vector3(0, 0, -1), []);
  const pistonEnd = React.useMemo(() => {
    const armTarget = new THREE.Vector3(0, 0.5, -2.5);
    armTarget.applyEuler(new THREE.Euler(lift, 0, 0));
    armTarget.add(new THREE.Vector3(0, 0.8, 0));
    return armTarget;
  }, [lift]);

  return (
    <group ref={rootRef} position={[0.2, -1.25, 0]} rotation={[0.15, -0.55, 0]} scale={0.34}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 12, 8]} intensity={2.2} castShadow />
      <pointLight position={[-5, 4, 5]} intensity={1.1} color="#FCD34D" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]} receiveShadow>
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial color="#111111" roughness={0.85} transparent opacity={0.38} />
      </mesh>
      <gridHelper args={[24, 24, "#4B5563", "#1F2937"]} position={[0, -0.84, 0]} />

      <group>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 1.15, 9.5]} />
          <meshStandardMaterial color="#FCD34D" metalness={0.34} roughness={0.42} />
        </mesh>

        {[3.3, 1.35, -1.85, -3.55].map((z) => (
          <React.Fragment key={z}>
            <Wheel x={-2.15} z={z} />
            <Wheel x={2.15} z={z} />
          </React.Fragment>
        ))}

        <mesh position={[0, 1.8, 3.25]} castShadow>
          <boxGeometry args={[3.7, 1.75, 2.25]} />
          <meshStandardMaterial color="#FCD34D" metalness={0.32} roughness={0.42} />
        </mesh>
        <mesh position={[0, 1.95, 4.4]}>
          <boxGeometry args={[3.2, 1.05, 0.08]} />
          <meshStandardMaterial color="#8fd3ff" transparent opacity={0.58} roughness={0.08} />
        </mesh>

        <Outrigger side={1} z={2.85} />
        <Outrigger side={-1} z={2.85} />
        <Outrigger side={1} z={-3.05} />
        <Outrigger side={-1} z={-3.05} />

        <group position={[0, 1.05, -1.35]} rotation={[0, baseRotation, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[1.65, 1.75, 0.42, 36]} />
            <meshStandardMaterial color="#18181B" metalness={0.82} roughness={0.24} />
          </mesh>

          <mesh position={[1.55, 1.15, 0.05]} castShadow>
            <boxGeometry args={[1.45, 1.85, 2.25]} />
            <meshStandardMaterial color="#FCD34D" metalness={0.34} roughness={0.42} />
          </mesh>
          <mesh position={[1.55, 1.35, 1.2]}>
            <boxGeometry args={[1.08, 0.78, 0.08]} />
            <meshStandardMaterial color="#8fd3ff" transparent opacity={0.55} roughness={0.1} />
          </mesh>

          <CylinderBetween from={pistonStart} to={pistonEnd} radius={0.18} color="#D1D5DB" />

          <group position={[0, 0.8, 0]} rotation={[lift, 0, 0]}>
            <mesh position={[0, 0, -3.45]} castShadow receiveShadow>
              <boxGeometry args={[1.15, 1.05, 7.3]} />
              <meshStandardMaterial color="#FCD34D" metalness={0.34} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, -4.4 - extension]} castShadow receiveShadow>
              <boxGeometry args={[0.82, 0.78, 7.2]} />
              <meshStandardMaterial color="#F8FAFC" metalness={0.92} roughness={0.12} />
            </mesh>

            <group position={[0, 0, -8.15 - extension]} rotation={[-lift, 0, 0]}>
              <mesh position={[0, -HOOK_LENGTH / 2, 0]} castShadow>
                <cylinderGeometry args={[0.025, 0.025, HOOK_LENGTH, 10]} />
                <meshBasicMaterial color="#0F172A" />
              </mesh>
              <mesh position={[0, -HOOK_LENGTH - 0.35, 0]} castShadow>
                <boxGeometry args={[0.55, 0.55, 0.36]} />
                <meshStandardMaterial color="#FCD34D" metalness={0.35} roughness={0.4} />
              </mesh>
              <mesh position={[0, -HOOK_LENGTH - 0.88, 0]} rotation={[0, 0, Math.PI / 7]} castShadow>
                <torusGeometry args={[0.26, 0.055, 12, 22, Math.PI * 1.35]} />
                <meshStandardMaterial color="#171717" metalness={0.85} roughness={0.22} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  precision = 0,
  onChange,
}: SliderControlProps) {
  const displayValue = precision > 0 ? value.toFixed(precision) : Math.round(value).toString();

  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
        <span>{label}</span>
        <span className="text-[#FCD34D]">
          {displayValue}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="h-1.5 w-full cursor-pointer accent-[#FCD34D]"
      />
    </label>
  );
}

export function CraneWireframe({ className }: { className?: string }) {
  const [controls, setControls] = React.useState<CraneControls>({
    baseRotation: 0,
    lift: 20,
    extension: 0,
  });

  const updateControl = React.useCallback((key: keyof CraneControls, value: number) => {
    setControls((current) => ({ ...current, [key]: value }));
  }, []);

  return (
    <div className={className} style={{ position: "relative" }}>
      <Canvas
        camera={{ position: [7.5, 5.4, 10.5], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
        shadows
        style={{ background: "transparent", width: "100%", height: "100%" }}
        dpr={[1, 1.6]}
      >
        <React.Suspense fallback={null}>
          <CraneModel controls={controls} />
        </React.Suspense>
      </Canvas>

      <div className="pointer-events-auto absolute bottom-2 right-2 w-64 rounded-md border border-white/15 bg-black/55 p-3 text-white shadow-2xl backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FCD34D]">
            Crane control
          </p>
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">v2.0</span>
        </div>
        <div className="space-y-3">
          <SliderControl
            label="Giro"
            min={-180}
            max={180}
            value={controls.baseRotation}
            unit="deg"
            onChange={(value) => updateControl("baseRotation", value)}
          />
          <SliderControl
            label="Elevação"
            min={5}
            max={65}
            value={controls.lift}
            unit="deg"
            onChange={(value) => updateControl("lift", value)}
          />
          <SliderControl
            label="Extensão"
            min={0}
            max={5}
            step={0.1}
            value={controls.extension}
            unit="m"
            precision={1}
            onChange={(value) => updateControl("extension", value)}
          />
        </div>
      </div>
    </div>
  );
}
