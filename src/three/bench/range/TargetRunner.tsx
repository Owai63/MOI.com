/* ============================================================================
   TargetRunner — the carriage, the drive under it, and the target on it
   ----------------------------------------------------------------------------
   The thing the project actually moves. A bogie on four flanged wheels, a
   deck plate over it, the training mannequin standing at the downrange end of
   the deck facing the firing point, and the sealed controller case bolted
   down behind it — which is where a controller has to be on a range that gets
   used.

   The drive is deliberately out in the open on the bogie: a transverse
   gearmotor whose pinion engages the rack between the rails. Everything that
   turns is driven from the carriage's own measured velocity — the wheels, the
   pinion, the encoder — so the machine can never be caught freewheeling while
   it stands still, or gliding with its wheels locked. That single rule is
   most of what separates "a model of a machine" from "a moving prop".

   Position is not owned here. The parent decides where the runner should be
   (a demonstration cycle on the home page, the reader's scroll on the case
   study) and writes it into `atRef` as 0..1 along the rail; this component
   reads it, and everything else follows from how fast that number changed.
   ========================================================================== */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Led, Wire } from '../parts/primitives';
import { deviceMaterials, WIRE_COLORS } from '../materials';
import { useAssembly, type PartSpec } from '../assembly';
import { ControllerCase } from './ControllerCase';
import { Mannequin } from './Mannequin';
import { RACK_PITCH } from './Rail';
import { CAR, RAIL, MAN } from './spec';

/* --- geometry ------------------------------------------------------------ */

const AXLE_Y = RAIL.top + CAR.wheelR;
const PINION_R = 0.042;
/** the pinion's pitch line sits on the rack's, one tooth height down. */
const PINION_Y = RAIL.top - 0.007 + PINION_R;
const DECK_Y = CAR.deckY;

/** The case is turned a quarter-turn: its hinge ends up on the downrange
 *  edge, so the lid opens away from the target rather than into its back, and
 *  its grille, status window and antenna all face the firing point. */
const CASE_YAW = -Math.PI / 2;
/** The mannequin faces the firing point, back down the rail. */
const TARGET_YAW = Math.PI / 2;

/** Where the whip antenna's tip is, in the runner's own frame. The command
 *  link is drawn to this point, so it lives here rather than being guessed by
 *  whoever draws it. */
export const ANTENNA_TIP: [number, number, number] = [CAR.caseX - 0.22, DECK_Y + 0.215, 0.08];

/* --- parts, in bind order ------------------------------------------------ */

/* The case's own internals separate under their own table (see
   ControllerCase); the case as a whole therefore has `explode: 0` — it stays
   bolted to the deck while it opens up. The carriage below it does come
   apart, downward and outward, which is the only direction that leaves the
   deck readable from a camera sitting at rail height. */
const PARTS: PartSpec[] = [
  /* 0  mannequin */ { pos: [0, 0, 0], out: [-0.44, 0.40, 0.06], delay: 0, explode: 0.4 },
  /* 1  case      */ { pos: [0, 0, 0], out: [0.30, 0.34, 0.06], delay: 0.18, explode: 0 },
  /* 2  deck      */ { pos: [0, 0, 0], out: [0, 0.16, -0.40], delay: 0.34, explode: 0.7 },
  /* 3  bogie     */ { pos: [0, 0, 0], out: [0, -0.10, 0], delay: 0.5, explode: 0.3 },
  /* 4  wheels    */ { pos: [0, 0, 0], out: [0, -0.05, 0.40], delay: 0.6, explode: 1 },
  /* 5  gearmotor */ { pos: [0, 0, 0], out: [-0.12, -0.10, 0.34], delay: 0.72, explode: 1 },
  /* 6  pinion    */ { pos: [0, 0, 0], out: [0.16, -0.16, -0.26], delay: 0.8, explode: 1 },
  /* 7  guard     */ { pos: [0, 0, 0], out: [-0.10, 0.14, -0.28], delay: 0.86, explode: 0.8 },
];

export function TargetRunner({
  activeRef,
  powerRef,
  atRef,
  travel,
  detail = 'high',
}: {
  activeRef: React.MutableRefObject<number>;
  powerRef: React.MutableRefObject<number>;
  /** 0..1 along the rail, owned and damped by the parent. */
  atRef: React.MutableRefObject<number>;
  /** clear travel in metres — how far 0..1 actually is. */
  travel: number;
  detail?: 'high' | 'low';
}) {
  const mats = useMemo(() => deviceMaterials(), []);
  const { bind } = useAssembly(PARTS, activeRef);

  const body = useRef<THREE.Group>(null);
  const wheels = useRef<(THREE.Group | null)[]>([]);
  const pinion = useRef<THREE.Group>(null);
  const encoder = useRef<THREE.Group>(null);
  const previous = useRef(0);
  const speed = useRef(0);

  const tyre = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#101216', roughness: 0.72, metalness: 0.35 }),
    [],
  );
  useEffect(() => () => tyre.dispose(), [tyre]);

  useFrame((_, delta) => {
    const d = Math.max(1 / 240, Math.min(delta, 1 / 30));
    const at = atRef.current;

    if (body.current) body.current.position.x = (at - 0.5) * travel;

    /* Metres per second, low-passed. The raw frame difference is noisy enough
       on a scrubbed scroll to make the wheels jitter, and a wheel that
       stutters is more obviously wrong than one that lags a little. */
    const raw = ((at - previous.current) * travel) / d;
    previous.current = at;
    speed.current = THREE.MathUtils.damp(speed.current, raw, 12, d);

    /* Rotation about each part's OWN axis. All of these are cylinders lying
       across the track, so they are tilted with rotation.x and spun with
       rotation.y — Euler XYZ applies y first, which is the only order that
       leaves the spin on the cylinder's axis instead of tumbling it. */
    const v = speed.current;
    const wheelSpin = (v / CAR.wheelR) * d;
    for (const w of wheels.current) if (w) w.rotation.y -= wheelSpin;
    if (pinion.current) pinion.current.rotation.y -= (v / PINION_R) * d;
    if (encoder.current) encoder.current.rotation.y -= (v / CAR.wheelR) * d * 3;
  });

  const collect = (i: number) => (el: THREE.Group | null) => {
    wheels.current[i] = el;
  };

  return (
    <group ref={body}>
      {/* ---- 0: the target ------------------------------------------------ */}
      <group ref={bind(0)}>
        <group position={[CAR.targetX, DECK_Y, 0]}>
          <Mannequin height={MAN.height} yaw={TARGET_YAW} detail={detail} />
        </group>
      </group>

      {/* ---- 1: the controller case --------------------------------------- */}
      <group ref={bind(1)}>
        <group position={[CAR.caseX, DECK_Y, 0]} rotation={[0, CASE_YAW, 0]}>
          <ControllerCase activeRef={activeRef} powerRef={powerRef} detail={detail} />
        </group>
      </group>

      {/* ---- 2: deck plate ------------------------------------------------ */}
      <group ref={bind(2)}>
        <mesh position={[0, DECK_Y - CAR.deck[1] / 2, 0]} castShadow receiveShadow material={mats.metal}>
          <boxGeometry args={CAR.deck} />
        </mesh>
        {/* tread pattern: a darker inlay rather than a texture, because at
            rail height this is only ever seen edge-on */}
        <mesh position={[0, DECK_Y + 0.0006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CAR.deck[0] * 0.94, CAR.deck[2] * 0.94]} />
          <meshStandardMaterial color="#3a4046" roughness={0.88} metalness={0.4} />
        </mesh>
        {/* edge lips along both sides of the track */}
        {([-1, 1] as const).map((s) => (
          <mesh
            key={s}
            position={[0, DECK_Y + 0.008, (s * CAR.deck[2]) / 2]}
            material={mats.metal}
          >
            <boxGeometry args={[CAR.deck[0], 0.028, 0.010]} />
          </mesh>
        ))}
        {/* hazard stripe on the downrange end, under the target */}
        <mesh
          position={[-CAR.deck[0] / 2 + 0.004, DECK_Y + 0.0012, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.05, CAR.deck[2] * 0.9]} />
          <meshStandardMaterial color="#8a7326" roughness={0.9} />
        </mesh>
      </group>

      {/* ---- 3: bogie frame ----------------------------------------------- */}
      <group ref={bind(3)}>
        {([-1, 1] as const).map((s) => (
          <mesh
            key={s}
            position={[0, AXLE_Y + 0.024, (s * (RAIL.gauge + 0.09)) / 2]}
            castShadow
            material={mats.metal}
          >
            <boxGeometry args={[CAR.wheelbase * 2 + 0.10, 0.040, 0.014]} />
          </mesh>
        ))}
        {/* cross members over each axle */}
        {([-1, 1] as const).map((s) => (
          <mesh
            key={s}
            position={[s * CAR.wheelbase, AXLE_Y + 0.024, 0]}
            castShadow
            material={mats.metal}
          >
            <boxGeometry args={[0.030, 0.036, RAIL.gauge + 0.10]} />
          </mesh>
        ))}
        {/* the four posts the deck stands on */}
        {([-1, 1] as const).map((sx) =>
          ([-1, 1] as const).map((sz) => (
            <mesh
              key={`${sx}:${sz}`}
              position={[
                sx * CAR.wheelbase,
                (AXLE_Y + 0.044 + DECK_Y) / 2,
                (sz * (RAIL.gauge + 0.09)) / 2,
              ]}
              material={mats.metal}
            >
              <boxGeometry args={[0.024, DECK_Y - AXLE_Y - 0.044, 0.024]} />
            </mesh>
          )),
        )}
      </group>

      {/* ---- 4: wheels and axles ------------------------------------------ */}
      <group ref={bind(4)}>
        {([-1, 1] as const).map((sx) => (
          <mesh
            key={sx}
            position={[sx * CAR.wheelbase, AXLE_Y, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={mats.steel}
          >
            <cylinderGeometry args={[0.010, 0.010, RAIL.gauge + 0.08, 12]} />
          </mesh>
        ))}
        {([-1, 1] as const).map((sx, i) =>
          ([-1, 1] as const).map((sz, j) => (
            <group
              key={`${sx}:${sz}`}
              ref={collect(i * 2 + j)}
              position={[sx * CAR.wheelbase, AXLE_Y, (sz * RAIL.gauge) / 2]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <mesh castShadow material={tyre}>
                <cylinderGeometry args={[CAR.wheelR, CAR.wheelR, CAR.wheelW, 18]} />
              </mesh>
              {/* the flange that keeps it on the rail — inboard, as on a real
                  bogie, so it cannot climb the head */}
              <mesh position={[0, sz * (CAR.wheelW / 2 + 0.003), 0]} material={mats.steel}>
                <cylinderGeometry args={[CAR.wheelR + 0.010, CAR.wheelR + 0.010, 0.006, 18]} />
              </mesh>
              {/* a spoke, so rotation is legible at any distance */}
              <mesh position={[0, CAR.wheelW / 2 + 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[CAR.wheelR * 1.7, 0.008]} />
                <meshStandardMaterial color="#6d757d" roughness={0.5} metalness={0.7} />
              </mesh>
            </group>
          )),
        )}
      </group>

      {/* ---- 5: the gearmotor --------------------------------------------- */}
      <group ref={bind(5)}>
        {/* Laid across the track so its output turns about z and the pinion
            can roll along the rack. Local +y is world +z after the tilt. */}
        <group position={[-0.02, PINION_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          {/* brushed can */}
          <mesh position={[0, 0.145, 0]} castShadow material={mats.motorCan}>
            <cylinderGeometry args={[0.029, 0.029, 0.098, 20]} />
          </mesh>
          <mesh position={[0, 0.133, 0]}>
            <cylinderGeometry args={[0.0293, 0.0293, 0.030, 20, 1, true]} />
            <meshStandardMaterial color="#e6e8ea" roughness={0.72} side={THREE.DoubleSide} />
          </mesh>
          {/* planetary gearbox, zinc-passivated */}
          <mesh position={[0, 0.062, 0]} castShadow>
            <cylinderGeometry args={[0.031, 0.031, 0.050, 20]} />
            <meshStandardMaterial color="#b39a4e" roughness={0.38} metalness={0.9} />
          </mesh>
          {/* machined output flange and the stub shaft to the pinion */}
          <mesh position={[0, 0.032, 0]} castShadow material={mats.metal}>
            <cylinderGeometry args={[0.034, 0.034, 0.012, 20]} />
          </mesh>
          <mesh position={[0, 0.014, 0]} material={mats.steel}>
            <cylinderGeometry args={[0.009, 0.009, 0.030, 12]} />
          </mesh>
        </group>
        {/* the plate that hangs it off the bogie's cross member */}
        <mesh position={[-0.02, PINION_Y + 0.040, 0.12]} castShadow material={mats.metal}>
          <boxGeometry args={[0.086, 0.008, 0.15]} />
        </mesh>
        {/* motor leads, up to the gland in the case floor */}
        <Wire
          points={[
            [-0.02, PINION_Y + 0.02, 0.20],
            [0.06, PINION_Y + 0.10, 0.19],
            [0.13, DECK_Y - 0.01, 0.14],
          ]}
          radius={0.0032}
          color={WIRE_COLORS.red}
          segments={16}
        />
      </group>

      {/* ---- 6: the drive pinion and the encoder --------------------------- */}
      <group ref={bind(6)}>
        <group ref={pinion} position={[-0.02, PINION_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow material={mats.steel}>
            <cylinderGeometry args={[PINION_R * 0.86, PINION_R * 0.86, 0.028, 22]} />
          </mesh>
          {/* teeth, cut at the pitch the rack was laid at */}
          {Array.from({ length: Math.round((2 * Math.PI * PINION_R) / RACK_PITCH) }).map(
            (_, i, a) => {
              const th = (i / a.length) * Math.PI * 2;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(th) * PINION_R * 0.94, 0, Math.sin(th) * PINION_R * 0.94]}
                  rotation={[0, -th, 0]}
                  material={mats.steel}
                >
                  <boxGeometry args={[RACK_PITCH * 0.55, 0.026, RACK_PITCH * 0.5]} />
                </mesh>
              );
            },
          )}
        </group>
        {/* encoder can on the far end of the pinion shaft — position feedback,
            and the reason the firmware knows where the target is */}
        <group position={[-0.02, PINION_Y, -0.085]} rotation={[Math.PI / 2, 0, 0]}>
          <group ref={encoder}>
            <mesh material={mats.motorCan} castShadow>
              <cylinderGeometry args={[0.017, 0.017, 0.024, 14]} />
            </mesh>
            <mesh position={[0.010, 0.013, 0]}>
              <boxGeometry args={[0.006, 0.002, 0.006]} />
              <meshStandardMaterial color="#c9ced3" roughness={0.4} metalness={0.8} />
            </mesh>
          </group>
        </group>
        <Led
          color="#39ff88"
          radius={0.0022}
          position={[-0.02, PINION_Y + 0.03, -0.105]}
          pattern="fast"
          powerRef={powerRef}
        />
      </group>

      {/* ---- 7: the guard over the running gear ---------------------------- */}
      <group ref={bind(7)}>
        <mesh position={[-0.02, PINION_Y + 0.052, 0]} material={mats.darkPlastic} castShadow>
          <boxGeometry args={[0.13, 0.008, 0.10]} />
        </mesh>
        {([-1, 1] as const).map((s) => (
          <mesh key={s} position={[s * 0.062, PINION_Y + 0.014, 0]} material={mats.darkPlastic}>
            <boxGeometry args={[0.008, 0.070, 0.10]} />
          </mesh>
        ))}
        {/* the trailing safety flag: a strip that stands up off the deck so
            the runner is visible from the firing point even when the lights
            are down */}
        {detail === 'high' && (
          <mesh position={[CAR.deck[0] / 2 - 0.04, DECK_Y + 0.09, -0.2]} rotation={[0, 0.4, 0]}>
            <planeGeometry args={[0.05, 0.16]} />
            <meshStandardMaterial
              color="#e0761f"
              roughness={0.85}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}
