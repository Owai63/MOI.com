import { useEffect, useMemo, type ReactNode } from 'react';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type V3 = [number, number, number];

export function Part({ size, position = [0, 0, 0], rotation, color = '#242c35', metal = 0.1, rough = 0.4, radius = 0.025, children }: {
  size: V3; position?: V3; rotation?: V3; color?: string; metal?: number;
  rough?: number; radius?: number; children?: ReactNode;
}) {
  const [w, h, d] = size;
  const geometry = useMemo(() => new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 4, h / 4, d / 4)), [w, h, d, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
    <meshStandardMaterial color={color} metalness={metal} roughness={rough} />{children}
  </mesh>;
}

export function Cylinder({ position, radius, height, color = '#87939e', rotation, metal = 0.65 }: {
  position: V3; radius: number; height: number; color?: string; rotation?: V3; metal?: number;
}) {
  return <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <cylinderGeometry args={[radius, radius, height, 32]} />
    <meshStandardMaterial color={color} metalness={metal} roughness={0.32} />
  </mesh>;
}

export function Board({ position = [0, 0, 0], scale = 1 }: { position?: V3; scale?: number }) {
  return <group position={position} scale={scale}>
    <Part size={[0.8, 0.045, 0.6]} color="#165847" rough={0.55} />
    <Part size={[0.32, 0.09, 0.28]} position={[-0.08, 0.06, 0]} color="#aeb8bc" metal={0.85} />
    <Part size={[0.14, 0.06, 0.2]} position={[0.22, 0.06, 0]} color="#181d23" />
    {Array.from({ length: 10 }, (_, i) => <Part key={i} size={[0.027, 0.015, 0.085]} position={[-0.29 + i * 0.06, 0.033, 0.235]} color="#c7aa61" metal={0.8} radius={0.002} />)}
    {[-1, 1].flatMap(x => [-1, 1].map(z => <Cylinder key={`${x}${z}`} radius={0.025} height={0.018} position={[x * 0.35, 0.03, z * 0.25]} color="#c8ab68" />))}
  </group>;
}

export function StatusLight({ position, color = '#57d9c5', on = true }: { position: V3; color?: string; on?: boolean }) {
  return <mesh position={position}><sphereGeometry args={[0.018, 12, 8]} />
    <meshStandardMaterial color={on ? color : '#27313b'} emissive={color} emissiveIntensity={on ? 2 : 0} toneMapped={false} />
  </mesh>;
}
