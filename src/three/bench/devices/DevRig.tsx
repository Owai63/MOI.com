/* ============================================================================
   DevRig — the bench rig used for projects with no photographed hardware
   ----------------------------------------------------------------------------
   Four of the featured chapters (the OTA platform, the lifecycle database, the
   detection work, the wheelchair project) have no product photographs, so
   there is no real object to reproduce. Rather than invent a plausible-looking
   product and imply it exists, the bench shows what those chapters actually
   were: a board on standoffs, a debug probe on a ribbon, a small display
   module and a jumpered breadboard — a development rig, honestly generic.

   Each chapter gets its own board size, module layout, routing seed and
   indicator colour, so the rigs read as different setups rather than one prop
   reused four times.
   ========================================================================== */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Pcb, Header, Qfp, Electrolytic } from '../parts/Pcb';
import { Wire, Led, Screws, RadioRings } from '../parts/primitives';
import { deviceMaterials } from '../materials';
import { screenMaterial } from '../materials';
import { type PcbSpec } from '../textures';
import { useAssembly, type PartSpec } from '../assembly';
import { sceneState } from '../../sceneState';
import { POWER_GATE, POWER_RATE } from './power';

export interface RigVariant {
  id: string;
  seed: number;
  /** board footprint, metres. */
  w: number;
  d: number;
  mask: string;
  /** indicator colour — matches the chapter's accent. */
  led: string;
  /** true when the rig's story is a radio link rather than a local sensor. */
  radio: boolean;
  /** small module carried on the board: a display, a sensor, or a radio can. */
  module: 'display' | 'sensor' | 'radio';
}

const PARTS: PartSpec[] = [
  /* 0 probe      */ { pos: [0, 0, 0], out: [0.10, 0.03, 0.07], delay: 0.05 },
  /* 1 module     */ { pos: [0, 0, 0], out: [0, 0.055, -0.01], delay: 0.3 },
  /* 2 jumpers    */ { pos: [0, 0, 0], out: [-0.06, 0.05, 0.03], delay: 0.4 },
  /* 3 board      */ { pos: [0, 0, 0], out: [0, 0.03, 0], delay: 0.55 },
  /* 4 standoffs  */ { pos: [0, 0, 0], out: [0, -0.03, 0], delay: 0.75 },
  /* 5 breadboard */ { pos: [0, 0, 0], out: [-0.11, -0.01, 0.05], delay: 0.85 },
];

const STANDOFF = 0.009;

export function DevRig({
  variant,
  activeRef,
  detail = 'high',
}: {
  variant: RigVariant;
  activeRef: React.MutableRefObject<number>;
  detail?: 'high' | 'low';
}) {
  const mats = useMemo(() => deviceMaterials(), []);
  const { bind, live } = useAssembly(PARTS, activeRef);
  const power = useRef(0);

  const spec: PcbSpec = useMemo(
    () => ({
      id: variant.id,
      seed: variant.seed,
      w: 768,
      h: Math.round((768 * variant.d) / variant.w),
      mask: variant.mask,
      density: 0.7,
      mountingHoles: true,
    }),
    [variant],
  );

  const screenMat = useMemo(() => screenMaterial(null, variant.led), [variant.led]);

  useFrame((_, delta) => {
    const want = sceneState.inspect ? 1 : live.current > POWER_GATE ? sceneState.power : 0;
    power.current = THREE.MathUtils.damp(power.current, want, POWER_RATE, Math.min(delta, 1 / 30));
    screenMat.emissiveIntensity = 0.15 + power.current * 1.35;
  });

  const bw = variant.w;
  const bd = variant.d;

  return (
    <group>
      {/* ---- 0: debug probe on its ribbon --------------------------------- */}
      <group ref={bind(0)}>
        <group position={[bw * 0.85, 0.006, bd * 0.55]} rotation={[0, -0.4, 0]}>
          <mesh castShadow material={mats.darkPlastic}>
            <boxGeometry args={[0.048, 0.012, 0.026]} />
          </mesh>
          <Led color="#39ff88" radius={0.0012} position={[0.016, 0.0075, 0]} pattern="breathe" powerRef={power} />
          {/* ribbon back to the board's debug header */}
          <mesh position={[-0.042, 0.001, -0.004]} rotation={[0, 0.42, 0.05]}>
            <boxGeometry args={[0.055, 0.0007, 0.014]} />
            <meshStandardMaterial color="#9aa0a6" roughness={0.82} />
          </mesh>
        </group>
      </group>

      {/* ---- 1: carried module -------------------------------------------- */}
      <group ref={bind(1)}>
        {variant.module === 'display' && (
          <group position={[bw * 0.14, STANDOFF + 0.006, -bd * 0.1]}>
            <mesh castShadow material={mats.darkPlastic}>
              <boxGeometry args={[0.030, 0.0035, 0.018]} />
            </mesh>
            {/* the lit panel */}
            <mesh position={[0, 0.0019, 0]} rotation={[-Math.PI / 2, 0, 0]} material={screenMat}>
              <planeGeometry args={[0.024, 0.012]} />
            </mesh>
          </group>
        )}
        {variant.module === 'radio' && (
          <group position={[bw * 0.16, STANDOFF + 0.005, -bd * 0.12]}>
            <mesh castShadow material={mats.shield}>
              <boxGeometry args={[0.024, 0.005, 0.020]} />
            </mesh>
            <mesh position={[0.008, 0.020, 0]} material={mats.darkPlastic}>
              <cylinderGeometry args={[0.0015, 0.0015, 0.036, 8]} />
            </mesh>
            {detail === 'high' && (
              <RadioRings
                position={[0.008, 0.040, 0]}
                color={variant.led}
                maxRadius={0.075}
                period={2.6}
                powerRef={power}
              />
            )}
          </group>
        )}
        {variant.module === 'sensor' && (
          <group position={[bw * 0.16, STANDOFF + 0.005, -bd * 0.12]}>
            <mesh castShadow material={mats.darkPlastic}>
              <boxGeometry args={[0.020, 0.005, 0.020]} />
            </mesh>
            {/* lens barrel */}
            <mesh position={[0, 0.008, 0]} material={mats.darkPlastic}>
              <cylinderGeometry args={[0.005, 0.006, 0.011, 16]} />
            </mesh>
            <mesh position={[0, 0.0138, 0]}>
              <circleGeometry args={[0.0042, 16]} />
              <meshPhysicalMaterial
                color="#0a1a24"
                roughness={0.08}
                metalness={0.2}
                clearcoat={1}
              />
            </mesh>
          </group>
        )}
      </group>

      {/* ---- 2: jumper wires to the breadboard ---------------------------- */}
      <group ref={bind(2)}>
        {detail === 'high' &&
          (['#b8342b', '#2f6fd0', '#c2a12c', '#2f9a52'] as const).map((c, i) => (
            <Wire
              key={c}
              points={[
                [-bw * 0.42 + i * 0.004, STANDOFF + 0.004, bd * 0.3],
                [-bw * 0.6, STANDOFF + 0.022 + i * 0.002, bd * 0.45],
                [-bw * 0.78 - i * 0.005, 0.011, bd * 0.5],
              ]}
              radius={0.0008}
              color={c}
              segments={14}
            />
          ))}
      </group>

      {/* ---- 3: the board ------------------------------------------------- */}
      <group ref={bind(3)}>
        <group position={[0, STANDOFF, 0]}>
          <Pcb
            spec={spec}
            w={bw}
            d={bd}
            materials={mats}
            passives={detail === 'high' ? 110 : 45}
            keepOut={[{ x: 0, z: 0, w: 0.026, d: 0.026 }]}
          >
            <Qfp size={0.016} height={0.0028} pinsPerSide={16} position={[0, 0.0014, 0]} />
            <Header ways={10} pitch={0.00254} height={0.007} color="#101114" position={[0, 0.0008, -bd * 0.36]} />
            <Header ways={10} pitch={0.00254} height={0.007} color="#101114" position={[0, 0.0008, bd * 0.36]} />
            <Electrolytic position={[-bw * 0.32, 0.0008, bd * 0.2]} r={0.0035} h={0.008} />
            <Led color={variant.led} radius={0.0012} position={[-bw * 0.4, 0.002, -bd * 0.3]} pattern="heartbeat" powerRef={power} />
            <Led color="#39ff88" radius={0.001} position={[-bw * 0.36, 0.002, -bd * 0.3]} pattern="solid" powerRef={power} glow={false} />
          </Pcb>
        </group>
      </group>

      {/* ---- 4: nylon standoffs ------------------------------------------- */}
      <group ref={bind(4)}>
        <Screws
          positions={[
            [-bw / 2 + 0.006, STANDOFF / 2, -bd / 2 + 0.006],
            [bw / 2 - 0.006, STANDOFF / 2, -bd / 2 + 0.006],
            [-bw / 2 + 0.006, STANDOFF / 2, bd / 2 - 0.006],
            [bw / 2 - 0.006, STANDOFF / 2, bd / 2 - 0.006],
          ]}
          radius={0.0026}
        />
      </group>

      {/* ---- 5: solderless breadboard ------------------------------------- */}
      <group ref={bind(5)}>
        <group position={[-bw * 0.92, 0.005, bd * 0.5]} rotation={[0, 0.18, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.055, 0.009, 0.084]} />
            <meshStandardMaterial color="#d7d9d2" roughness={0.72} />
          </mesh>
          {/* the centre channel */}
          <mesh position={[0, 0.0047, 0]}>
            <boxGeometry args={[0.007, 0.001, 0.084]} />
            <meshStandardMaterial color="#b9bcb5" roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
