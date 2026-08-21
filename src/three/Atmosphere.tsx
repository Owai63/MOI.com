import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sceneState } from './sceneState';

/* ------------------------------------------------------------------ */
/* Particles — slow-drifting data motes surrounding the monolith.      */
/* Custom point shader: soft discs, twinkle, depth fade, scroll        */
/* parallax. Allocation-free after construction.                       */
/* ------------------------------------------------------------------ */

const PARTICLE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  attribute float aSeed;
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vColor = aColor;
    vec3 p = position;
    float t = uTime * 0.14 + aSeed * 43.0;
    p.x += sin(t + aSeed * 6.283) * 0.4;
    p.y += sin(t * 0.7 + aSeed * 11.0) * 0.32 + uScroll * (0.9 + aSeed * 1.4);
    p.z += cos(t * 0.55 + aSeed * 8.0) * 0.4;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = max(0.1, -mv.z);
    gl_PointSize = aSize * (55.0 / dist);
    // fade very-near and far particles for depth
    vFade = smoothstep(2.6, 4.6, dist) * (1.0 - smoothstep(8.5, 12.5, dist));
    // slow twinkle, always positive
    vFade *= 0.55 + 0.45 * sin(uTime * (0.6 + aSeed) + aSeed * 20.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float dd = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.08, dd) * vFade;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor * 1.35, a * 0.5);
  }
`;

interface ParticlesProps {
  quality: 'high' | 'medium' | 'low';
}

export function Particles({ quality }: ParticlesProps) {
  const group = useRef<THREE.Group>(null);
  const dampedPx = useRef(0);
  const dampedScroll = useRef(0);

  const { geo, mat } = useMemo(() => {
    const count = quality === 'high' ? 240 : 120;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const cyan = new THREE.Color('#40e1d1');
    const ice = new THREE.Color('#bfe6ff');
    const amber = new THREE.Color('#f6a250');

    for (let i = 0; i < count; i++) {
      // annulus around the monolith so motes never sit right on the camera axis
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.4 + Math.pow(Math.random(), 0.7) * 4.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -1.4 + Math.random() * 4.2;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      seeds[i] = Math.random();
      // mostly fine motes, the occasional larger soft bokeh
      sizes[i] = 0.35 + Math.pow(Math.random(), 2.2) * 1.3;
      const r = Math.random();
      const c = r < 0.12 ? amber : r < 0.5 ? ice : cyan;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return { geo, mat };
  }, [quality]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((state, delta) => {
    const d = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    mat.uniforms.uTime.value = t;
    dampedScroll.current = THREE.MathUtils.damp(
      dampedScroll.current,
      sceneState.progress,
      3,
      d,
    );
    mat.uniforms.uScroll.value = dampedScroll.current;
    dampedPx.current = THREE.MathUtils.damp(
      dampedPx.current,
      sceneState.pointerX,
      3,
      d,
    );
    if (group.current) {
      group.current.rotation.y = t * 0.012 + dampedPx.current * 0.07;
    }
  });

  return (
    <group ref={group}>
      <points geometry={geo} material={mat} frustumCulled={false} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* GroundGlow — concentric light rings on the floor that breathe and   */
/* intensify as the monolith opens. Colours pushed >1 so bloom reads   */
/* them as light sources.                                              */
/* ------------------------------------------------------------------ */

const RING_CYAN = new THREE.Color('#3fe0d0').multiplyScalar(1.6);
const RING_AMBER = new THREE.Color('#f6a250').multiplyScalar(1.3);

export function GroundGlow({ y }: { y: number }) {
  const g = useRef<THREE.Group>(null);
  const ring1 = useRef<THREE.MeshBasicMaterial>(null);
  const ring2 = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, delta) => {
    const d = Math.min(delta, 1 / 30);
    const sep = sceneState.separation;
    const t = state.clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.1);
    if (ring1.current) {
      ring1.current.opacity = THREE.MathUtils.damp(
        ring1.current.opacity,
        0.1 + sep * 0.5 + pulse * 0.06,
        5,
        d,
      );
    }
    if (ring2.current) {
      ring2.current.opacity = THREE.MathUtils.damp(
        ring2.current.opacity,
        0.04 + sep * 0.22 + (1 - pulse) * 0.04,
        5,
        d,
      );
    }
    if (g.current) {
      const s = 1 + sep * 0.16 + Math.sin(t * 0.8) * 0.012;
      g.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={g} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[1.45, 1.475, 96]} />
        <meshBasicMaterial
          ref={ring1}
          color={RING_CYAN}
          transparent
          opacity={0}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[2.3, 2.318, 96]} />
        <meshBasicMaterial
          ref={ring2}
          color={RING_AMBER}
          transparent
          opacity={0}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
