'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface TiltVector {
  x: number;
  y: number;
}

interface MapTiltSceneProps {
  tilt: TiltVector;
  intensity?: number;
  subtle?: boolean;
}

function HoloCard({ tilt, intensity, subtle }: { tilt: TiltVector; intensity: number; subtle: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) {
      return;
    }

    const xTarget = tilt.y * (subtle ? 0.08 : 0.16) * intensity;
    const yTarget = -tilt.x * (subtle ? 0.11 : 0.2) * intensity;

    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, xTarget, 5.8, delta);
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, yTarget, 5.8, delta);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, -0.12]}>
        <planeGeometry args={[7.8, 9.2, 1, 1]} />
        <meshPhysicalMaterial
          color="black"
          transparent
          roughness={subtle ? 0.26 : 0.14}
          metalness={0.22}
          clearcoat={1}
          clearcoatRoughness={subtle ? 0.2 : 0.12}
          reflectivity={0.75}
        />
      </mesh>

      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[7.4, 8.8, 1, 1]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={subtle ? 0.12 : 0.18} />
      </mesh>

      <lineSegments position={[0, 0, 0.04]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(7.4, 8.8)]} />
        <lineBasicMaterial color="#c4b5fd" transparent opacity={subtle ? 0.46 : 0.68} />
      </lineSegments>
    </group>
  );
}

function DriftParticles({ tilt, intensity, subtle }: { tilt: TiltVector; intensity: number; subtle: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = subtle ? 76 : 110;
    const arr = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 8.8;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 9.8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
    }

    return arr;
  }, [subtle]);

  useFrame((_, delta) => {
    if (!pointsRef.current) {
      return;
    }

    pointsRef.current.rotation.z += delta * (subtle ? 0.014 : 0.03);
    pointsRef.current.rotation.x = THREE.MathUtils.damp(
      pointsRef.current.rotation.x,
      tilt.y * (subtle ? 0.05 : 0.1) * intensity,
      4.6,
      delta,
    );
    pointsRef.current.rotation.y = THREE.MathUtils.damp(
      pointsRef.current.rotation.y,
      -tilt.x * (subtle ? 0.07 : 0.13) * intensity,
      4.6,
      delta,
    );
  });

  return (
    <points ref={pointsRef} position={[0, 0, 0.25]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#a5f3fc" size={subtle ? 0.038 : 0.05} transparent opacity={subtle ? 0.68 : 0.85} depthWrite={false} />
    </points>
  );
}

export default function MapTiltScene({ tilt, intensity = 1, subtle = true }: MapTiltSceneProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 6], fov: 34 }} gl={{ alpha: true, antialias: true }} dpr={[1, 1.6]}>
        <ambientLight intensity={subtle ? 0.62 : 0.8} />
        <directionalLight position={[2.8, 2.4, 5.5]} intensity={subtle ? 0.78 : 1.05} color="#ddd6fe" />
        <pointLight position={[-2.4, -1.8, 2.2]} intensity={subtle ? 0.6 : 0.85} color="#67e8f9" />
        <pointLight position={[1.8, -2.6, 1.3]} intensity={subtle ? 0.3 : 0.5} color="#bfdbfe" />
        <HoloCard tilt={tilt} intensity={intensity} subtle={subtle} />
        <DriftParticles tilt={tilt} intensity={intensity} subtle={subtle} />
      </Canvas>
    </div>
  );
}
