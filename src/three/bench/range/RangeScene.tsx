/* ============================================================================
   RangeScene — the shooting-range case study, as a place
   ----------------------------------------------------------------------------
   An indoor lane: concrete under overhead baffles, dividers at the firing
   point, the operator's console on a table behind the line, the rail running
   downrange, and a steel backstop at the end of it. On the rail is the same
   runner the home page shows, at the same scale, built from the same table.

   Two honest compressions, both deliberate:

     · the lane is ~12m of model marked out to 25m. A 25m room framed on a
       32° lens puts the target at four percent of frame height and the whole
       page becomes a picture of an empty floor. The distance plates say what
       the lane is; the geometry is scaled so the hardware is legible.
     · the set is dressed only where the camera goes. Six shots visit the
       firing point, the near rail, the length of the lane and the backstop —
       nothing is modelled behind the reader.

   Nothing here runs on a clock. The carriage follows `sceneState.runner`,
   which the page's scroll writes; the lights, the link and every rotating
   part follow the carriage.
   ========================================================================== */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { sceneState } from '../../sceneState';
import { benchMaterials, deviceMaterials } from '../materials';
import { rangeMarkerTexture } from '../textures';
import { Laptop } from '../props/Computers';
import { Rail } from './Rail';
import { TargetRunner } from './TargetRunner';
import { CommandLink } from './CommandLink';
import { LANE_RAIL_LEN } from './spec';
import { BACKSTOP_X, CONSOLE, FIRING_X, LANE_TRAVEL } from './rangePath';

/* --- the room ------------------------------------------------------------ */

const HALF_W = 2.6; // the lane's own bay, wall to wall
const CEIL_Y = 3.0;
/* Room enough behind the firing point for the wide shot to stand in, plus
   the portrait pull-back. Short of this the camera ends up outside the set. */
const FLOOR_FROM = FIRING_X - 6.4;
const FLOOR_TO = BACKSTOP_X + 0.6;
const FLOOR_LEN = FLOOR_TO - FLOOR_FROM;
const FLOOR_MID = (FLOOR_FROM + FLOOR_TO) / 2;

/** Distance plates on the left-hand wall, as (x, label). The lane is marked
 *  out at even intervals; see the note at the top of the file. */
const MARKERS: [number, string][] = [
  [-4.2, '5'],
  [-1.6, '10'],
  [1.0, '15'],
  [3.6, '20'],
  [6.0, '25'],
];

export function RangeScene({ detail = 'high' }: { detail?: 'high' | 'low' }) {
  const m = benchMaterials();
  const mats = useMemo(() => deviceMaterials(), []);
  const at = useRef(0);
  const power = useRef(1);

  /* The carriage is damped toward the scrubbed position rather than snapped
     to it. The scrub already smooths the scroll; this second stage is what
     stops a fast flick reading as a teleport, and it is also what gives the
     wheels a velocity to turn at during the settle. */
  useFrame((_, delta) => {
    const d = Math.min(delta, 1 / 30);
    at.current = sceneState.snap
      ? sceneState.runner
      : THREE.MathUtils.damp(at.current, sceneState.runner, 6, d);
    // the camera's tracking shots follow the carriage, not the instruction
    sceneState.runnerAt = at.current;
    power.current = 1;
  });

  const concrete = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ color: '#2a2f36', roughness: 0.93, metalness: 0.05 }),
    [],
  );
  const paint = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#8a7326', roughness: 0.9, metalness: 0 }),
    [],
  );
  const baffle = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0f1216', roughness: 0.92, metalness: 0.06 }),
    [],
  );
  const strip = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0d1014',
        emissive: new THREE.Color('#dbeaff'),
        emissiveIntensity: 1.35,
        toneMapped: false,
        roughness: 0.4,
      }),
    [],
  );
  const plateMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2b3138', roughness: 0.5, metalness: 0.85 }),
    [],
  );

  useEffect(
    () => () => {
      for (const x of [concrete, paint, baffle, strip, plateMat]) x.dispose();
    },
    [concrete, paint, baffle, strip, plateMat],
  );

  const markerMats = useMemo(
    () =>
      MARKERS.map(
        ([, label]) =>
          new THREE.MeshStandardMaterial({
            map: rangeMarkerTexture(label),
            roughness: 0.75,
            metalness: 0.05,
          }),
      ),
    [],
  );
  useEffect(() => () => markerMats.forEach((x) => x.dispose()), [markerMats]);

  /** Overhead bays. Each is a baffle and the strip behind it, which is what
   *  makes the length of the lane readable — the eye counts fixtures. */
  const bays = useMemo(() => {
    const step = 2.0;
    const n = Math.floor(FLOOR_LEN / step);
    return Array.from({ length: n }, (_, i) => FLOOR_FROM + step * (i + 0.5));
  }, []);

  return (
    <group>
      {/* --- floor, walls, ceiling ---------------------------------------- */}
      <mesh
        position={[FLOOR_MID, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        material={concrete}
      >
        <planeGeometry args={[FLOOR_LEN, HALF_W * 2]} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh
          key={s}
          position={[FLOOR_MID, CEIL_Y / 2, s * HALF_W]}
          rotation={[0, s > 0 ? Math.PI : 0, 0]}
          material={m.wall}
        >
          <planeGeometry args={[FLOOR_LEN, CEIL_Y]} />
        </mesh>
      ))}
      <mesh position={[FLOOR_MID, CEIL_Y, 0]} rotation={[Math.PI / 2, 0, 0]} material={baffle}>
        <planeGeometry args={[FLOOR_LEN, HALF_W * 2]} />
      </mesh>
      {/* the wall behind the firing point, so shot 5 has something to end on */}
      <mesh position={[FLOOR_FROM, CEIL_Y / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={m.wall}>
        <planeGeometry args={[HALF_W * 2, CEIL_Y]} />
      </mesh>

      {/* --- overhead bays -------------------------------------------------- */}
      {bays.map((x) => (
        <group key={x} position={[x, CEIL_Y - 0.06, 0]}>
          <mesh material={baffle} castShadow>
            <boxGeometry args={[0.10, 0.42, HALF_W * 2]} />
          </mesh>
          <mesh position={[0.55, 0.02, 0]} material={strip}>
            <boxGeometry args={[0.9, 0.03, 0.10]} />
          </mesh>
        </group>
      ))}

      {/* --- lane paint ----------------------------------------------------- */}
      <group position={[0, 0.004, 0]}>
        {/* the firing line */}
        <mesh position={[FIRING_X, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={paint}>
          <planeGeometry args={[0.07, HALF_W * 1.6]} />
        </mesh>
        {/* the lane's own edges, running the length of the bay */}
        {([-1, 1] as const).map((s) => (
          <mesh
            key={s}
            position={[FLOOR_MID, 0, s * 1.35]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={paint}
          >
            <planeGeometry args={[FLOOR_LEN * 0.94, 0.04]} />
          </mesh>
        ))}
        {detail === 'high' &&
          MARKERS.map(([x]) => (
            <mesh
              key={x}
              position={[x, 0, 1.05]}
              rotation={[-Math.PI / 2, 0, 0]}
              material={paint}
            >
              <planeGeometry args={[0.05, 0.5]} />
            </mesh>
          ))}
      </group>

      {/* --- distance plates on the left wall ------------------------------- */}
      {MARKERS.map(([x], i) => (
        <group key={x} position={[x, 1.55, -HALF_W + 0.05]}>
          <mesh material={markerMats[i]}>
            <planeGeometry args={[0.46, 0.29]} />
          </mesh>
          <mesh position={[0, 0, -0.012]} material={plateMat}>
            <boxGeometry args={[0.52, 0.35, 0.02]} />
          </mesh>
        </group>
      ))}

      {/* --- the firing point ----------------------------------------------- */}
      <FiringPoint detail={detail} materials={mats} concrete={concrete} />

      {/* --- the track and the runner ---------------------------------------- */}
      <Rail length={LANE_RAIL_LEN} detail={detail} />
      <TargetRunner
        activeRef={power}
        powerRef={power}
        atRef={at}
        travel={LANE_TRAVEL}
        detail={detail}
      />
      <CommandLink
        from={[CONSOLE[0] + 0.05, 1.06, CONSOLE[2] + 0.1]}
        atRef={at}
        travel={LANE_TRAVEL}
        powerRef={power}
        detail={detail}
        count={6}
        lift={0.13}
      />

      {/* --- the backstop ---------------------------------------------------- */}
      <Backstop detail={detail} plate={plateMat} />
    </group>
  );
}

/* --- the firing point ----------------------------------------------------- */

/** Behind the line: the dividers, the shooting table, the operator's console,
 *  and the equipment case the whole system travels in. */
function FiringPoint({
  detail,
  materials,
  concrete,
}: {
  detail: 'high' | 'low';
  materials: ReturnType<typeof deviceMaterials>;
  concrete: THREE.Material;
}) {
  const m = benchMaterials();

  return (
    <group>
      {/* lane dividers: panels hanging between the bays at the firing point */}
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[FIRING_X + 0.5, 0, s * 1.45]}>
          <mesh position={[0, 1.0, 0]} castShadow material={m.polymer}>
            <boxGeometry args={[1.5, 2.0, 0.05]} />
          </mesh>
          {/* the post it hangs off */}
          <mesh position={[-0.72, 1.0, 0]} material={m.chassis}>
            <boxGeometry args={[0.07, 2.0, 0.09]} />
          </mesh>
        </group>
      ))}

      {/* the shooting table */}
      <group position={[CONSOLE[0], 0, CONSOLE[2]]}>
        {/* Steel, not the bench's wood: this is range furniture, and a pale
            top under the firing-point light fills half the console shot with
            a blown-out plank. */}
        <mesh position={[0, 0.92, 0]} castShadow receiveShadow material={m.polymer}>
          <boxGeometry args={[1.5, 0.05, 0.72]} />
        </mesh>
        {([-1, 1] as const).map((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh
              key={`${sx}:${sz}`}
              position={[sx * 0.66, 0.45, sz * 0.28]}
              material={m.chassis}
            >
              <boxGeometry args={[0.05, 0.9, 0.05]} />
            </mesh>
          )),
        )}
        {/* the console itself — the lane list, running */}
        {/* Turned back toward the operator, who stands behind the line facing
            downrange — so the screen faces up the lane, not down it. */}
        <Laptop position={[0.08, 0.945, 0.02]} rotation={[0, -2.25, 0]} program="range" />
        {/* the range's own radio, patched into the laptop */}
        {detail === 'high' && (
          <group position={[-0.44, 0.985, -0.10]} rotation={[0, 0.5, 0]}>
            <mesh castShadow material={materials.abs}>
              <boxGeometry args={[0.14, 0.036, 0.10]} />
            </mesh>
            <mesh position={[0.05, 0.10, -0.03]} material={materials.darkPlastic}>
              <cylinderGeometry args={[0.004, 0.005, 0.17, 8]} />
            </mesh>
          </group>
        )}
      </group>

      {/* the transit case the system ships in, stood on the floor */}
      {detail === 'high' && (
        <group position={[FIRING_X - 1.1, 0, 1.55]} rotation={[0, -0.4, 0]}>
          <mesh position={[0, 0.17, 0]} castShadow receiveShadow material={materials.caseShell}>
            <boxGeometry args={[0.62, 0.34, 0.44]} />
          </mesh>
          <mesh position={[0, 0.345, 0]} material={materials.caseShell}>
            <boxGeometry args={[0.64, 0.02, 0.46]} />
          </mesh>
        </group>
      )}

      {/* the mat the operator stands on */}
      <mesh
        position={[FIRING_X - 0.75, 0.006, 0.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={concrete}
      >
        <planeGeometry args={[1.4, 1.1]} />
      </mesh>
    </group>
  );
}

/* --- the backstop --------------------------------------------------------- */

/** Angled steel over a granulate berm. It exists to close the end of the lane
 *  and to give the far shots something with depth in them; it is not the
 *  subject, so it is four boxes and a rake. */
function Backstop({ detail, plate }: { detail: 'high' | 'low'; plate: THREE.Material }) {
  const berm = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0c0e11', roughness: 0.99, metalness: 0 }),
    [],
  );
  useEffect(() => () => berm.dispose(), [berm]);

  return (
    <group position={[BACKSTOP_X, 0, 0]}>
      {/* the raked plate */}
      <mesh position={[0, 1.05, 0]} rotation={[0, 0, -0.42]} castShadow receiveShadow material={plate}>
        <boxGeometry args={[0.08, 2.5, HALF_W * 1.9]} />
      </mesh>
      {/* the granulate trap under it */}
      <mesh position={[-0.42, 0.22, 0]} receiveShadow material={berm}>
        <boxGeometry args={[1.0, 0.44, HALF_W * 1.9]} />
      </mesh>
      {detail === 'high' &&
        ([-1, 0, 1] as const).map((s) => (
          <mesh key={s} position={[0.16, 1.0, s * 1.15]} material={plate}>
            <boxGeometry args={[0.1, 2.3, 0.09]} />
          </mesh>
        ))}
    </group>
  );
}
