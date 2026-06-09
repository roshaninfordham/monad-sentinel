"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function CargoNode() {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => ({
        angle: (index / 34) * Math.PI * 2,
        radius: 2.1 + (index % 5) * 0.13,
        y: Math.sin(index) * 0.8
      })),
    []
  );

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.18;
  });

  return (
    <group ref={group}>
      <Float speed={1.6} rotationIntensity={0.3} floatIntensity={0.35}>
        <mesh>
          <boxGeometry args={[2.2, 1.1, 1.05]} />
          <meshStandardMaterial color="#261457" emissive="#180a3f" metalness={0.45} roughness={0.24} />
        </mesh>
        {[-0.8, -0.4, 0, 0.4, 0.8].map((x) => (
          <mesh key={x} position={[x, 0, 0.56]}>
            <boxGeometry args={[0.045, 1.15, 0.035]} />
            <meshStandardMaterial color="#836EF9" emissive="#4125aa" />
          </mesh>
        ))}
        <mesh position={[0, 0.05, 0.61]}>
          <boxGeometry args={[0.42, 0.22, 0.04]} />
          <meshStandardMaterial color="#25F384" emissive="#25F384" emissiveIntensity={1.4} />
        </mesh>
      </Float>
      {[1.55, 1.85, 2.15].map((radius, index) => (
        <mesh key={radius} rotation={[Math.PI / 2 + index * 0.25, index * 0.4, 0]}>
          <torusGeometry args={[radius, 0.01, 8, 96]} />
          <meshBasicMaterial color={index === 1 ? "#25F384" : "#836EF9"} transparent opacity={0.55} />
        </mesh>
      ))}
      {nodes.map((node, index) => (
        <mesh key={index} position={[Math.cos(node.angle) * node.radius, node.y, Math.sin(node.angle) * node.radius]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial color={index % 4 === 0 ? "#4CC9F0" : "#25F384"} />
        </mesh>
      ))}
    </group>
  );
}

export function MonadOrbitalHero() {
  return (
    <Canvas camera={{ position: [0, 1.2, 5], fov: 44 }} dpr={[1, 1.6]}>
      <ambientLight intensity={0.35} />
      <pointLight position={[2, 3, 3]} intensity={4} color="#836EF9" />
      <pointLight position={[-2, -1, 2]} intensity={2} color="#25F384" />
      <Stars radius={30} depth={16} count={900} factor={2.6} saturation={0} fade speed={0.2} />
      <CargoNode />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.35} />
    </Canvas>
  );
}
