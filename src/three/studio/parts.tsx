import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { microSurface } from '../bench/surfaceDetails';

export type V3 = [number, number, number];

function FinishMaterial({ color, metal, rough }: { color: string; metal: number; rough: number }) {
  const surface = microSurface(metal > 0.5 ? 'metal' : 'polymer');
  return <meshStandardMaterial color={color} metalness={metal} roughness={rough}
    bumpMap={surface} bumpScale={metal > 0.5 ? 0.0006 : 0.0012} roughnessMap={surface} />;
}

export function Part({ size, position = [0, 0, 0], rotation, color = '#242c35', metal = 0.1, rough = 0.4, radius = 0.025, children }: {
  size: V3; position?: V3; rotation?: V3; color?: string; metal?: number;
  rough?: number; radius?: number; children?: ReactNode;
}) {
  const [w, h, d] = size;
  const geometry = useMemo(() => new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 4, h / 4, d / 4)), [w, h, d, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
    <FinishMaterial color={color} metal={metal} rough={rough} />{children}
  </mesh>;
}

export function Cylinder({ position, radius, height, color = '#87939e', rotation, metal = 0.65 }: {
  position: V3; radius: number; height: number; color?: string; rotation?: V3; metal?: number;
}) {
  return <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <cylinderGeometry args={[radius, radius, height, 32]} />
    <FinishMaterial color={color} metal={metal} rough={0.36} />
  </mesh>;
}

/** Repeated detail shares one geometry, material and draw call. */
export function RepeatedParts({ size, positions, rotations, color = '#242c35', metal = 0.1, rough = 0.4, radius = 0.008 }: {
  size: V3; positions: V3[]; rotations?: V3[]; color?: string; metal?: number; rough?: number; radius?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const [w, h, d] = size;
  const geometry = useMemo(() => new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 4, h / 4, d / 4)), [w, h, d, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const transform = new THREE.Object3D();
    positions.forEach((position, i) => {
      transform.position.fromArray(position);
      transform.rotation.set(...(rotations?.[i] ?? [0, 0, 0] as V3));
      transform.updateMatrix(); mesh.current!.setMatrixAt(i, transform.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [positions, rotations]);
  return <instancedMesh ref={mesh} args={[geometry, undefined, positions.length]} castShadow receiveShadow>
    <FinishMaterial color={color} metal={metal} rough={rough} />
  </instancedMesh>;
}

export function Cable({ points, color = '#cf6951', radius = 0.012 }: { points: V3[]; color?: string; radius?: number }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 32, radius, 8, false), [points, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={0.6} /></mesh>;
}

export function Screws({ positions, radius = 0.024 }: { positions: V3[]; radius?: number }) {
  return <group>
    {positions.map((p, i) => <Cylinder key={i} position={p} radius={radius} height={0.015} metal={0.9} color="#a7b1b6" />)}
    <RepeatedParts size={[radius * 1.35, 0.002, radius * 0.24]} positions={positions.map(([x,y,z]) => [x, y + 0.008, z])} color="#27313a" radius={0.001} />
  </group>;
}

function circuitTexture(label: string) {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 512;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#135844'; c.fillRect(0, 0, 768, 512);
  c.strokeStyle = '#368871'; c.lineWidth = 3;
  for (let i = 0; i < 24; i++) {
    const x = 54 + i * 27;
    c.beginPath(); c.moveTo(x, 466); c.lineTo(x, 352 - i % 5 * 12);
    c.lineTo(x + 24, 326 - i % 5 * 12); c.lineTo(x + 24, 74); c.stroke();
    c.fillStyle = '#d2b46a'; c.beginPath(); c.arc(x, 466, 4, 0, Math.PI * 2); c.fill();
  }
  c.strokeStyle = '#bfceba'; c.lineWidth = 2;
  c.strokeRect(104, 92, 304, 268); c.strokeRect(460, 156, 160, 176);
  c.font = '20px monospace'; c.fillStyle = '#d3e1cb'; c.fillText(label, 68, 52);
  c.font = '15px monospace'; c.fillText('GND  TX  RX  3V3', 400, 415); c.fillText('RF  /  REV 01', 68, 405);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}

export function Board({ position = [0, 0, 0], scale = 1, label = 'CONTROL / IO' }: { position?: V3; scale?: number; label?: string }) {
  const map = useMemo(() => circuitTexture(label), [label]);
  useEffect(() => () => map.dispose(), [map]);
  const pads = useMemo<V3[]>(() => [-1, 1].flatMap(z => Array.from({ length: 11 }, (_, i) => [-0.3 + i * 0.06, 0.029, z * 0.26] as V3)), []);
  const components = useMemo<V3[]>(() => Array.from({ length: 8 }, (_, i) => [-0.3 + (i % 4) * 0.17, 0.046, i < 4 ? -0.20 : 0.18]), []);
  return <group position={position} scale={scale}>
    <Part size={[0.8, 0.045, 0.6]} color="#165847" rough={0.55} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.023, 0]} receiveShadow>
      <planeGeometry args={[0.79, 0.59]} /><meshStandardMaterial map={map} roughness={0.55} metalness={0.15} />
    </mesh>
    <Part size={[0.30, 0.065, 0.26]} position={[-0.08, 0.06, 0]} color="#bcc5c8" metal={0.85} radius={0.008} />
    <Part size={[0.14, 0.045, 0.18]} position={[0.23, 0.052, 0]} color="#181d23" radius={0.004} />
    <RepeatedParts size={[0.027, 0.009, 0.055]} positions={pads} color="#c7aa61" metal={0.8} radius={0.002} />
    <RepeatedParts size={[0.043, 0.022, 0.025]} positions={components} color="#d9bd91" radius={0.002} />
    <RepeatedParts size={[0.046, 0.01, 0.006]} positions={[-1, 1].flatMap(x => Array.from({length: 7}, (_, i) => [0.23 + x * 0.083, 0.03, -0.077 + i * 0.025] as V3))} color="#b9bec0" metal={0.8} radius={0.001} />
    <Screws positions={[-1, 1].flatMap(x => [-1, 1].map(z => [x * 0.35, 0.03, z * 0.25] as V3))} radius={0.021} />
  </group>;
}

export function StatusLight({ position, color = '#57d9c5', on = true }: { position: V3; color?: string; on?: boolean }) {
  return <mesh position={position}><sphereGeometry args={[0.018, 12, 8]} />
    <meshStandardMaterial color={on ? color : '#27313b'} emissive={color} emissiveIntensity={on ? 2 : 0} toneMapped={false} />
  </mesh>;
}
