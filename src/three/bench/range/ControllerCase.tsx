/* ============================================================================
   ControllerCase — the sealed control unit that rides on the runner
   ----------------------------------------------------------------------------
   Modelled from the reference photographs of the real unit:

     · a tan ruggedised transit case with moulded latches, a hinged lid, a
       cooling grille, and a status window on the front rail
     · the control board standing on edge behind a clear polycarbonate guard,
       carrying a row of black wire-to-board connectors
     · a sealed battery pack, a bladed fuse block, and the heavy red/blue
       power loom arcing between them
     · the motor driver on its extruded heatsink, and the loom leaving through
       a gland in the case floor toward the gearmotor under the deck
     · the small breakout board on its ribbon

   The drivetrain is NOT in here. On the real machine the controller is sealed
   and the gearmotor sits on the bogie next to the rack it drives, which is
   also the only arrangement where a viewer can see the thing that makes the
   runner move. See TargetRunner.tsx.

   Powered: the lid opens, the board's indicators run, and the radio link
   pulses. Exploded (case study): the internals separate along the vectors
   they arrived on, and the lid lifts clear.
   ========================================================================== */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Pcb, Header, Electrolytic, Qfp } from '../parts/Pcb';
import { Shell, Wire, SleevedLoom, Led, Screws } from '../parts/primitives';
import { deviceMaterials, WIRE_COLORS } from '../materials';
import { caseShellTexture, type PcbSpec } from '../textures';
import { useAssembly, type PartSpec } from '../assembly';
import { sceneState } from '../../sceneState';
import { CASE } from './spec';

const { w: CW, d: CD, h: CH, wall: WALL, lidT: LID_T, lidOpen: LID_OPEN } = CASE;

/** Hinge line: the top of the back wall. */
const HINGE: [number, number, number] = [0, CH, -CD / 2];

/* --- board artwork ------------------------------------------------------- */

const BOARD: PcbSpec = {
  id: 'range',
  seed: 70810,
  w: 700,
  h: 1024,
  // the range board photographs as a brighter leaf green than the tracker's
  mask: '#1a6b3c',
  density: 1,
  mountingHoles: true,
  legend: [
    'FEMC',
    'FIELD EQUIPMENT',
    'MANUFACTURING CO.',
    'شركة تصنيع المعدات الميدانية للصناعة',
  ],
};

/* --- parts, in bind order ------------------------------------------------ */

/* Separation directions are fanned rather than pushed straight out. An
   exploded view is only useful if the parts stop overlapping each other, and
   pushing everything along its nearest axis piles the battery, the fuse block
   and the loom into the same corner of the frame. Each part therefore gets a
   distinct bearing, with the power side going right, the electronics up and
   forward, and the shell opening vertically. */
const PARTS: PartSpec[] = [
  /* 0  lid pivot   */ { pos: HINGE, out: [0, 0.30, -0.10], delay: 0 },
  /* 1  loom        */ { pos: [0, 0, 0], out: [0.02, 0.22, 0.12], delay: 0.12 },
  /* 2  fuse block  */ { pos: [0, 0, 0], out: [0.22, 0.11, 0.18], delay: 0.2 },
  /* 3  battery     */ { pos: [0, 0, 0], out: [0.28, 0.01, -0.05], delay: 0.3 },
  /* 4  guard plate */ { pos: [0, 0, 0], out: [-0.02, 0.10, 0.24], delay: 0.36 },
  /* 5  board       */ { pos: [0, 0, 0], out: [0.03, 0.17, 0.05], delay: 0.44 },
  /* 6  driver      */ { pos: [0, 0, 0], out: [-0.24, 0.06, 0.04], delay: 0.56 },
  /* 7  breakout    */ { pos: [0, 0, 0], out: [0.16, -0.03, 0.22], delay: 0.72 },
  /* 8  case base   */ { pos: [0, 0, 0], out: [0, -0.11, 0], delay: 0.9 },
];

export function ControllerCase({
  activeRef,
  powerRef,
  detail = 'high',
}: {
  activeRef: React.MutableRefObject<number>;
  /** 0..1 "this unit is running", owned by the runner. */
  powerRef: React.MutableRefObject<number>;
  detail?: 'high' | 'low';
}) {
  const mats = useMemo(() => deviceMaterials(), []);
  const { bind } = useAssembly(PARTS, activeRef);
  const lid = useRef<THREE.Group>(null);
  const shellTex = useMemo(() => caseShellTexture(), []);

  /* The lid is the one part whose motion is a hinge rather than a
     displacement, so it is driven here rather than by the assembly table: it
     swings open once the unit is built and running, and on a case study it
     also lifts clear so the interior can be read. */
  useFrame((_, delta) => {
    if (!lid.current) return;
    const d = Math.min(delta, 1 / 30);
    const solo = sceneState.stage !== 'bench';
    const open = solo
      ? Math.max(powerRef.current, sceneState.explode)
      : powerRef.current;
    lid.current.rotation.x = THREE.MathUtils.damp(
      lid.current.rotation.x,
      LID_OPEN * open,
      3,
      d,
    );
  });

  return (
    <group>
      {/* ---- 0: lid ------------------------------------------------------- */}
      <group ref={bind(0)}>
        <group ref={lid}>
          <Shell
            size={[CW, LID_T, CD]}
            radius={0.008}
            material={mats.caseShell}
            position={[0, LID_T / 2, CD / 2]}
          >
            {/* the moulded ribs that run the length of the lid */}
            {[-0.13, 0.0, 0.13].map((x) => (
              <mesh key={x} position={[x, LID_T / 2 - 0.001, 0]}>
                <boxGeometry args={[0.012, 0.004, CD * 0.86]} />
                <meshStandardMaterial map={shellTex} color="#c6b895" roughness={0.84} />
              </mesh>
            ))}
            {/* Moulded boss on the lid face. Deliberately an offset oval:
                a rectangular panel across the centre crossed the ribs and read
                as a plus sign. */}
            <mesh
              position={[0.055, LID_T / 2 - 0.0006, -CD * 0.24]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.026, 0.026, 0.0025, 24]} />
              <meshStandardMaterial map={shellTex} color="#958b6c" roughness={0.9} />
            </mesh>
            {/* sealing gasket on the underside */}
            <mesh position={[0, -LID_T / 2 + 0.002, 0]}>
              <boxGeometry args={[CW * 0.94, 0.003, CD * 0.94]} />
              <meshStandardMaterial color="#0d0e10" roughness={0.95} />
            </mesh>
          </Shell>
        </group>
      </group>

      {/* ---- 1: heavy power loom ----------------------------------------- */}
      <group ref={bind(1)}>
        <Wire
          points={[
            [0.10, 0.075, 0.01],
            [0.04, 0.105, -0.03],
            [-0.03, 0.10, -0.06],
            [-0.09, 0.075, -0.05],
          ]}
          radius={0.0035}
          color={WIRE_COLORS.red}
          segments={22}
        />
        <Wire
          points={[
            [0.10, 0.072, 0.03],
            [0.03, 0.098, 0.0],
            [-0.04, 0.092, -0.03],
            [-0.092, 0.07, -0.02],
          ]}
          radius={0.0035}
          color={WIRE_COLORS.blue}
          segments={22}
        />
        {detail === 'high' && (
          <>
            <Wire
              points={[
                [-0.10, 0.03, 0.06],
                [-0.02, 0.045, 0.09],
                [0.08, 0.035, 0.10],
              ]}
              radius={0.0016}
              color={WIRE_COLORS.black}
              segments={16}
            />
            {/* Sleeved motor bundle leaving through the gland in the floor.
                This is the pair that goes down to the gearmotor on the bogie:
                the case is the only thing that is sealed, and the drive is
                out under the deck where it can be seen working. */}
            <SleevedLoom
              points={[
                [-0.135, 0.045, -0.04],
                [-0.155, 0.022, 0.02],
                [-0.150, 0.004, 0.07],
              ]}
              radius={0.0055}
            />
          </>
        )}
      </group>

      {/* ---- 2: bladed fuse block ---------------------------------------- */}
      <group ref={bind(2)}>
        <group position={[0.155, WALL + 0.012, 0.085]}>
          <mesh castShadow>
            <boxGeometry args={[0.042, 0.024, 0.030]} />
            <meshPhysicalMaterial
              color="#cfd6dc"
              roughness={0.22}
              transmission={0.72}
              thickness={0.01}
              ior={1.5}
            />
          </mesh>
          {/* blade fuses standing in the block */}
          {(['#b8342b', '#b8342b', '#2f9a52', '#c2a12c'] as const).map((c, i) => (
            <mesh key={i} position={[-0.014 + i * 0.0095, 0.014, 0]}>
              <boxGeometry args={[0.006, 0.014, 0.017]} />
              <meshStandardMaterial color={c} roughness={0.42} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ---- 3: battery pack --------------------------------------------- */}
      <group ref={bind(3)}>
        <group position={[0.108, WALL + 0.033, 0.006]}>
          <mesh castShadow receiveShadow material={mats.battery}>
            <boxGeometry args={[0.152, 0.066, 0.104]} />
          </mesh>
          {/* the printed serial panel on the pack's top face */}
          <mesh position={[0, 0.0335, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.05, 0.05]} />
            <meshStandardMaterial color="#d8dce0" roughness={0.85} />
          </mesh>
          {/* hook-and-loop retaining strap across the pack */}
          <mesh position={[-0.02, 0.006, 0]}>
            <boxGeometry args={[0.026, 0.070, 0.108]} />
            <meshStandardMaterial color="#0a0a0c" roughness={0.96} />
          </mesh>
          {/* terminals */}
          <mesh position={[0.06, 0.036, -0.03]} material={mats.steel}>
            <cylinderGeometry args={[0.004, 0.004, 0.006, 10]} />
          </mesh>
          <mesh position={[0.06, 0.036, 0.03]} material={mats.steel}>
            <cylinderGeometry args={[0.004, 0.004, 0.006, 10]} />
          </mesh>
        </group>
      </group>

      {/* ---- 4: clear guard plate over the electronics -------------------- */}
      <group ref={bind(4)}>
        <mesh position={[-0.012, WALL + 0.052, 0.036]} castShadow>
          <boxGeometry args={[0.165, 0.098, 0.004]} />
          <meshPhysicalMaterial
            color="#dfe6ec"
            roughness={0.14}
            transmission={0.86}
            thickness={0.004}
            ior={1.49}
            transparent
            opacity={0.55}
          />
        </mesh>
        {/* the orange marker disc stuck to the guard */}
        <mesh position={[-0.06, WALL + 0.028, 0.0385]}>
          <circleGeometry args={[0.006, 16]} />
          <meshStandardMaterial color="#e0761f" roughness={0.7} />
        </mesh>
      </group>

      {/* ---- 5: control board, standing on edge --------------------------- */}
      <group ref={bind(5)}>
        <group position={[-0.012, WALL + 0.052, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
          <Pcb
            spec={BOARD}
            w={0.155}
            d={0.092}
            materials={mats}
            passives={detail === 'high' ? 170 : 70}
            keepOut={[{ x: 0, z: -0.004, w: 0.03, d: 0.03 }]}
          >
            <Qfp size={0.021} height={0.0032} pinsPerSide={24} position={[0, 0.0016, -0.004]} />
            {/* the row of black wire-to-board connectors along the top edge */}
            {Array.from({ length: 7 }).map((_, i) => (
              <Header
                key={i}
                ways={3}
                pitch={0.0025}
                height={0.008}
                color="#101114"
                position={[-0.058 + i * 0.019, 0.0008, -0.036]}
              />
            ))}
            <Electrolytic position={[0.055, 0.0008, 0.02]} r={0.005} h={0.012} />
            <Electrolytic position={[0.055, 0.0008, 0.034]} r={0.005} h={0.012} />
            <Led
              color="#39ff88"
              radius={0.0013}
              position={[-0.05, 0.0022, 0.03]}
              pattern="fast"
              powerRef={powerRef}
            />
            <Led
              color="#f6a250"
              radius={0.0013}
              position={[-0.044, 0.0022, 0.03]}
              pattern="slow"
              phase={0.4}
              powerRef={powerRef}
            />
          </Pcb>
        </group>

        {/* RF module + whip: the link the targets are commanded over */}
        <group position={[0.055, WALL + 0.104, 0.012]}>
          <mesh material={mats.shield} castShadow>
            <boxGeometry args={[0.022, 0.006, 0.026]} />
          </mesh>
          <mesh position={[0.012, 0.022, 0]} material={mats.darkPlastic}>
            <cylinderGeometry args={[0.0016, 0.0016, 0.042, 8]} />
          </mesh>
        </group>
      </group>

      {/* ---- 6: motor driver on its heatsink ------------------------------ */}
      <group ref={bind(6)}>
        <group position={[-0.128, WALL + 0.026, -0.02]}>
          {/* extruded heatsink, fins across the airflow from the case fan */}
          <mesh castShadow material={mats.metal}>
            <boxGeometry args={[0.088, 0.010, 0.086]} />
          </mesh>
          {detail === 'high' &&
            Array.from({ length: 9 }).map((_, i) => (
              <mesh key={i} position={[-0.036 + i * 0.009, 0.017, 0]} material={mats.metal}>
                <boxGeometry args={[0.0035, 0.024, 0.082]} />
              </mesh>
            ))}
          {/* the half-bridge board bolted under it */}
          <mesh position={[0, -0.008, 0]} castShadow>
            <boxGeometry args={[0.082, 0.0016, 0.080]} />
            <meshStandardMaterial color="#0f2b18" roughness={0.62} metalness={0.08} />
          </mesh>
          {/* the heavy motor terminals on the outboard edge */}
          {[-0.014, 0.014].map((z) => (
            <mesh key={z} position={[-0.036, -0.014, z]} material={mats.steel}>
              <cylinderGeometry args={[0.0035, 0.0035, 0.008, 10]} />
            </mesh>
          ))}
          {detail === 'high' && (
            <Screws
              positions={[
                [0.038, 0.006, 0.036],
                [-0.038, 0.006, 0.036],
                [0.038, 0.006, -0.036],
                [-0.038, 0.006, -0.036],
              ]}
              radius={0.0022}
            />
          )}
          <Led
            color="#ff5a3c"
            radius={0.0016}
            position={[0.03, 0.0, 0.042]}
            pattern="heartbeat"
            powerRef={powerRef}
          />
        </group>
      </group>

      {/* ---- 7: breakout board on its ribbon ------------------------------ */}
      <group ref={bind(7)}>
        <group position={[0.165, WALL + 0.004, 0.118]} rotation={[0, -0.35, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.055, 0.0016, 0.040]} />
            <meshStandardMaterial color="#0e1113" roughness={0.6} metalness={0.1} />
          </mesh>
          <Header ways={8} pitch={0.00254} height={0.006} color="#111318" position={[0, 0.0008, -0.012]} />
          {/* the grey ribbon back into the loom */}
          {detail === 'high' && (
            <mesh position={[-0.045, 0.002, -0.01]} rotation={[0, 0.4, 0.04]}>
              <boxGeometry args={[0.075, 0.0008, 0.020]} />
              <meshStandardMaterial color="#9aa0a6" roughness={0.8} />
            </mesh>
          )}
        </group>
      </group>

      {/* ---- 8: case base ------------------------------------------------- */}
      <group ref={bind(8)}>
        <CaseBase materials={mats} powerRef={powerRef} detail={detail} />
      </group>
    </group>
  );
}

/* --- the transit case ---------------------------------------------------- */

function CaseBase({
  materials,
  powerRef,
  detail,
}: {
  materials: ReturnType<typeof deviceMaterials>;
  powerRef: React.MutableRefObject<number>;
  detail: 'high' | 'low';
}) {
  const shell = materials.caseShell;
  const inner = CD - WALL * 2;

  return (
    <group>
      {/* floor */}
      <mesh position={[0, WALL / 2, 0]} receiveShadow material={shell}>
        <boxGeometry args={[CW, WALL, CD]} />
      </mesh>
      {/* four walls, built separately so the interior stays open to the camera */}
      <Shell size={[CW, CH, WALL]} radius={0.004} material={shell} position={[0, CH / 2, -CD / 2 + WALL / 2]} />
      <Shell size={[CW, CH * 0.86, WALL]} radius={0.004} material={shell} position={[0, (CH * 0.86) / 2, CD / 2 - WALL / 2]} />
      <Shell size={[WALL, CH, inner]} radius={0.004} material={shell} position={[-CW / 2 + WALL / 2, CH / 2, 0]} />
      <Shell size={[WALL, CH, inner]} radius={0.004} material={shell} position={[CW / 2 - WALL / 2, CH / 2, 0]} />

      {/* moulded rim the lid seals against */}
      <mesh position={[0, CH + 0.004, 0]} material={shell}>
        <boxGeometry args={[CW + 0.008, 0.008, CD + 0.008]} />
      </mesh>

      {/* the gland in the floor the motor loom leaves through */}
      <mesh position={[-0.15, WALL / 2, 0.05]} material={materials.darkPlastic}>
        <cylinderGeometry args={[0.014, 0.014, 0.022, 16]} />
      </mesh>

      {/* front latches */}
      {[-0.12, 0.12].map((x) => (
        <group key={x} position={[x, CH * 0.62, CD / 2 + 0.004]}>
          <mesh castShadow material={shell}>
            <boxGeometry args={[0.046, 0.038, 0.014]} />
          </mesh>
          <mesh position={[0, -0.016, 0.004]} material={shell}>
            <boxGeometry args={[0.038, 0.020, 0.010]} />
          </mesh>
        </group>
      ))}

      {/* side handle */}
      <mesh position={[-CW / 2 - 0.008, CH * 0.6, 0.06]} material={shell}>
        <boxGeometry args={[0.016, 0.030, 0.070]} />
      </mesh>

      {/* cooling grille on the front rail */}
      {detail === 'high' &&
        Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} position={[0.02 + i * 0.008, CH * 0.3, CD / 2 + 0.001]}>
            <boxGeometry args={[0.0035, 0.030, 0.003]} />
            <meshStandardMaterial color="#1a1a1c" roughness={0.9} />
          </mesh>
        ))}

      {/* fan behind the grille */}
      <mesh position={[-0.02, CH * 0.3, CD / 2 - 0.004]} rotation={[Math.PI / 2, 0, 0]} material={materials.darkPlastic}>
        <cylinderGeometry args={[0.018, 0.018, 0.008, 16]} />
      </mesh>

      {/* status window on the front rail — the small lit readout */}
      <group position={[0.155, CH * 0.42, CD / 2 + 0.002]}>
        <mesh material={materials.darkPlastic}>
          <boxGeometry args={[0.040, 0.016, 0.004]} />
        </mesh>
        <Led color="#ff3b2f" radius={0.0014} position={[-0.010, 0, 0.003]} pattern="slow" powerRef={powerRef} glow={false} />
        <Led color="#39ff88" radius={0.0014} position={[-0.002, 0, 0.003]} pattern="fast" powerRef={powerRef} glow={false} />
        <Led color="#f6a250" radius={0.0014} position={[0.006, 0, 0.003]} pattern="heartbeat" powerRef={powerRef} glow={false} />
      </group>

      {/* Bulkhead connector and the external whip screwed onto it. The
          antenna has to be outside a sealed case, and it is also the point
          the operator's commands physically arrive at — see CommandLink. */}
      <mesh position={[0.08, CH * 0.32, CD / 2 + 0.006]} rotation={[Math.PI / 2, 0, 0]} material={materials.metal}>
        <cylinderGeometry args={[0.005, 0.005, 0.014, 12]} />
      </mesh>
      <group position={[0.08, CH * 0.32, CD / 2 + 0.014]}>
        <mesh rotation={[0.30, 0, 0]} position={[0, 0.085, 0.026]} material={materials.darkPlastic}>
          <cylinderGeometry args={[0.0038, 0.0045, 0.185, 10]} />
        </mesh>
        <mesh rotation={[0.30, 0, 0]} position={[0, 0.006, 0.002]} material={materials.metal}>
          <cylinderGeometry args={[0.007, 0.007, 0.016, 12]} />
        </mesh>
        {/* No expanding rings on the whip. Every other radio on this bench
            gets them, but concentric circles hung on a shooting-range target
            carrier read as a bullseye, and the link is already drawn properly
            as traffic on an arc — see range/CommandLink.tsx. */}
      </group>

      {/* hinge knuckles along the back edge */}
      {detail === 'high' &&
        [-0.14, -0.047, 0.047, 0.14].map((x) => (
          <mesh key={x} position={[x, CH, -CD / 2 - 0.004]} rotation={[0, 0, Math.PI / 2]} material={shell}>
            <cylinderGeometry args={[0.008, 0.008, 0.05, 12]} />
          </mesh>
        ))}
    </group>
  );
}
