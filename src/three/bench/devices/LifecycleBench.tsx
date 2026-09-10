/* ============================================================================
   LifecycleBench — Unified Device Lifecycle Database, as a thing you can see
   ----------------------------------------------------------------------------
   A database is not an object, and the honest way to stage one is not to
   invent a server rack that never existed. What this project unified was the
   record of a device's life: the same unit, at five points, previously
   written down in five different places.

   So the bench holds one device five times over, on a stepped tray, in the
   five states the record distinguishes:

     01  bare board        as fabricated
     02  populated         after assembly
     03  in the shell      during build
     04  sealed & labelled shipped, and identified
     05  returned          back off the field, tag attached

   A cursor walks the tray, lighting one bay at a time, in step with the
   lifecycle console on the monitor behind it. What the reader sees is the
   thing the database is about, not a metaphor for a database.

   The exploded view is the payoff: the five states separate along the tray,
   which turns the object into the diagram it always was.
   ========================================================================== */

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Qfp } from '../parts/Pcb';
import { Led } from '../parts/primitives';
import { useDeviceMaterials, ledMaterial } from '../materials';
import { useAssembly, type PartSpec } from '../assembly';
import { sceneState } from '../../sceneState';
import { POWER_GATE, POWER_RATE } from './power';

const BAYS = 5;
/** centre-to-centre along the tray, metres. */
const PITCH = 0.042;
/** each bay stands one riser higher than the last. */
const RISE = 0.007;
const PLINTH_W = 0.036;
const PLINTH_D = 0.05;
const BOARD_W = 0.026;
const BOARD_D = 0.018;
const SHELL_H = 0.011;

/** seconds the cursor rests on each record. */
const DWELL = 1.9;

const bayX = (i: number) => (i - (BAYS - 1) / 2) * PITCH;
const bayY = (i: number) => 0.004 + i * RISE;

/* --- parts ---------------------------------------------------------------
   The five bays are five separate parts, so the case study's exploded view
   fans the device's life out along the tray instead of lifting a lid off it.
   The tray and the index rail come apart downward and forward, which keeps
   the five states readable as a row while everything else clears out.        */
const PARTS: PartSpec[] = [
  ...Array.from({ length: BAYS }, (_, i) => ({
    pos: [0, 0, 0] as [number, number, number],
    out: [(i - (BAYS - 1) / 2) * 0.05, 0.028 + i * 0.004, 0.006] as [number, number, number],
    delay: 0.08 * i,
  })),
  /* 5 tray  */ { pos: [0, 0, 0], out: [0, -0.032, 0], delay: 0.72 },
  /* 6 index */ { pos: [0, 0, 0], out: [0, 0.012, 0.05], delay: 0.88 },
];

/* --- one device, in five states ------------------------------------------ */

function BareBoard({ material }: { material: THREE.Material }) {
  return (
    <mesh castShadow receiveShadow material={material}>
      <boxGeometry args={[BOARD_W, 0.0016, BOARD_D]} />
    </mesh>
  );
}

function Populated({
  material,
  detail,
}: {
  material: THREE.Material;
  detail: 'high' | 'low';
}) {
  return (
    <group>
      <BareBoard material={material} />
      <Qfp size={0.009} height={0.0018} pinsPerSide={10} position={[0, 0.0008, 0]} />
      {detail === 'high' &&
        ([
          [-0.008, -0.005],
          [0.008, -0.004],
          [-0.007, 0.006],
          [0.009, 0.005],
        ] as const).map(([x, z], i) => (
          <mesh key={i} position={[x, 0.0014, z]}>
            <boxGeometry args={[0.0024, 0.0012, 0.0016]} />
            <meshStandardMaterial color="#1b1d21" roughness={0.6} />
          </mesh>
        ))}
    </group>
  );
}

/** The moulded bottom half, with the populated board dropped into it. */
function InShell({
  mats,
  detail,
}: {
  mats: ReturnType<typeof useDeviceMaterials>;
  detail: 'high' | 'low';
}) {
  return (
    <group>
      {/* four walls and a floor, as a shallow open tray */}
      <mesh position={[0, SHELL_H * 0.22, 0]} castShadow receiveShadow material={mats.abs}>
        <boxGeometry args={[BOARD_W + 0.006, SHELL_H * 0.44, BOARD_D + 0.006]} />
      </mesh>
      <mesh position={[0, SHELL_H * 0.36, 0]}>
        <boxGeometry args={[BOARD_W + 0.001, SHELL_H * 0.2, BOARD_D + 0.001]} />
        <meshStandardMaterial color="#0b0d10" roughness={0.85} />
      </mesh>
      <group position={[0, SHELL_H * 0.4, 0]}>
        <Populated material={mats.fr4} detail={detail} />
      </group>
    </group>
  );
}

/** Closed, and carrying its identity — which is the row the database keys on. */
function Sealed({
  mats,
  label,
}: {
  mats: ReturnType<typeof useDeviceMaterials>;
  label: THREE.Material;
}) {
  return (
    <group>
      <mesh position={[0, SHELL_H / 2, 0]} castShadow receiveShadow material={mats.abs}>
        <boxGeometry args={[BOARD_W + 0.006, SHELL_H, BOARD_D + 0.006]} />
      </mesh>
      {/* the parting line between the halves */}
      <mesh position={[0, SHELL_H * 0.46, 0]}>
        <boxGeometry args={[BOARD_W + 0.0065, 0.0004, BOARD_D + 0.0065]} />
        <meshStandardMaterial color="#050608" roughness={0.9} />
      </mesh>
      {/* the printed label: the serial the record is filed under */}
      <mesh position={[0, SHELL_H + 0.00012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={label}>
        <planeGeometry args={[(BOARD_W + 0.006) * 0.66, (BOARD_D + 0.006) * 0.52]} />
      </mesh>
    </group>
  );
}

export function LifecycleBench({
  activeRef,
  detail = 'high',
}: {
  activeRef: React.MutableRefObject<number>;
  detail?: 'high' | 'low';
}) {
  const mats = useDeviceMaterials();
  const { bind, live } = useAssembly(PARTS, activeRef);
  const power = useRef(0);

  /* The label is a plain light surface rather than printed artwork. At this
     size a rendered serial is four unreadable pixels, and a label that says
     something illegible reads worse than one that is simply blank stock. */
  const labelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#cfd4d0', roughness: 0.82, metalness: 0 }),
    [],
  );
  useLayoutEffect(() => () => labelMat.dispose(), [labelMat]);

  /* One strip per bay along the front edge of the tray — the row the cursor
     is on. Separate materials, because the whole point is that exactly one of
     them is lit at a time. */
  const strips = useMemo(
    () => Array.from({ length: BAYS }, () => ledMaterial('#8f7bf0', 0.2)),
    [],
  );
  const markerMat = useMemo(() => ledMaterial('#8f7bf0', 0.2), []);
  const marker = useRef<THREE.Mesh>(null);
  const cursor = useRef(0);

  useFrame((state, delta) => {
    const d = Math.min(delta, 1 / 30);
    const want = sceneState.inspect ? 1 : live.current > POWER_GATE ? sceneState.power : 0;
    power.current = THREE.MathUtils.damp(power.current, want, POWER_RATE, d);
    const p = power.current;

    const at = Math.floor((state.clock.elapsedTime / DWELL) % BAYS);

    /* The marker slides rather than cuts. A query result that teleports reads
       as five separate lights; one that travels reads as a cursor. */
    cursor.current = THREE.MathUtils.damp(cursor.current, at, 9, d);
    if (marker.current) {
      marker.current.position.x = bayX(0) + cursor.current * PITCH;
      (marker.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.05 + 3.4 * p;
    }

    for (let i = 0; i < BAYS; i++) {
      const near = 1 - Math.min(1, Math.abs(cursor.current - i));
      strips[i].emissiveIntensity = (0.08 + near * 3.2) * p;
    }
  });

  const bayContent = (i: number) => {
    switch (i) {
      case 0:
        return <BareBoard material={mats.fr4} />;
      case 1:
        return <Populated material={mats.fr4} detail={detail} />;
      case 2:
        return <InShell mats={mats} detail={detail} />;
      case 3:
        return <Sealed mats={mats} label={labelMat} />;
      default:
        return (
          <group>
            <Sealed mats={mats} label={labelMat} />
            {/* the return tag: the state the unified record exists to make
                findable, and the only one carrying a warning colour */}
            <group position={[BOARD_W * 0.42, SHELL_H, BOARD_D * 0.3]}>
              <mesh position={[0, 0.007, 0]} material={mats.darkPlastic}>
                <cylinderGeometry args={[0.0004, 0.0004, 0.014, 6]} />
              </mesh>
              <mesh position={[0.005, 0.013, 0]} rotation={[0, 0, -0.2]}>
                <planeGeometry args={[0.011, 0.007]} />
                <meshStandardMaterial
                  color="#f6a250"
                  roughness={0.75}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
            <Led
              color="#f6a250"
              radius={0.0011}
              position={[-BOARD_W * 0.3, SHELL_H + 0.001, BOARD_D * 0.2]}
              pattern="slow"
              powerRef={power}
            />
          </group>
        );
    }
  };

  return (
    <group>
      {/* ---- 0..4: the same device, five times over ----------------------- */}
      {Array.from({ length: BAYS }, (_, i) => (
        <group key={i} ref={bind(i)}>
          <group position={[bayX(i), bayY(i), 0]}>{bayContent(i)}</group>
        </group>
      ))}

      {/* ---- 5: the stepped tray ------------------------------------------ */}
      <group ref={bind(BAYS)}>
        {Array.from({ length: BAYS }, (_, i) => (
          <group key={i}>
            <mesh
              position={[bayX(i), bayY(i) / 2, 0]}
              castShadow
              receiveShadow
              material={mats.metal}
            >
              <boxGeometry args={[PLINTH_W, bayY(i), PLINTH_D]} />
            </mesh>
            {/* the row's own indicator, on the front face of its riser */}
            <mesh
              position={[bayX(i), bayY(i) * 0.5, PLINTH_D / 2 + 0.0004]}
              material={strips[i]}
            >
              <planeGeometry args={[PLINTH_W * 0.72, 0.0016]} />
            </mesh>
          </group>
        ))}
        {/* the base the steps stand on */}
        <mesh position={[0, -0.002, 0]} receiveShadow material={mats.darkPlastic}>
          <boxGeometry args={[BAYS * PITCH + 0.012, 0.004, PLINTH_D + 0.01]} />
        </mesh>
      </group>

      {/* ---- 6: the index rail the cursor runs on ------------------------- */}
      <group ref={bind(BAYS + 1)}>
        <group position={[0, 0.0022, PLINTH_D / 2 + 0.012]}>
          <mesh receiveShadow material={mats.darkPlastic}>
            <boxGeometry args={[BAYS * PITCH + 0.012, 0.0022, 0.006]} />
          </mesh>
          {/* one tick per record */}
          {Array.from({ length: BAYS }, (_, i) => (
            <mesh key={i} position={[bayX(i), 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.0008, 0.004]} />
              <meshStandardMaterial color="#4a5058" roughness={0.8} />
            </mesh>
          ))}
          {/* the cursor */}
          <mesh
            ref={marker}
            position={[bayX(0), 0.0014, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={markerMat}
          >
            <planeGeometry args={[0.006, 0.0042]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
