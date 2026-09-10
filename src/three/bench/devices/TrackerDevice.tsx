/* ============================================================================
   TrackerDevice — MYMO2 / VTM300 vehicle tracker
   ----------------------------------------------------------------------------
   Modelled from the reference photographs of the real unit:

     · black moulded ABS shell, ~86 x 62 x 16 mm, two-part with a lip seam
     · the printed back label, carrying the unit's actual markings
     · a status LED that glows through the lid (photographed lit, green)
     · the carrier board: shielded cellular module, wide-body flash, a white
       polarised header on the right edge, a u.FL connector, and a thin coax
       running out to a flexible film antenna
     · the vehicle harness — a keyed connector with four coloured cores in a
       braided sleeve

   Powered state: the LED runs a firmware-style double blink, the antenna
   radiates, and a GNSS lock ring settles over the device.
   ========================================================================== */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Pcb, ShieldedModule, Header, Electrolytic } from '../parts/Pcb';
import { Shell, Wire, Led, RadioRings, Screws } from '../parts/primitives';
import { useDeviceMaterials, WIRE_COLORS } from '../materials';
import { labelTexture, moduleLabelTexture, type PcbSpec } from '../textures';
import { useAssembly, type PartSpec } from '../assembly';
import { sceneState } from '../../sceneState';
import { POWER_GATE, POWER_RATE } from './power';

/* --- dimensions, metres -------------------------------------------------- */

const W = 0.086;
const D = 0.062;
const H = 0.016;
/* Height of the base half; the lid is the remainder. The board and everything
   standing on it has to clear this line, or the lid closes through its own
   components — the split is set from the tallest part on the board (the
   module, at ~3.4mm over the laminate) plus a little air. */
const SPLIT = 0.0112;

const BOARD_W = 0.074;
const BOARD_D = 0.050;
const BOARD_Y = 0.0055;

/* --- board artwork ------------------------------------------------------- */

const BOARD: PcbSpec = {
  id: 'tracker',
  seed: 20250,
  w: 1024,
  h: 700,
  // the carrier board photographs a shade darker and bluer than the range board
  mask: '#12482e',
  density: 0.85,
  mountingHoles: false,
};

/* The label text is transcribed from the photograph of the real unit's back
   face — nothing here is invented copy. */
const LABEL = {
  id: 'vtm300',
  brand: 'MYMO2',
  product: 'VTM300',
  lines: [
    'Input Voltage Range: 9-28 V DC',
    'Power Consumption: 150 mA @12V (maximum)',
    'Wireless Standard: Multi-band LTE / EGPRS',
    'GNSS / BLE',
    'Kingdom of Saudi Arabia',
    'CST TA 2025-309',
  ],
  serial: 'SN: MM-01-0000189',
  extra: 'SAUDI MADE  ·  ISO CERTIFIED  ·  10-2025',
};

/* --- parts, in bind order ------------------------------------------------ */

const PARTS: PartSpec[] = [
  /* 0 lid          */ { pos: [0, 0, 0], out: [0, 0.058, 0], delay: 0 },
  /* 1 harness      */ { pos: [0, 0, 0], out: [0, 0.03, -0.075], delay: 0.15 },
  /* 2 antenna      */ { pos: [0, 0, 0], out: [0.085, 0.006, 0.03], delay: 0.2 },
  /* 3 coax         */ { pos: [0, 0, 0], out: [0.05, 0.02, 0.02], delay: 0.25 },
  /* 4 module       */ { pos: [0, 0, 0], out: [0, 0.042, -0.006], delay: 0.45 },
  /* 5 flash + jst  */ { pos: [0, 0, 0], out: [-0.04, 0.03, 0.012], delay: 0.5 },
  /* 6 board        */ { pos: [0, 0, 0], out: [0, 0.016, 0], delay: 0.6 },
  /* 7 base         */ { pos: [0, 0, 0], out: [0, -0.045, 0], delay: 0.8 },
];

export function TrackerDevice({
  activeRef,
  detail = 'high',
}: {
  activeRef: React.MutableRefObject<number>;
  detail?: 'high' | 'low';
}) {
  const mats = useDeviceMaterials();
  const labelMap = useMemo(() => labelTexture(LABEL), []);
  const moduleMap = useMemo(
    () => moduleLabelTexture('ec200u', 'EC200U', 'QUECTEL'),
    [],
  );
  const { bind, live } = useAssembly(PARTS, activeRef);

  /* Powered-up gate. Separate from `live` (which is geometry assembly) so the
     device finishes building before anything lights: hardware does not blink
     while it is still in pieces. */
  const power = useRef(0);
  useFrame((_, delta) => {
    const want =
      sceneState.inspect ? 1 : live.current > POWER_GATE ? sceneState.power : 0;
    power.current = THREE.MathUtils.damp(
      power.current,
      want,
      POWER_RATE,
      Math.min(delta, 0.1),
    );
  });

  return (
    <group>
      {/* ---- 0: lid, with the printed label and the LED light pipe -------- */}
      <group ref={bind(0)}>
        <Shell
          size={[W, H - SPLIT, D]}
          radius={0.0028}
          material={mats.abs}
          position={[0, SPLIT + (H - SPLIT) / 2, 0]}
        >
          {/* printed rating label, recessed into the moulding */}
          <mesh
            position={[0, (H - SPLIT) / 2 + 0.00004, 0]}
            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          >
            <planeGeometry args={[D * 0.92, W * 0.9]} />
            <meshStandardMaterial map={labelMap} roughness={0.88} metalness={0.02} />
          </mesh>
          {/* the moulded lip that meets the base */}
          <mesh position={[0, -(H - SPLIT) / 2 + 0.0004, 0]}>
            <boxGeometry args={[W * 0.985, 0.0008, D * 0.985]} />
            <meshStandardMaterial color="#0c0d0f" roughness={0.8} />
          </mesh>
          {/* translucent light pipe over the status LED — this is the green
              glow the unit shows through its lid when it is running */}
          <mesh position={[-W * 0.35, (H - SPLIT) / 2 - 0.0004, -D * 0.3]}>
            <cylinderGeometry args={[0.0022, 0.0022, 0.0012, 12]} />
            <meshPhysicalMaterial
              color="#0f1512"
              roughness={0.35}
              transmission={0.55}
              thickness={0.002}
              ior={1.45}
            />
          </mesh>
        </Shell>
      </group>

      {/* ---- 1: vehicle harness ------------------------------------------ */}
      <group ref={bind(1)}>
        {/* keyed connector body sitting in the notch at the top edge */}
        <mesh position={[W * 0.12, H * 0.62, -D * 0.52]} castShadow material={mats.darkPlastic}>
          <boxGeometry args={[0.020, 0.010, 0.012]} />
        </mesh>
        {/* the four coloured cores, before they disappear into the sleeve */}
        {(
          [
            [WIRE_COLORS.yellow, -0.006],
            [WIRE_COLORS.blue, -0.002],
            [WIRE_COLORS.red, 0.002],
            [WIRE_COLORS.black, 0.006],
          ] as const
        ).map(([color, dx], i) => (
          <Wire
            key={i}
            points={[
              [W * 0.12 + dx, H * 0.62, -D * 0.56],
              [W * 0.12 + dx, H * 0.72, -D * 0.72],
              [W * 0.2 + dx * 2, H * 0.5, -D * 0.95],
            ]}
            radius={0.0009}
            color={color}
            segments={12}
          />
        ))}
        {/* braided sleeve carrying the bundle off the bench */}
        <Wire
          points={[
            [W * 0.2, H * 0.5, -D * 0.95],
            [W * 0.35, H * 0.3, -D * 1.3],
            [W * 0.62, H * 0.16, -D * 1.5],
          ]}
          radius={0.0038}
          color="#141519"
          segments={16}
        />
      </group>

      {/* ---- 2: flexible film antenna ------------------------------------ */}
      <group ref={bind(2)}>
        <mesh position={[W * 0.78, 0.0006, D * 0.34]} rotation={[0, -0.38, 0]} castShadow>
          <boxGeometry args={[0.046, 0.0011, 0.014]} />
          {/* matte black film. Low roughness here catches the bench light
              across the whole face and the antenna reads as a mirror. */}
          <meshStandardMaterial color="#0a0b0e" roughness={0.86} metalness={0.05} />
        </mesh>
        {/* the u.FL crimp at the antenna end */}
        <mesh position={[W * 0.62, 0.0016, D * 0.30]} material={mats.shield}>
          <cylinderGeometry args={[0.0016, 0.0016, 0.0014, 10]} />
        </mesh>
        {detail === 'high' && (
          <RadioRings
            position={[W * 0.78, 0.004, D * 0.34]}
            color="#3fe0d0"
            maxRadius={0.046}
            period={2.2}
            powerRef={power}
          />
        )}
      </group>

      {/* ---- 3: coax from board to antenna ------------------------------- */}
      <group ref={bind(3)}>
        <Wire
          points={[
            [W * 0.16, BOARD_Y + 0.0026, D * 0.1],
            [W * 0.34, BOARD_Y + 0.006, D * 0.26],
            [W * 0.52, 0.0035, D * 0.33],
            [W * 0.62, 0.0022, D * 0.30],
          ]}
          radius={0.00055}
          color="#0e0f12"
          segments={20}
        />
      </group>

      {/* ---- 4: cellular module ------------------------------------------ */}
      <group ref={bind(4)}>
        <ShieldedModule
          position={[-W * 0.02, BOARD_Y + 0.0008, -D * 0.06]}
          w={0.029}
          d={0.032}
          h={0.0026}
          materials={mats}
          label={moduleMap}
        />
      </group>

      {/* ---- 5: flash, header, and the board-mounted odds and ends -------- */}
      <group ref={bind(5)}>
        {/* wide-body flash package on the left of the board */}
        <mesh position={[-W * 0.31, BOARD_Y + 0.0018, D * 0.14]} castShadow>
          <boxGeometry args={[0.0105, 0.0018, 0.0135]} />
          <meshStandardMaterial color="#111114" roughness={0.44} metalness={0.12} />
        </mesh>
        {/* polarised 2-way header on the right edge, white shroud */}
        <Header
          ways={2}
          pitch={0.002}
          height={0.0048}
          color="#d9d9d3"
          position={[W * 0.34, BOARD_Y + 0.0008, D * 0.16]}
        />
        <Electrolytic position={[W * 0.24, BOARD_Y + 0.0008, -D * 0.24]} r={0.0026} h={0.0055} />
        {/* the status LED itself, under the lid's light pipe */}
        <Led
          color="#33ff7a"
          radius={0.0011}
          position={[-W * 0.35, BOARD_Y + 0.0018, -D * 0.3]}
          pattern="heartbeat"
          powerRef={power}
        />
      </group>

      {/* ---- 6: carrier board -------------------------------------------- */}
      <group ref={bind(6)}>
        <group position={[0, BOARD_Y, 0]}>
          <Pcb
            spec={BOARD}
            w={BOARD_W}
            d={BOARD_D}
            materials={mats}
            passives={detail === 'high' ? 150 : 60}
            keepOut={[
              { x: -W * 0.02, z: -D * 0.06, w: 0.034, d: 0.037 },
              { x: -W * 0.31, z: D * 0.14, w: 0.014, d: 0.017 },
            ]}
          />
        </group>
      </group>

      {/* ---- 7: base shell ----------------------------------------------- */}
      <group ref={bind(7)}>
        <Shell
          size={[W, SPLIT, D]}
          radius={0.0028}
          material={mats.abs}
          position={[0, SPLIT / 2, 0]}
          receiveShadow
        >
          {/* internal standoffs the board sits on */}
          {detail === 'high' && (
            <Screws
              positions={[
                [-BOARD_W / 2 + 0.004, SPLIT / 2 - 0.0002, -BOARD_D / 2 + 0.004],
                [BOARD_W / 2 - 0.004, SPLIT / 2 - 0.0002, -BOARD_D / 2 + 0.004],
                [-BOARD_W / 2 + 0.004, SPLIT / 2 - 0.0002, BOARD_D / 2 - 0.004],
                [BOARD_W / 2 - 0.004, SPLIT / 2 - 0.0002, BOARD_D / 2 - 0.004],
              ]}
              radius={0.0018}
            />
          )}
        </Shell>
      </group>
    </group>
  );
}

/** Bounding height used by the bench to seat the device on the mat. */
TrackerDevice.height = H;
