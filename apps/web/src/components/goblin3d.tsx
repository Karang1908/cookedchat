'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

const CALM = new THREE.Color('#5865f2');
const HOT = new THREE.Color('#ff5a4d');

/** The GC Goblin: a procedural mascot (no model file to load). Follows the pointer, gets angrier with `heat` (0-1). */
function Goblin({ heat }: { heat: number }) {
  const group = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const eyes = useRef<THREE.Group>(null);
  const body = useRef<{ color: THREE.Color; distort: number; speed: number }>(null);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.7, 4, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.35, 4, dt);
    g.position.x = Math.sin(t * 45) * 0.04 * heat * heat;
    const blink = t % 4 > 3.88 ? 0.08 : 1;
    if (eyes.current) eyes.current.scale.y = THREE.MathUtils.damp(eyes.current.scale.y, blink, 30, dt);
    if (mouth.current) mouth.current.scale.y = THREE.MathUtils.damp(mouth.current.scale.y, 0.18 + heat * 0.75 + Math.sin(t * 3) * 0.03, 8, dt);
    if (body.current) {
      body.current.color.lerpColors(CALM, HOT, heat);
      body.current.distort = THREE.MathUtils.damp(body.current.distort, 0.3 + heat * 0.4, 3, dt);
      body.current.speed = 1.6 + heat * 5;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.25} floatIntensity={0.8}>
      <group ref={group}>
        <mesh>
          <icosahedronGeometry args={[1.35, 14]} />
          <MeshDistortMaterial ref={body as never} color="#5865f2" roughness={0.22} metalness={0.15} distort={0.3} speed={1.6} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 1.5, 0.55, 0]} rotation={[0, 0, side * -1.15]}>
            <coneGeometry args={[0.28, 0.95, 10]} />
            <meshStandardMaterial color="#8b94ff" roughness={0.4} />
          </mesh>
        ))}
        <group ref={eyes} position={[0, 0.25, 1.1]}>
          {[-0.48, 0.48].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh>
                <sphereGeometry args={[0.3, 24, 24]} />
                <meshStandardMaterial color="#ffffff" roughness={0.2} />
              </mesh>
              <mesh position={[0, 0, 0.24]}>
                <sphereGeometry args={[0.13, 16, 16]} />
                <meshStandardMaterial color="#07071a" />
              </mesh>
            </group>
          ))}
        </group>
        <mesh ref={mouth} position={[0, -0.45, 1.22]} scale={[1, 0.2, 1]}>
          <sphereGeometry args={[0.42, 24, 16]} />
          <meshStandardMaterial color="#1a0710" roughness={0.6} />
        </mesh>
      </group>
    </Float>
  );
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function Goblin3DInner({ heat = 0, className }: { heat?: number; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [gl, setGl] = useState<boolean | null>(null);

  useEffect(() => {
    setGl(hasWebGL());
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className={className}>
      {gl === false ? (
        <div className="grid h-full w-full place-items-center text-8xl" role="img" aria-label="goblin">👹</div>
      ) : gl ? (
        <Canvas dpr={[1, 1.5]} frameloop={visible ? 'always' : 'never'} camera={{ position: [0, 0, 5.2], fov: 40 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 4, 5]} intensity={2.4} />
          <pointLight position={[-4, -2, 3]} color="#eb459e" intensity={40} />
          <pointLight position={[4, -3, 2]} color="#57f2a0" intensity={22} />
          <Goblin heat={heat} />
        </Canvas>
      ) : null}
    </div>
  );
}

export const Goblin3D = dynamic(() => Promise.resolve(Goblin3DInner), { ssr: false });
