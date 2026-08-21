/* ============================================================================
   Pcb — a populated circuit board
   ----------------------------------------------------------------------------
   The board itself is a single box: the solder-mask artwork (routing, pads,
   silkscreen, designators) is a texture on its top face, drawn in textures.ts.

   The components on top are real geometry, because a flat board reads as a
   printed card the moment the camera gets close, and this scene puts the
   camera very close. The two hundred-odd passives are one InstancedMesh —
   three draw calls for the whole population — while the parts a viewer would
   actually name (the QFP, the cellular module, connectors, electrolytics) are
   modelled individually and passed in as children.
   ========================================================================== */

import { useLayoutEffect, useMemo, useRef, forwardRef } from 'react';
import * as THREE from 'three';
import { pcbTextures, type PcbSpec } from '../textures';
import type { DeviceMaterials } from '../materials';

/** deterministic 0..1 */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --- populated passives -------------------------------------------------- */

interface ScatterProps {
  /** board size in metres. */
  w: number;
  d: number;
  /** top surface height (board thickness). */
  y: number;
  count: number;
  seed: number;
  /** rectangle (in board space) kept clear for the hero components. */
  keepOut?: { x: number; z: number; w: number; d: number }[];
}

/** The 0402/0603 population: chip resistors, capacitors and small diodes. */
function Passives({ w, d, y, count, seed, keepOut = [] }: ScatterProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0.25,
        vertexColors: false,
      }),
    [],
  );
  useLayoutEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rnd = prng(seed);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const color = new THREE.Color();

    // component body colours seen on the boards: black chip caps/resistors,
    // and the warmer tan of MLCC packages
    const palette = ['#17171a', '#101014', '#3a2c1c', '#2a2016', '#101014'];

    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 12) {
      const x = (rnd() - 0.5) * w * 0.9;
      const z = (rnd() - 0.5) * d * 0.9;
      if (keepOut.some((k) => Math.abs(x - k.x) < k.w / 2 && Math.abs(z - k.z) < k.d / 2)) {
        continue;
      }
      // 0603-ish: 1.6 x 0.8 x 0.45 mm
      const long = 0.0011 + rnd() * 0.0011;
      const short = 0.0006 + rnd() * 0.0004;
      const tall = 0.0004 + rnd() * 0.0004;
      const vertical = rnd() < 0.5;
      scl.set(vertical ? short : long, tall, vertical ? long : short);
      pos.set(x, y + tall / 2, z);
      q.identity();
      m.compose(pos, q, scl);
      mesh.setMatrixAt(placed, m);
      mesh.setColorAt(placed, color.set(palette[Math.floor(rnd() * palette.length)]));
      placed++;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [w, d, y, count, seed, keepOut]);

  return (
    <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
  );
}

/* --- named components ---------------------------------------------------- */

/** Quad-flat-pack MCU with visible gull-wing leads — the ATSAME70-class part
 *  that dominates the range board. */
export function Qfp({
  size = 0.02,
  height = 0.0032,
  pinsPerSide = 25,
  position = [0, 0, 0],
}: {
  size?: number;
  height?: number;
  pinsPerSide?: number;
  position?: [number, number, number];
}) {
  const leadGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const leadMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c8ced4', roughness: 0.3, metalness: 1 }),
    [],
  );
  const ref = useRef<THREE.InstancedMesh>(null);
  const total = pinsPerSide * 4;

  useLayoutEffect(() => () => (leadGeo.dispose(), leadMat.dispose()), [leadGeo, leadMat]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const pitch = size / pinsPerSide;
    const leadLen = size * 0.09;
    const half = size / 2;
    let i = 0;
    for (let side = 0; side < 4; side++) {
      for (let n = 0; n < pinsPerSide; n++) {
        const t = (n + 0.5) / pinsPerSide - 0.5;
        const along = t * size * 0.96;
        const off = half + leadLen / 2;
        if (side === 0) p.set(along, height * 0.18, -off);
        else if (side === 1) p.set(off, height * 0.18, along);
        else if (side === 2) p.set(along, height * 0.18, off);
        else p.set(-off, height * 0.18, along);
        const horizontal = side === 0 || side === 2;
        s.set(horizontal ? pitch * 0.45 : leadLen, height * 0.22, horizontal ? leadLen : pitch * 0.45);
        m.compose(p, q, s);
        mesh.setMatrixAt(i++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [size, height, pinsPerSide]);

  return (
    <group position={position}>
      {/* moulded body */}
      <mesh castShadow>
        <boxGeometry args={[size, height, size]} />
        <meshStandardMaterial color="#0e0e11" roughness={0.46} metalness={0.15} />
      </mesh>
      {/* laser-etched part marking catches the light */}
      <mesh position={[0, height / 2 + 0.00002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size * 0.6, size * 0.28]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* pin-1 dimple */}
      <mesh position={[-size * 0.36, height / 2, -size * 0.36]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[size * 0.05, 12]} />
        <meshStandardMaterial color="#26262b" roughness={0.95} />
      </mesh>
      <instancedMesh ref={ref} args={[leadGeo, leadMat, total]} frustumCulled={false} />
    </group>
  );
}

/** Shielded cellular module: a laminate carrier under a stamped tin can with
 *  a printed label — the EC200U as it sits on the tracker board. */
export function ShieldedModule({
  w = 0.029,
  d = 0.032,
  h = 0.0026,
  materials,
  position = [0, 0, 0],
  label,
}: {
  w?: number;
  d?: number;
  h?: number;
  materials: DeviceMaterials;
  position?: [number, number, number];
  label?: THREE.Texture;
}) {
  return (
    <group position={position}>
      {/* carrier laminate peeking out under the can */}
      <mesh>
        <boxGeometry args={[w * 1.04, h * 0.35, d * 1.04]} />
        <meshStandardMaterial color="#1c4f30" roughness={0.55} metalness={0.05} />
      </mesh>
      {/* stamped shield */}
      <mesh position={[0, h * 0.5, 0]} castShadow material={materials.shield}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* printed identification label on the can */}
      <mesh position={[0, h + 0.00003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w * 0.86, d * 0.86]} />
        <meshStandardMaterial
          map={label ?? null}
          color={label ? '#ffffff' : '#9aa0a6'}
          roughness={0.75}
          metalness={0.1}
        />
      </mesh>
      {/* castellated edge pads */}
      <Castellations w={w} d={d} h={h} />
    </group>
  );
}

function Castellations({ w, d, h }: { w: number; d: number; h: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#cfd4d9', roughness: 0.35, metalness: 1 }),
    [],
  );
  const perSide = 14;
  useLayoutEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    let i = 0;
    for (let side = 0; side < 4; side++) {
      for (let n = 0; n < perSide; n++) {
        const t = (n + 0.5) / perSide - 0.5;
        const horizontal = side === 0 || side === 2;
        const along = t * (horizontal ? w : d) * 0.94;
        const off = (horizontal ? d : w) / 2;
        if (side === 0) p.set(along, 0, -off);
        else if (side === 1) p.set(w / 2, 0, along);
        else if (side === 2) p.set(along, 0, off);
        else p.set(-w / 2, 0, along);
        s.set(horizontal ? w * 0.035 : 0.0006, h * 0.5, horizontal ? 0.0006 : d * 0.035);
        m.compose(p, q, s);
        mesh.setMatrixAt(i++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [w, d, h]);
  return <instancedMesh ref={ref} args={[geo, mat, perSide * 4]} frustumCulled={false} />;
}

/** Vertical electrolytic can with the crimped top and polarity stripe. */
export function Electrolytic({
  r = 0.004,
  h = 0.009,
  position = [0, 0, 0],
}: {
  r?: number;
  h?: number;
  position?: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, h, 14]} />
        <meshStandardMaterial color="#12161c" roughness={0.35} metalness={0.6} />
      </mesh>
      {/* crimped aluminium top with the vent cross */}
      <mesh position={[0, h + 0.0001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.94, 14]} />
        <meshStandardMaterial color="#8f979f" roughness={0.4} metalness={0.9} />
      </mesh>
      {/* polarity band down one side */}
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r * 1.005, r * 1.005, h * 0.8, 14, 1, true, 0, 0.8]} />
        <meshStandardMaterial color="#c8ccd0" roughness={0.5} metalness={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Polarised wire-to-board header — the white JST-style shrouds on both
 *  boards, and the black multi-way connectors on the range controller. */
export function Header({
  ways = 4,
  pitch = 0.002,
  height = 0.005,
  color = '#d8d8d2',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: {
  ways?: number;
  pitch?: number;
  height?: number;
  color?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const w = ways * pitch + 0.0012;
  const d = pitch * 2.1;
  return (
    <group position={position} rotation={rotation as unknown as THREE.Euler}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[w, height, d]} />
        <meshStandardMaterial color={color} roughness={0.62} metalness={0.05} />
      </mesh>
      {/* open top of the shroud */}
      <mesh position={[0, height - 0.0003, 0]}>
        <boxGeometry args={[w * 0.82, 0.0008, d * 0.6]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.9} />
      </mesh>
    </group>
  );
}

/* --- the board ----------------------------------------------------------- */

export interface PcbProps {
  spec: PcbSpec;
  /** physical size in metres. */
  w: number;
  d: number;
  thickness?: number;
  materials: DeviceMaterials;
  /** passive population count. */
  passives?: number;
  keepOut?: { x: number; z: number; w: number; d: number }[];
  children?: React.ReactNode;
}

export const Pcb = forwardRef<THREE.Group, PcbProps>(function Pcb(
  { spec, w, d, thickness = 0.0016, materials, passives = 120, keepOut, children },
  ref,
) {
  const maps = useMemo(() => pcbTextures(spec), [spec]);

  /* One material per face group. BoxGeometry orders its groups +x, -x, +y, -y,
     +z, -z — so index 2 is the populated top and 3 the (plainer) underside.
     The four edge faces get bare FR4, which is what a routed board edge is. */
  const faces = useMemo(() => {
    const top = new THREE.MeshStandardMaterial({
      map: maps.map,
      roughnessMap: maps.roughnessMap,
      roughness: 1,
      metalness: 0.25,
    });
    const bottom = new THREE.MeshStandardMaterial({
      map: maps.map,
      roughness: 0.72,
      metalness: 0.2,
      color: '#9fb59f',
    });
    return [materials.fr4, materials.fr4, top, bottom, materials.fr4, materials.fr4];
  }, [maps, materials]);

  useLayoutEffect(
    () => () => {
      (faces[2] as THREE.Material).dispose();
      (faces[3] as THREE.Material).dispose();
    },
    [faces],
  );

  return (
    <group ref={ref}>
      <mesh material={faces} castShadow receiveShadow>
        <boxGeometry args={[w, thickness, d]} />
      </mesh>
      <Passives
        w={w}
        d={d}
        y={thickness / 2}
        count={passives}
        seed={spec.seed + 7}
        keepOut={keepOut}
      />
      <group position={[0, thickness / 2, 0]}>{children}</group>
    </group>
  );
});
