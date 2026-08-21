/* ============================================================================
   primitives — small shapes both devices are built out of
   ----------------------------------------------------------------------------
   Wires, moulded shells, fasteners, and the two "it is running" effects: an
   LED that actually pulses like firmware, and expanding rings for a radio.
   ========================================================================== */

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';

/* --- shells -------------------------------------------------------------- */

/** Moulded box with a real fillet. Injection-moulded enclosures have no sharp
 *  edges, and at this camera distance a chamfered highlight is most of what
 *  tells the eye "plastic" rather than "cube". */
export function Shell({
  size,
  radius = 0.0025,
  segments = 3,
  material,
  position = [0, 0, 0],
  rotation,
  castShadow = true,
  receiveShadow = false,
  children,
}: {
  size: [number, number, number];
  radius?: number;
  segments?: number;
  material: THREE.Material;
  position?: [number, number, number];
  rotation?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  children?: React.ReactNode;
}) {
  const geo = useMemo(
    () => new RoundedBoxGeometry(size[0], size[1], size[2], segments, radius),
    [size[0], size[1], size[2], segments, radius],
  );
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return (
    <group position={position} rotation={rotation as unknown as THREE.Euler}>
      <mesh
        geometry={geo}
        material={material}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
      />
      {children}
    </group>
  );
}

/* --- wiring -------------------------------------------------------------- */

/** A single conductor routed through space. Real looms sag and arc; straight
 *  cylinders between two points look like plumbing, so every wire here is a
 *  Catmull-Rom through hand-placed control points. */
export function Wire({
  points,
  radius = 0.0016,
  color = '#0a0b0d',
  segments = 28,
  emissive,
}: {
  points: [number, number, number][];
  radius?: number;
  color?: string;
  segments?: number;
  emissive?: string;
}) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return new THREE.TubeGeometry(curve, segments, radius, 6, false);
  }, [points, radius, segments]);

  /* Three warns on any parameter passed as undefined, so optional ones are
     added to the descriptor rather than spelled out with a fallback. */
  const mat = useMemo(() => {
    const params: THREE.MeshStandardMaterialParameters = {
      color,
      roughness: 0.7,
      metalness: 0.06,
    };
    if (emissive) {
      params.emissive = new THREE.Color(emissive);
      params.emissiveIntensity = 0.4;
    }
    return new THREE.MeshStandardMaterial(params);
  }, [color, emissive]);

  useLayoutEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);
  return <mesh geometry={geo} material={mat} castShadow />;
}

/** Braided sleeving over a bundle — the black expandable sleeve on the range
 *  loom. Same curve, fatter, with a rougher surface. */
export function SleevedLoom({
  points,
  radius = 0.005,
}: {
  points: [number, number, number][];
  radius?: number;
}) {
  return <Wire points={points} radius={radius} color="#101114" segments={34} />;
}

/* --- fasteners ----------------------------------------------------------- */

/** Countersunk machine screws, instanced. Fasteners are the detail that most
 *  reliably says "this is a manufactured object". */
export function Screws({
  positions,
  radius = 0.0016,
  normal = 'y',
}: {
  positions: [number, number, number][];
  radius?: number;
  normal?: 'y' | 'z' | 'x';
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.CylinderGeometry(radius, radius * 0.86, radius * 0.7, 8), [radius]);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#8d949b', roughness: 0.34, metalness: 1 }),
    [],
  );
  useLayoutEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler(
      normal === 'z' ? Math.PI / 2 : 0,
      0,
      normal === 'x' ? Math.PI / 2 : 0,
    );
    q.setFromEuler(e);
    const s = new THREE.Vector3(1, 1, 1);
    positions.forEach((p, i) => {
      m.compose(new THREE.Vector3(...p), q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [positions, normal]);
  return <instancedMesh ref={ref} args={[geo, mat, positions.length]} frustumCulled={false} />;
}

/* --- "it is running" ----------------------------------------------------- */

export type BlinkPattern = 'heartbeat' | 'slow' | 'fast' | 'breathe' | 'solid';

/** Status LED. The pattern matters more than the geometry: a tracker that
 *  double-blinks once a second reads as firmware doing something, while a
 *  steady dot reads as a painted mark. */
export function Led({
  color = '#39ff88',
  radius = 0.0012,
  position = [0, 0, 0],
  pattern = 'heartbeat',
  /** 0..1 master gate — the device only lights once it has powered up. */
  powerRef,
  /** haloed light pipe, as seen glowing through the tracker's lid. */
  glow = true,
  phase = 0,
}: {
  color?: string;
  radius?: number;
  position?: [number, number, number];
  pattern?: BlinkPattern;
  powerRef?: React.MutableRefObject<number>;
  glow?: boolean;
  phase?: number;
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const m = mat.current;
    if (!m) return;
    const t = state.clock.elapsedTime + phase;
    let v: number;
    switch (pattern) {
      case 'heartbeat': {
        // two short pulses then a rest — the classic status blink
        const c = t % 1.6;
        v = c < 0.09 ? 1 : c < 0.2 ? 0.05 : c < 0.29 ? 1 : 0.05;
        break;
      }
      case 'slow':
        v = (t % 2) < 1 ? 1 : 0.04;
        break;
      case 'fast':
        v = (t % 0.24) < 0.12 ? 1 : 0.04;
        break;
      case 'breathe':
        v = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 1.7));
        break;
      default:
        v = 1;
    }
    const power = powerRef ? powerRef.current : 1;
    const lit = v * power;
    m.emissiveIntensity = 0.06 + lit * 5.2;
    if (halo.current) {
      halo.current.scale.setScalar(0.6 + lit * 1.1);
      (halo.current.material as THREE.Material).opacity = lit * 0.26;
    }
  });

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 10, 8]} />
        <meshStandardMaterial
          ref={mat}
          color="#07130c"
          emissive={new THREE.Color(color)}
          emissiveIntensity={1}
          toneMapped={false}
          roughness={0.25}
        />
      </mesh>
      {glow && (
        <mesh ref={halo} rotation={[-Math.PI / 2, 0, 0]} position={[0, radius * 0.6, 0]}>
          <circleGeometry args={[radius * 3.4, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

/** Expanding rings from an antenna: a transmission you can see. Three rings on
 *  staggered phases, growing and fading — deliberately restrained, because the
 *  point is that the device is talking, not that the page has an effect on it.
 */
export function RadioRings({
  position = [0, 0, 0],
  color = '#3fe0d0',
  maxRadius = 0.16,
  period = 2.4,
  count = 3,
  powerRef,
  /** rings lie flat on the bench by default; upright reads better for a
   *  vertical antenna. */
  upright = false,
}: {
  position?: [number, number, number];
  color?: string;
  maxRadius?: number;
  period?: number;
  count?: number;
  powerRef?: React.MutableRefObject<number>;
  upright?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(() => new THREE.RingGeometry(0.9, 1, 44), []);
  const mats = useMemo(
    () =>
      Array.from(
        { length: count },
        () =>
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [count, color],
  );

  useLayoutEffect(
    () => () => {
      geo.dispose();
      mats.forEach((m) => m.dispose());
    },
    [geo, mats],
  );

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const power = powerRef ? powerRef.current : 1;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const child = g.children[i] as THREE.Mesh;
      if (!child) continue;
      const p = ((t / period + i / count) % 1);
      const r = 0.02 + p * maxRadius;
      child.scale.setScalar(r);
      mats[i].opacity = (1 - p) * (1 - p) * 0.15 * power;
    }
  });

  return (
    <group
      ref={group}
      position={position}
      rotation={upright ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}
    >
      {mats.map((m, i) => (
        <mesh key={i} geometry={geo} material={m} />
      ))}
    </group>
  );
}

/** A rotating output shaft with a machined flat, so the rotation is legible.
 *
 *  `speedRef` (signed revolutions per second) takes precedence over `rpm` when
 *  given. That matters wherever the shaft is actually driving something: a
 *  shaft turning at a constant rate while the thing it drives runs out and
 *  back is the kind of detail that reads as wrong before anyone can say why.
 *  Feeding it the load's own velocity keeps the two honest, reversal
 *  included. */
export function SpinningShaft({
  radius = 0.008,
  length = 0.05,
  rpm = 90,
  powerRef,
  speedRef,
  material,
  position = [0, 0, 0],
  rotation = [0, 0, Math.PI / 2],
}: {
  radius?: number;
  length?: number;
  rpm?: number;
  powerRef?: React.MutableRefObject<number>;
  speedRef?: React.MutableRefObject<number>;
  material: THREE.Material;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const inner = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!inner.current) return;
    const d = Math.min(delta, 1 / 30);
    const revs = speedRef ? speedRef.current : (rpm / 60) * (powerRef ? powerRef.current : 1);
    inner.current.rotation.y += d * revs * Math.PI * 2;
  });
  return (
    <group position={position} rotation={rotation as unknown as THREE.Euler}>
      <group ref={inner}>
        <mesh material={material} castShadow>
          <cylinderGeometry args={[radius, radius, length, 16]} />
        </mesh>
        {/* machined flat — without it a spinning cylinder looks static */}
        <mesh position={[radius * 0.82, 0, 0]} material={material}>
          <boxGeometry args={[radius * 0.5, length * 0.55, radius * 1.5]} />
        </mesh>
      </group>
    </group>
  );
}
