"use client";

import { Float, Line, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type { ReactElement } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function PixelGrid() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 200;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const positions = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 12,
      z: (Math.random() - 0.5) * 10 - 3,
      speed: Math.random() * 0.3 + 0.1,
      phase: Math.random() * Math.PI * 2,
      scale: Math.random() * 0.08 + 0.03,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    positions.forEach((pos, i) => {
      dummy.position.set(
        pos.x,
        pos.y + Math.sin(t * pos.speed + pos.phase) * 0.5,
        pos.z,
      );
      dummy.scale.setScalar(pos.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#c4722a" transparent opacity={0.4} />
    </instancedMesh>
  );
}

function FloatingText() {
  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <Text
        fontSize={0.8}
        color="#f0d5a8"
        anchorX="center"
        anchorY="middle"
        font="/fonts/PressStart2P-Regular.ttf"
        letterSpacing={0.05}
      >
        {`< OM />`}
        <meshBasicMaterial color="#c4722a" transparent opacity={0.9} />
      </Text>
    </Float>
  );
}

function RetroGrid() {
  const gridRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!gridRef.current) return;
    const t = clock.getElapsedTime();
    gridRef.current.position.z = (t * 0.5) % 2;
  });

  const lines = useMemo(() => {
    const pts: ReactElement[] = [];
    for (let i = -10; i <= 10; i++) {
      pts.push(
        <Line
          key={`v${i}`}
          points={[
            [i, -3, -10],
            [i, -3, 5],
          ]}
          color="#c4722a"
          transparent
          opacity={0.15}
          lineWidth={1}
        />,
      );
    }
    for (let j = -10; j <= 5; j++) {
      pts.push(
        <Line
          key={`h${j}`}
          points={[
            [-10, -3, j],
            [10, -3, j],
          ]}
          color="#c4722a"
          transparent
          opacity={0.1}
          lineWidth={1}
        />,
      );
    }
    return pts;
  }, []);

  return <group ref={gridRef}>{lines}</group>;
}

function GlowOrbs() {
  const orbsRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!orbsRef.current) return;
    orbsRef.current.rotation.y = clock.getElapsedTime() * 0.1;
  });

  return (
    <group ref={orbsRef}>
      {[
        { pos: [3, 1, -2] as [number, number, number], color: "#c4722a" },
        { pos: [-3, 0.5, -3] as [number, number, number], color: "#f0a040" },
        { pos: [0, 2, -4] as [number, number, number], color: "#d4882a" },
      ].map((orb, i) => (
        <Float key={i} speed={2} rotationIntensity={0} floatIntensity={1}>
          <mesh position={orb.pos}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color={orb.color} transparent opacity={0.7} />
          </mesh>
          <pointLight
            position={orb.pos}
            color={orb.color}
            intensity={0.8}
            distance={5}
          />
        </Float>
      ))}
    </group>
  );
}

export default function Scene3D() {
  return (
    <div className="w-full h-[300px] sm:h-[400px] rounded-xl overflow-hidden border border-[#2a1e10] bg-[#0a0806] relative">
      <div className="scanline-overlay" />
      <Canvas
        camera={{ position: [0, 1, 6], fov: 60 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "transparent" }}
      >
        <color attach="background" args={["#0a0806"]} />
        <fog attach="fog" args={["#0a0806", 5, 15]} />
        <ambientLight intensity={0.3} />
        <PixelGrid />
        <FloatingText />
        <RetroGrid />
        <GlowOrbs />
      </Canvas>
      {/* Corner labels */}
      <div className="absolute top-3 left-3 font-mono text-[8px] text-[#4a3c28] tracking-wider z-10">
        THREE.JS / R3F
      </div>
      <div className="absolute bottom-3 right-3 font-mono text-[8px] text-[#4a3c28] tracking-wider z-10">
        WEBGL 2.0
      </div>
    </div>
  );
}
