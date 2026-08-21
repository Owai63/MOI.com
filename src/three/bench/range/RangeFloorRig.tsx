/* ============================================================================
   RangeFloorRig — the shooting-range chapter, on the home page
   ----------------------------------------------------------------------------
   The first pass staged this chapter as a box on the cutting mat. That was
   wrong about the only thing that matters: the box is not a bench object that
   drives a little rail beside it — the box is what MOVES. It rides a track on
   the floor with a training target bolted to the same carriage, and it does
   that because a command reached it from the operator's console.

   So the chapter is staged out in the room instead: a demonstration section
   of track laid on the lab floor, the runner on it, and a visible link back
   to the laptop on the bench behind the camera's shoulder. The reader turns
   away from the bench, and a target runs.

   The movement cycle is the one the firmware sequences — run out, hold at the
   far end, return, wait — and every rotating part on the carriage is driven
   from the carriage's own velocity. See TargetRunner.
   ========================================================================== */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAssembly, type PartSpec } from '../assembly';
import { sceneState } from '../../sceneState';
import { POWER_GATE, POWER_RATE } from '../devices/power';
import { ROOM, laptopScreenPose } from '../layout';
import { Rail } from './Rail';
import { TargetRunner } from './TargetRunner';
import { CommandLink } from './CommandLink';
import { LAB_RAIL_LEN, travelSpan } from './spec';

/** Yaw of the laid track within the room, radians. Set here rather than in
 *  the registry because the rig has to undo it to work out where the console
 *  on the bench is in its own space. A few degrees off square is what stops
 *  the track reading as a diagram. */
export const LAB_LANE_YAW = -0.26;

/** Where the track is laid, relative to the room's own mark. Must match the
 *  `stage.position` the registry places this rig at, or the link and the lamp
 *  end up attached to where the track used to be. */
const LANE_OFFSET: [number, number, number] = [1.35, 0, 0.15];

const TRAVEL = travelSpan(LAB_RAIL_LEN);

/** The whole demonstration cycle, seconds: out, hold, back, wait. */
const CYCLE = 11;

/* The track and the floor dressing arrive as their own parts so the chapter
   assembles rather than appearing. Neither takes any of the exploded view —
   there is no exploded view on the home page, and on the case study the rail
   is scenery. */
const PARTS: PartSpec[] = [
  /* 0 rail    */ { pos: [0, 0, 0], out: [0, -0.5, 0.4], delay: 0.1, explode: 0 },
  /* 1 markers */ { pos: [0, 0, 0], out: [0, -0.2, 0.8], delay: 0.5, explode: 0 },
];

export function RangeFloorRig({
  activeRef,
  detail = 'high',
}: {
  activeRef: React.MutableRefObject<number>;
  detail?: 'high' | 'low';
}) {
  const { bind, live } = useAssembly(PARTS, activeRef);
  const power = useRef(0);
  const at = useRef(0);
  const lamp = useRef<THREE.PointLight>(null);

  /* Where the laptop on the bench is, expressed in the track's own space.
     Taken off the panel's real transform and un-rotated by the track's yaw,
     so moving either the bench or the track keeps the link attached to both
     ends instead of pointing at where the laptop used to be. */
  const toLane = useMemo(
    () => (p: THREE.Vector3): [number, number, number] => {
      p.sub(new THREE.Vector3(ROOM.stage[0] + LANE_OFFSET[0], ROOM.stage[1], ROOM.stage[2] + LANE_OFFSET[2]));
      p.applyAxisAngle(new THREE.Vector3(0, 1, 0), -LAB_LANE_YAW);
      return [p.x, p.y, p.z];
    },
    [],
  );

  /** the room's ceiling batten, in the track's own space. */
  const battenLocal = useMemo(
    () => toLane(new THREE.Vector3(ROOM.light[0], ROOM.light[1], ROOM.light[2])),
    [toLane],
  );

  const consoleEnd = useMemo<[number, number, number]>(() => {
    return toLane(laptopScreenPose().center.clone());
  }, [toLane]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 1 / 30);
    const want = live.current > POWER_GATE ? sceneState.power : 0;
    power.current = THREE.MathUtils.damp(power.current, want, POWER_RATE, d);

    /* Run out, hold, return, wait. Damped toward the cycle rather than set
       from it, so the carriage still eases off the stops when the chapter
       arrives part-way through a cycle. */
    const phase = (state.clock.elapsedTime % CYCLE) / CYCLE;
    let u = 0;
    if (phase < 0.30) u = ease(phase / 0.30);
    else if (phase < 0.46) u = 1;
    else if (phase < 0.76) u = 1 - ease((phase - 0.46) / 0.30);
    const wanted = u * power.current;
    at.current = sceneState.snap
      ? wanted
      : THREE.MathUtils.damp(at.current, wanted, 5.5, d);

    /* The lane's own light. The room's overhead pool is aimed at a spot; a
       three-metre track needs light along its whole length, and the rails and
       the rack are bare metal — under the room key alone they read as black
       stripes on a dark floor. */
    if (lamp.current) {
      lamp.current.intensity = THREE.MathUtils.damp(
        lamp.current.intensity,
        power.current * 34,
        2,
        d,
      );
    }
  });

  return (
    <group rotation={[0, LAB_LANE_YAW, 0]}>
      {/* --- the laid track ------------------------------------------------ */}
      <group ref={bind(0)}>
        <Rail length={LAB_RAIL_LEN} detail={detail} />
      </group>

      {/* --- floor dressing: the firing mark and the distance bands -------- */}
      <group ref={bind(1)}>
        <FloorMarks detail={detail} />
      </group>

      {/* --- a second source hung off the room's own batten ------------------
          The room's spot is a soft pool aimed at a point, and the rails and
          the rack are bare metal: under that alone they read as black stripes
          on a dark floor. This adds the hard component from the SAME fixture
          the reader can see, rather than lighting the track from nowhere. */}
      <pointLight
        ref={lamp}
        position={battenLocal}
        intensity={0}
        distance={9}
        decay={2}
        color="#dceeff"
      />

      {/* --- the runner ---------------------------------------------------- */}
      <TargetRunner
        activeRef={activeRef}
        powerRef={power}
        atRef={at}
        travel={TRAVEL}
        detail={detail}
      />

      {/* --- the commands that move it ------------------------------------- */}
      <CommandLink
        from={consoleEnd}
        atRef={at}
        travel={TRAVEL}
        powerRef={power}
        detail={detail}
        lift={0.16}
      />
    </group>
  );
}

/* --- floor dressing ------------------------------------------------------ */

/** Paint on the floor: the firing mark at the near end of the section and
 *  three distance bands out from it. Enough that the length of track means
 *  something; not so much that the room turns into a diagram. */
function FloorMarks({ detail }: { detail: 'high' | 'low' }) {
  const half = LAB_RAIL_LEN / 2;
  const paint = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#7a6520', roughness: 0.94, metalness: 0 }),
    [],
  );
  const mark = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#b8863a', roughness: 0.92, metalness: 0 }),
    [],
  );
  useEffect(
    () => () => {
      paint.dispose();
      mark.dispose();
    },
    [paint, mark],
  );

  return (
    <group position={[0, 0.003, 0]}>
      {/* the firing mark, across the near end */}
      <mesh position={[-half - 0.16, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mark}>
        <planeGeometry args={[0.05, 1.5]} />
      </mesh>
      {detail === 'high' &&
        [0.25, 0.5, 0.75].map((f) => (
          <mesh
            key={f}
            position={[-half + f * LAB_RAIL_LEN, 0, 0.62]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={paint}
          >
            <planeGeometry args={[0.035, 0.34]} />
          </mesh>
        ))}
    </group>
  );
}

/** smootherstep — the carrier accelerates off the stop and settles at the far
 *  end rather than snapping between them. */
function ease(x: number) {
  const c = Math.max(0, Math.min(1, x));
  return c * c * c * (c * (c * 6 - 15) + 10);
}
