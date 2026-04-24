"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function TubeLine({ points, radius, color }: { points: THREE.Vector3[]; radius: number; color: THREE.Color }) {
  const geo = React.useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0);
    return new THREE.TubeGeometry(curve, Math.max(points.length * 8, 2), radius, 8, false);
  }, [points, radius]);

  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function CraneBoom() {
  const groupRef = React.useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.3) * 0.02;
    }
  });

  const amber = new THREE.Color("#FCD34D");
  const amberMid = new THREE.Color("#D4A72C");

  const R = 0.028;
  const R_THIN = 0.018;

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
      <group ref={groupRef} scale={[0.42, 0.42, 0.42]} position={[0, -0.2, 0]}>
        <TubeLine points={[
          new THREE.Vector3(-1.8, -2.0, 0),
          new THREE.Vector3(1.8, -2.0, 0),
          new THREE.Vector3(1.8, -1.6, 0),
          new THREE.Vector3(-1.8, -1.6, 0),
          new THREE.Vector3(-1.8, -2.0, 0),
        ]} radius={R_THIN} color={amberMid} />

        <TubeLine points={[
          new THREE.Vector3(0, -1.6, 0),
          new THREE.Vector3(0, 2.5, 0),
        ]} radius={R} color={amber} />

        <TubeLine points={[
          new THREE.Vector3(0, 2.5, 0),
          new THREE.Vector3(3.5, 1.2, 0),
        ]} radius={R} color={amber} />

        <TubeLine points={[
          new THREE.Vector3(0, 2.1, 0),
          new THREE.Vector3(3.5, 0.8, 0),
        ]} radius={R_THIN} color={amberMid} />

        <TubeLine points={[
          new THREE.Vector3(0, 2.3, 0),
          new THREE.Vector3(0.875, 2.25, 0),
          new THREE.Vector3(1.75, 2.1, 0),
          new THREE.Vector3(2.625, 1.95, 0),
          new THREE.Vector3(3.5, 1.0, 0),
        ]} radius={R_THIN} color={amberMid} />

        <TubeLine points={[
          new THREE.Vector3(0, 2.5, 0),
          new THREE.Vector3(-1.5, 2.8, 0),
        ]} radius={R_THIN} color={amberMid} />

        <TubeLine points={[
          new THREE.Vector3(-1.5, 2.8, 0),
          new THREE.Vector3(-1.8, 2.3, 0),
        ]} radius={R_THIN} color={amberMid} />

        <TubeLine points={[
          new THREE.Vector3(3.5, 1.2, 0),
          new THREE.Vector3(3.5, -0.5, 0),
        ]} radius={R_THIN} color={amber} />

        <TubeLine points={[
          new THREE.Vector3(3.3, -0.5, 0),
          new THREE.Vector3(3.5, -0.7, 0),
          new THREE.Vector3(3.7, -0.5, 0),
          new THREE.Vector3(3.6, -0.3, 0),
          new THREE.Vector3(3.4, -0.3, 0),
          new THREE.Vector3(3.3, -0.5, 0),
        ]} radius={R} color={amber} />

        <TubeLine points={[
          new THREE.Vector3(-1.5, 2.8, 0),
          new THREE.Vector3(0, 2.5, 0),
        ]} radius={R_THIN} color={amberMid} />

        <TubeLine points={[
          new THREE.Vector3(-1.5, 2.8, 0),
          new THREE.Vector3(3.5, 1.2, 0),
        ]} radius={R_THIN} color={amberMid} />

        <TubeLine points={[
          new THREE.Vector3(-1.8, 2.3, 0),
          new THREE.Vector3(-1.3, 2.3, 0),
          new THREE.Vector3(-1.3, 1.8, 0),
          new THREE.Vector3(-1.8, 1.8, 0),
          new THREE.Vector3(-1.8, 2.3, 0),
        ]} radius={R_THIN} color={amberMid} />

        <mesh position={[3.5, -0.55, 0]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshBasicMaterial color={amber} />
        </mesh>

        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color={amber} />
        </mesh>

        <mesh position={[-1.5, 2.8, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color={amberMid} />
        </mesh>

        <mesh position={[3.5, 1.2, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color={amber} />
        </mesh>
      </group>
    </Float>
  );
}

function MouseTracker({ children }: { children: React.ReactNode }) {
  const groupRef = React.useRef<THREE.Group>(null);

  useFrame(({ pointer }) => {
    if (groupRef.current) {
      const targetX = pointer.x * 0.15;
      const targetY = pointer.y * 0.1;
      groupRef.current.rotation.y += (targetX - groupRef.current.rotation.y) * 0.05;
      groupRef.current.rotation.x += (-targetY - groupRef.current.rotation.x) * 0.05;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

export function CraneWireframe({ className }: { className?: string }) {
  return (
    <div className={className} style={{ position: "relative" }} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 35 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent", width: "100%", height: "100%" }}
        dpr={[1, 2]}
      >
        <React.Suspense fallback={null}>
          <MouseTracker>
            <CraneBoom />
          </MouseTracker>
        </React.Suspense>
      </Canvas>
    </div>
  );
}
