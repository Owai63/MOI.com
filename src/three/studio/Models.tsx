import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProjectSlug } from '../../data/content';
import { TrackerDevice } from '../bench/devices/TrackerDevice';
import { OtaLink } from '../bench/devices/OtaLink';
import { LifecycleBench } from '../bench/devices/LifecycleBench';
import { VisionRig } from '../bench/devices/VisionRig';
import { Wheelchair } from '../bench/devices/Wheelchair';
import { Part, Cylinder, Board, StatusLight } from './parts';
import { makeScreen } from './screens';
import { studios, stepAt } from './catalog';

export interface StudioMotion { value: number; time: number; running: boolean }
export type MotionRef = MutableRefObject<StudioMotion>;

function PetTracker({ motion }: { motion: MotionRef }) {
  const lid = useRef<THREE.Group>(null);
  const board = useRef<THREE.Group>(null);
  const battery = useRef<THREE.Group>(null);
  useFrame(() => {
    const v = motion.current.value;
    if (lid.current) lid.current.position.y = v * 1.05;
    if (board.current) board.current.position.y = v * 0.52;
    if (battery.current) battery.current.position.y = v * 0.22;
  });
  return <group position={[0, -0.4, 0]} rotation={[0, -0.3, 0]}>
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} castShadow>
      <torusGeometry args={[0.93, 0.075, 12, 64]} />
      <meshStandardMaterial color="#a76e47" roughness={0.9} />
    </mesh>
    <Part size={[0.29, 0.15, 0.3]} position={[-0.86, 0.07, 0]} color="#96a1aa" metal={0.85} />
    <Part size={[1.05, 0.24, 0.76]} position={[0, 0.16, 0.52]} color="#253940" />
    <group ref={battery}><Part size={[0.74, 0.1, 0.5]} position={[0, 0.31, 0.52]} color="#bfc4c7" metal={0.7} /></group>
    <group ref={board}><Board position={[0, 0.43, 0.52]} /><Part size={[0.21, 0.08, 0.21]} position={[0.22, 0.51, 0.38]} color="#d6c4a1" rough={0.8} /></group>
    <group ref={lid}>
      <Part size={[1.06, 0.18, 0.77]} position={[0, 0.55, 0.52]} color="#d5e0df" rough={0.35} radius={0.07} />
      <Part size={[0.57, 0.015, 0.36]} position={[0, 0.647, 0.52]} color="#b7cbc8" radius={0.05} />
      <StatusLight position={[0.36, 0.65, 0.52]} />
    </group>
  </group>;
}

function Display({ slug, step, mobile = false }: { slug: ProjectSlug; step: number; mobile?: boolean }) {
  const map = useMemo(() => makeScreen(slug, step, mobile), [slug, step, mobile]);
  useEffect(() => () => map.dispose(), [map]);
  const width = mobile ? 0.48 : 2.4;
  const height = mobile ? 0.9 : 1.5;
  return <group>
    <Part size={[width + 0.10, height + 0.10, mobile ? 0.065 : 0.11]} metal={0.7} color="#697681" radius={mobile ? 0.07 : 0.045} />
    <Part size={[width + 0.065, height + 0.065, 0.025]} position={[0, 0, mobile ? 0.04 : 0.066]} color="#10171c" radius={0.03} />
    <mesh position={[0, 0, mobile ? 0.054 : 0.082]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
    <mesh position={[0, height / 2 + 0.022, 0.085]}><sphereGeometry args={[0.009, 12, 8]} /><meshStandardMaterial color="#08111b" metalness={0.5} roughness={0.12} /></mesh>
  </group>;
}

function DataDrive() {
  return <group position={[-1.52, -0.39, 0.3]} rotation={[0, -0.15, 0]}>
    <Part size={[0.4, 0.57, 0.55]} color="#485663" metal={0.8} />
    {[0, 1, 2].map(i => <group key={i}>
      <Part size={[0.33, 0.12, 0.025]} position={[0, -0.15 + i * 0.16, 0.29]} color="#182129" />
      <StatusLight position={[0.11, -0.15 + i * 0.16, 0.31]} />
    </group>)}
  </group>;
}

function Workstation({ slug, value }: { slug: ProjectSlug; value: number }) {
  const step = stepAt(value, studios[slug].steps);
  return <group rotation={[0, -0.2, 0]} position={[0, -0.05, 0]} scale={0.87}>
    <group position={[0, 0.63, -0.1]}><Display slug={slug} step={step} /></group>
    <Part size={[0.17, 0.46, 0.13]} position={[0, -0.38, -0.13]} metal={0.9} color="#a5b0b8" />
    <Part size={[0.91, 0.055, 0.56]} position={[0, -0.59, -0.01]} metal={0.9} color="#a5b0b8" />
    <Part size={[1.52, 0.055, 0.49]} position={[-0.08, -0.56, 0.8]} metal={0.75} color="#8b99a4" />
    {[0, 1, 2, 3].flatMap(row => Array.from({ length: 12 }, (_, col) => <Part key={`${row}-${col}`} size={[0.094, 0.02, 0.075]} position={[-0.72 + col * 0.117, -0.519, 0.62 + row * 0.105]} color="#202b35" radius={0.007} />))}
    <Part size={[0.22, 0.095, 0.34]} position={[0.97, -0.53, 0.83]} color="#aab5bc" metal={0.4} radius={0.04} />
    {slug === 'bank-system' ? <DataDrive /> : <group position={[1.28, -0.1, 0.55]} rotation={[0, -0.28, 0]}><Display slug={slug} step={step} mobile /></group>}
    {slug === 'food-order' && <DataDrive />}
  </group>;
}

function RobotWheel({ position, motion }: { position: [number, number, number]; motion: MotionRef }) {
  const wheel = useRef<THREE.Group>(null);
  useFrame(() => { if (wheel.current) wheel.current.rotation.y = Math.sin(motion.current.time * 0.7) * 0.18 / 0.23; });
  return <group position={position} rotation={[0, 0, Math.PI / 2]}><group ref={wheel}>
    <Cylinder position={[0, 0, 0]} radius={0.23} height={0.16} color="#171e26" metal={0} />
    <Cylinder position={[0, 0.085, 0]} radius={0.14} height={0.012} color="#a6afb7" />
    <Cylinder position={[0, -0.085, 0]} radius={0.14} height={0.012} color="#a6afb7" />
    {Array.from({ length: 8 }, (_, i) => <Part key={i} size={[0.038, 0.18, 0.04]} position={[Math.sin(i * Math.PI / 4) * 0.22, 0, Math.cos(i * Math.PI / 4) * 0.22]} rotation={[0, i * Math.PI / 4, 0]} color="#262e35" radius={0.007} />)}
  </group></group>;
}

function GestureCar({ motion }: { motion: MotionRef }) {
  const car = useRef<THREE.Group>(null);
  const controller = useRef<THREE.Group>(null);
  useFrame(() => {
    const tilt = (motion.current.value - 0.5) * 1.2;
    if (car.current) {
      car.current.rotation.y = tilt;
      car.current.position.z = Math.sin(motion.current.time * 0.7) * 0.18;
    }
    if (controller.current) controller.current.rotation.z = -tilt;
  });
  return <group position={[0, -0.35, 0]}>
    <group ref={car}>
      <Part size={[1.05, 0.11, 1.33]} position={[0.3, 0.12, 0]} color="#b7a778" metal={0.4} />
      {[-1, 1].flatMap(x => [-1, 1].map(z => <RobotWheel key={`${x}${z}`} motion={motion} position={[0.3 + x * 0.61, 0.02, z * 0.44]} />))}
      <Board position={[0.3, 0.26, 0]} scale={0.8} />
      <Part size={[0.54, 0.19, 0.25]} position={[0.3, 0.28, 0.48]} color="#202d40" />
      <Cylinder position={[0.62, 0.51, -0.45]} height={0.65} radius={0.017} color="#353e48" />
      <StatusLight position={[0.43, 0.39, -0.08]} />
    </group>
    <group position={[-1.26, 0.8, 0]}>
      <group ref={controller}>
        <Part size={[0.56, 0.13, 0.77]} color="#3a494e" rough={0.9} radius={0.06} />
        <Part size={[0.4, 0.1, 0.38]} position={[0, 0.12, 0]} color="#536e66" />
        <Board position={[0, 0.18, 0]} scale={0.42} />
        <Cylinder position={[0.19, 0.38, -0.25]} height={0.38} radius={0.012} />
        {[0, 1, 2, 3].map(i => <Part key={i} size={[0.095, 0.10, 0.32 + (i === 1 ? 0.08 : 0)]} position={[-0.19 + i * 0.125, 0, -0.51]} color="#3a494e" radius={0.035} />)}
      </group>
    </group>
  </group>;
}

function Traffic({ value }: { value: number }) {
  const phase = stepAt(value, studios['fsm-traffic'].steps);
  return <group position={[0, -0.55, 0]} rotation={[0, Math.PI / 4, 0]} scale={0.83}>
    <Part size={[3.8, 0.12, 3.8]} color="#41534b" rough={0.98} />
    <Part size={[1.32, 0.025, 3.8]} position={[0, 0.08, 0]} color="#30363a" rough={0.95} />
    <Part size={[3.8, 0.025, 1.32]} position={[0, 0.081, 0]} color="#30363a" rough={0.95} />
    {[0, 1, 2, 3].map(side => <group key={side} rotation={[0, side * Math.PI / 2, 0]}>
      {[0, 1, 2].map(i => <Part key={i} size={[0.025, 0.009, 0.16]} position={[0, 0.101, 0.9 + i * 0.35]} color="#e9d89e" />)}
      {Array.from({ length: 5 }, (_, i) => <Part key={`walk${i}`} size={[0.12, 0.008, 0.21]} position={[-0.48 + i * 0.24, 0.105, 0.8]} color="#d1d2cb" />)}
      <Cylinder position={[0.84, 0.64, 0.86]} radius={0.032} height={1.15} />
      <Part size={[0.22, 0.54, 0.16]} position={[0.84, 1.2, 0.86]} color="#1a2329" radius={0.03} />
      {[0, 1, 2].map(lamp => {
        const green = side % 2 === 0 ? phase === 0 : phase === 3;
        const amber = side % 2 === 0 ? phase === 1 : phase === 4;
        const lit = lamp === 2 ? green : lamp === 1 ? amber : !green && !amber;
        const color = ['#ff635a', '#f7bf58', '#57dcaa'][lamp];
        return <mesh key={lamp} position={[0.84, 1.37 - lamp * 0.17, 0.955]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.064, 0.064, 0.015, 24]} />
          <meshStandardMaterial color={lit ? color : '#18252b'} emissive={color} emissiveIntensity={lit ? 1.4 : 0} />
        </mesh>;
      })}
    </group>)}
  </group>;
}

function Range({ motion }: { motion: MotionRef }) {
  const carriage = useRef<THREE.Group>(null);
  useFrame(() => { if (carriage.current) carriage.current.position.x = (motion.current.value - 0.5) * 2.9; });
  return <group position={[0, -0.6, 0]} rotation={[0, -0.18, 0]}>
    <Part size={[3.9, 0.10, 1.18]} position={[0, 0, 0]} color="#566163" rough={0.92} />
    {[-1, 1].map(z => <Part key={z} size={[3.8, 0.09, 0.055]} position={[0, 0.12, z * 0.29]} color="#9ba8b3" metal={0.9} rough={0.24} />)}
    {Array.from({ length: 12 }, (_, i) => <Part key={i} size={[0.045, 0.065, 0.82]} position={[-1.78 + i * 0.32, 0.07, 0]} color="#273139" metal={0.7} />)}
    {[-1, 1].map(x => <Part key={x} size={[0.09, 0.17, 0.8]} position={[x * 1.86, 0.17, 0]} color="#bc935b" metal={0.5} />)}
    <group ref={carriage}>
      <Part size={[0.59, 0.14, 0.71]} position={[0, 0.24, 0]} color="#48544d" metal={0.65} />
      <Part size={[0.40, 0.17, 0.43]} position={[0, 0.39, 0]} color="#35413a" />
      <Cylinder radius={0.032} height={0.47} position={[0.2, 0.7, -0.12]} color="#252f37" />
      <Part size={[0.055, 0.8, 0.055]} position={[0, 0.83, 0]} metal={0.8} />
      <Part size={[0.46, 0.59, 0.055]} position={[0, 1.33, 0]} color="#c2b795" rough={0.9} radius={0.09} />
      <Cylinder radius={0.14} height={0.055} position={[0, 1.76, 0]} rotation={[Math.PI / 2, 0, 0]} color="#c2b795" metal={0} />
      <StatusLight position={[0.12, 0.48, 0.16]} color="#edb66d" />
    </group>
    <group position={[-1.4, 0.17, 0.84]} rotation={[0.3, 0, 0]}>
      <Part size={[0.6, 0.27, 0.36]} color="#263841" />
      <Part size={[0.36, 0.14, 0.018]} position={[-0.03, 0.025, 0.187]} color="#477d77" />
      <Cylinder radius={0.015} height={0.45} position={[-0.2, 0.33, -0.1]} color="#262d33" />
    </group>
  </group>;
}

/** Existing photo-informed hardware is re-lit and reframed in the new studio. */
export function ProjectModel({ slug, motion, value, detail }: {
  slug: ProjectSlug; motion: MotionRef; value: number; detail: 'high' | 'low';
}) {
  const activeRef = useRef(1);
  const props = { activeRef, detail };
  switch (slug) {
    case 'mymo2': return <group scale={15} position={[-0.3, -0.25, 0.15]} rotation={[0, -0.35, 0]}><TrackerDevice {...props} /></group>;
    case 'device-management': return <group scale={7} position={[0, -0.45, 0]} rotation={[0, -0.1, 0]}><OtaLink {...props} /></group>;
    case 'lifecycle-database': return <group scale={8} position={[0, -0.3, 0]} rotation={[0, -0.2, 0]}><LifecycleBench {...props} /></group>;
    case 'violence-detection': return <group scale={10} position={[0, -0.4, 0]} rotation={[0, 0.55, 0]}><VisionRig {...props} /></group>;
    case 'wheelchair': return <group scale={1.8} position={[0, -0.7, 0]} rotation={[0, -0.35, 0]}><Wheelchair {...props} /></group>;
    case 'pet-tracker': return <PetTracker motion={motion} />;
    case 'gesture-car': return <GestureCar motion={motion} />;
    case 'fsm-traffic': return <Traffic value={value} />;
    case 'shooting-range': return <Range motion={motion} />;
    default: return <Workstation slug={slug} value={value} />;
  }
}

export function HeroModel() {
  const active = useRef(1);
  return <group rotation={[0, -0.35, 0]}>
    <Workstation slug="cedrus-website" value={0} />
    <group position={[-1.4, -0.53, 0.62]} scale={7} rotation={[0, 0.5, 0]}>
      <TrackerDevice activeRef={active} detail="low" />
    </group>
    <Part size={[4.4, 0.1, 2.5]} position={[0, -0.71, 0.28]} color="#24343e" metal={0.45} rough={0.38} radius={0.08} />
  </group>;
}

/** Release materials supplied via mesh props as well as declarative resources.
 * Shared texture maps remain in their bounded cache for the next inspection. */
export function ModelResources({ children }: { children: ReactNode }) {
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const materials = new Set<THREE.Material>();
    root.current?.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m));
    });
    return () => materials.forEach(material => material.dispose());
  }, []);
  return <group ref={root}>{children}</group>;
}
