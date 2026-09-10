/* ============================================================================
   Wheelchair — brain-controlled powered wheelchair
   ----------------------------------------------------------------------------
   This chapter has no bench-scale object: the thing built was a powered chair
   driven from EEG. So the camera turns away from the bench and out into the
   room, and the demonstration is the chair itself doing what it does.

   The sequence is the project's own signal chain, made visible:

     electrodes fire in a travelling pattern on the headset
       → a command packet crosses the air to the chair's controller
         → the controller latches, the drive wheels turn, the chair moves

   The headset sits on its own stand rather than on a mannequin. A headless
   figure in a wheelchair is a genuinely unpleasant image, and the equipment
   on a lab stand says the same thing about the work without it.
   ========================================================================== */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Led, Wire } from '../parts/primitives';
import { useDeviceMaterials } from '../materials';
import { useAssembly, type PartSpec } from '../assembly';
import { sceneState } from '../../sceneState';
import { POWER_GATE, POWER_RATE } from './power';

/* --- dimensions, metres -------------------------------------------------- */

const WHEEL_R = 0.30;
const WHEEL_W = 0.052;
const TRACK = 0.29; // half-distance between the drive wheels
const CASTOR_R = 0.085;
const SEAT_Y = 0.50;
const SEAT_W = 0.46;
const SEAT_D = 0.44;

/** How far the chair drives before turning back, metres. */
const RUN = 0.62;

/* --- parts, in bind order ------------------------------------------------ */

const PARTS: PartSpec[] = [
  /* 0  headset+stand */ { pos: [0, 0, 0], out: [-0.55, 0.18, 0.20], delay: 0 },
  /* 1  backrest      */ { pos: [0, 0, 0], out: [0, 0.40, -0.34], delay: 0.14 },
  /* 2  seat          */ { pos: [0, 0, 0], out: [0, 0.46, 0.02], delay: 0.24 },
  /* 3  controller    */ { pos: [0, 0, 0], out: [0.52, 0.16, 0.16], delay: 0.32 },
  /* 4  left wheel    */ { pos: [0, 0, 0], out: [-0.60, 0.04, 0], delay: 0.42 },
  /* 5  right wheel   */ { pos: [0, 0, 0], out: [0.60, 0.04, 0], delay: 0.48 },
  /* 6  castors       */ { pos: [0, 0, 0], out: [0, -0.02, 0.52], delay: 0.56 },
  /* 7  battery       */ { pos: [0, 0, 0], out: [0, -0.34, -0.12], delay: 0.64 },
  /* 8  footplate     */ { pos: [0, 0, 0], out: [0, -0.16, 0.46], delay: 0.72 },
  /* 9  frame         */ { pos: [0, 0, 0], out: [0, -0.06, 0], delay: 0.86 },
];

/** Where the command packets fly: headset, up over the armrest, controller. */
const SIGNAL_PATH: [number, number, number][] = [
  [-0.62, 0.86, 0.30],
  [-0.34, 1.02, 0.30],
  [0.02, 1.06, 0.26],
  [0.26, 0.86, 0.22],
  [0.30, 0.74, 0.15],
];

export function Wheelchair({
  activeRef,
  detail = 'high',
}: {
  activeRef: React.MutableRefObject<number>;
  detail?: 'high' | 'low';
}) {
  const mats = useDeviceMaterials();
  const { bind, live } = useAssembly(PARTS, activeRef);

  const power = useRef(0);
  const drive = useRef<THREE.Group>(null);
  const leftHub = useRef<THREE.Group>(null);
  const rightHub = useRef<THREE.Group>(null);
  const castorL = useRef<THREE.Group>(null);
  const castorR = useRef<THREE.Group>(null);
  const packets = useRef<THREE.Group>(null);
  const travelled = useRef(0);

  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(SIGNAL_PATH.map((p) => new THREE.Vector3(...p))),
    [],
  );
  const scratch = useMemo(() => new THREE.Vector3(), []);

  const tyre = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0c0d0f', roughness: 0.92, metalness: 0.02 }),
    [],
  );
  const fabric = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#14171c', roughness: 0.96, metalness: 0 }),
    [],
  );

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    const want = sceneState.inspect ? 1 : live.current > POWER_GATE ? sceneState.power : 0;
    power.current = THREE.MathUtils.damp(power.current, want, POWER_RATE, d);
    const p = power.current;

    /* Drive. The chair runs forward, holds, and returns — a demonstration run,
       not a loop of continuous motion, because a chair that never stops reads
       as a turntable rather than as something being commanded. On the case
       study it stands still so the exploded view is legible. */
    const t = state.clock.elapsedTime;
    const cycle = 9;
    const phase = (t % cycle) / cycle;
    let target = 0;
    if (phase < 0.32) target = smoothstep(phase / 0.32) * RUN;
    else if (phase < 0.55) target = RUN;
    else if (phase < 0.87) target = (1 - smoothstep((phase - 0.55) / 0.32)) * RUN;

    const wanted = sceneState.inspect ? 0 : target * p;
    const previous = travelled.current;
    travelled.current = THREE.MathUtils.damp(travelled.current, wanted, 6, d);
    const moved = travelled.current - previous;

    if (drive.current) drive.current.position.z = travelled.current;

    // wheels turn at the rate the chair is actually moving — no floating
    const spin = moved / WHEEL_R;
    if (leftHub.current) leftHub.current.rotation.x += spin;
    if (rightHub.current) rightHub.current.rotation.x += spin;
    // castors trail: they swing to follow the direction of travel
    const swing = THREE.MathUtils.clamp(moved / Math.max(d, 1 / 240), -0.5, 0.5);
    for (const c of [castorL.current, castorR.current]) {
      if (c) c.rotation.y = THREE.MathUtils.damp(c.rotation.y, swing, 4, d);
    }

    // command packets crossing from the headset to the controller
    if (packets.current) {
      for (let i = 0; i < packets.current.children.length; i++) {
        const dot = packets.current.children[i] as THREE.Mesh;
        const u = ((t * 0.55 + i / packets.current.children.length) % 1);
        curve.getPoint(u, scratch);
        dot.position.copy(scratch);
        const mat = dot.material as THREE.MeshBasicMaterial;
        // fade in and out at the ends so packets do not pop
        // squared so a packet is only bright in the middle of its crossing;
        // at full length they read as loose dots rather than as a signal
        const along = Math.sin(u * Math.PI);
        mat.opacity = along * along * 0.85 * p;
        dot.scale.setScalar(0.6 + Math.sin(u * Math.PI) * 0.7);
      }
    }
  });

  const packetCount = detail === 'high' ? 4 : 2;

  return (
    <group>
      {/* ---- 0: EEG headset on its stand ---------------------------------- */}
      <group ref={bind(0)}>
        <group position={[-0.62, 0, 0.30]}>
          {/* stand */}
          <mesh position={[0, 0.008, 0]} castShadow material={mats.darkPlastic}>
            <cylinderGeometry args={[0.11, 0.13, 0.016, 20]} />
          </mesh>
          <mesh position={[0, 0.42, 0]} material={mats.metal}>
            <cylinderGeometry args={[0.012, 0.012, 0.82, 12]} />
          </mesh>
          {/* the headband itself */}
          <group position={[0, 0.86, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow material={mats.darkPlastic}>
              <torusGeometry args={[0.098, 0.010, 8, 28]} />
            </mesh>
            {/* the arch that crosses the crown */}
            <mesh rotation={[0, 0, 0]} material={mats.darkPlastic}>
              <torusGeometry args={[0.098, 0.008, 8, 24, Math.PI]} />
            </mesh>
            {/* electrode pods, firing in a travelling pattern */}
            {Array.from({ length: detail === 'high' ? 8 : 5 }).map((_, i, arr) => {
              const a = (i / arr.length) * Math.PI * 2;
              const x = Math.cos(a) * 0.098;
              const z = Math.sin(a) * 0.098;
              return (
                <group key={i} position={[x, 0, z]}>
                  <mesh material={mats.shield}>
                    <cylinderGeometry args={[0.011, 0.013, 0.012, 12]} />
                  </mesh>
                  <Led
                    color="#4fd6c0"
                    radius={0.0035}
                    position={[0, 0.010, 0]}
                    pattern="breathe"
                    phase={i * 0.42}
                    powerRef={power}
                  />
                </group>
              );
            })}
          </group>
        </group>
      </group>

      {/* ---- the chair: everything below moves when it drives ------------- */}
      <group ref={drive}>
        {/* ---- 1: backrest ------------------------------------------------ */}
        <group ref={bind(1)}>
          <group position={[0, SEAT_Y + 0.24, -SEAT_D / 2 + 0.02]} rotation={[0.17, 0, 0]}>
            <mesh castShadow material={fabric}>
              <boxGeometry args={[SEAT_W, 0.50, 0.055]} />
            </mesh>
            {/* frame uprights either side of the backrest */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[(s * SEAT_W) / 2, 0.02, -0.04]} material={mats.metal}>
                <cylinderGeometry args={[0.014, 0.014, 0.56, 10]} />
              </mesh>
            ))}
            {/* push handles */}
            {[-1, 1].map((s) => (
              <mesh
                key={`h${s}`}
                position={[(s * SEAT_W) / 2, 0.31, -0.06]}
                rotation={[0.5, 0, 0]}
                material={mats.darkPlastic}
              >
                <cylinderGeometry args={[0.017, 0.017, 0.11, 10]} />
              </mesh>
            ))}
          </group>
        </group>

        {/* ---- 2: seat ---------------------------------------------------- */}
        <group ref={bind(2)}>
          <mesh position={[0, SEAT_Y, 0]} castShadow receiveShadow material={fabric}>
            <boxGeometry args={[SEAT_W, 0.075, SEAT_D]} />
          </mesh>
          {/* armrest pads */}
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh
                position={[(s * (SEAT_W + 0.06)) / 2, SEAT_Y + 0.20, -0.02]}
                castShadow
                material={mats.darkPlastic}
              >
                <boxGeometry args={[0.055, 0.028, 0.30]} />
              </mesh>
              <mesh
                position={[(s * (SEAT_W + 0.06)) / 2, SEAT_Y + 0.10, -0.13]}
                material={mats.metal}
              >
                <cylinderGeometry args={[0.012, 0.012, 0.19, 10]} />
              </mesh>
            </group>
          ))}
        </group>

        {/* ---- 3: controller and joystick --------------------------------- */}
        <group ref={bind(3)}>
          <group position={[0.30, SEAT_Y + 0.235, 0.09]}>
            <mesh castShadow material={mats.abs}>
              <boxGeometry args={[0.085, 0.045, 0.13]} />
            </mesh>
            {/* joystick */}
            <mesh position={[0, 0.042, 0.02]} material={mats.metal}>
              <cylinderGeometry args={[0.006, 0.006, 0.045, 10]} />
            </mesh>
            <mesh position={[0, 0.068, 0.02]} castShadow material={mats.darkPlastic}>
              <sphereGeometry args={[0.019, 14, 10]} />
            </mesh>
            {/* mode and battery indicators */}
            <Led color="#4fd6c0" radius={0.004} position={[-0.024, 0.024, -0.042]} pattern="heartbeat" powerRef={power} />
            <Led color="#f6a250" radius={0.004} position={[-0.008, 0.024, -0.042]} pattern="solid" powerRef={power} glow={false} />
            <Led color="#63d98a" radius={0.004} position={[0.008, 0.024, -0.042]} pattern="solid" powerRef={power} glow={false} />
            {/* harness down to the battery */}
            <Wire
              points={[
                [0, -0.022, -0.05],
                [-0.06, -0.12, -0.10],
                [-0.16, -0.25, -0.06],
              ]}
              radius={0.005}
              color="#0a0b0d"
              segments={16}
            />
          </group>
        </group>

        {/* ---- 4 / 5: drive wheels ---------------------------------------- */}
        {([-1, 1] as const).map((side, i) => (
          <group key={side} ref={bind(4 + i)}>
            <group
              position={[side * TRACK, WHEEL_R, -0.06]}
              ref={side === -1 ? leftHub : rightHub}
            >
              {/* tyre */}
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={tyre}>
                <cylinderGeometry args={[WHEEL_R, WHEEL_R, WHEEL_W, 28]} />
              </mesh>
              {/* rim */}
              <mesh rotation={[0, 0, Math.PI / 2]} material={mats.metal}>
                <cylinderGeometry args={[WHEEL_R * 0.72, WHEEL_R * 0.72, WHEEL_W * 1.05, 24]} />
              </mesh>
              {/* handrim, set outboard of the tyre as on a real chair */}
              <mesh
                position={[side * WHEEL_W * 0.9, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                material={mats.metal}
              >
                <torusGeometry args={[WHEEL_R * 0.86, 0.009, 6, 26]} />
              </mesh>
              {/* spokes */}
              {detail === 'high' &&
                Array.from({ length: 8 }).map((_, s) => (
                  <mesh
                    key={s}
                    rotation={[0, 0, (s / 8) * Math.PI]}
                    material={mats.steel}
                  >
                    <boxGeometry args={[WHEEL_R * 1.42, 0.006, 0.006]} />
                  </mesh>
                ))}
              {/* hub motor */}
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={mats.motorCan}>
                <cylinderGeometry args={[0.062, 0.062, WHEEL_W * 1.8, 18]} />
              </mesh>
            </group>
          </group>
        ))}

        {/* ---- 6: front castors ------------------------------------------- */}
        <group ref={bind(6)}>
          {([-1, 1] as const).map((side) => (
            <group
              key={side}
              position={[side * 0.21, CASTOR_R + 0.02, 0.38]}
              ref={side === -1 ? castorL : castorR}
            >
              {/* fork */}
              <mesh position={[0, 0.055, 0]} material={mats.metal}>
                <boxGeometry args={[0.05, 0.10, 0.014]} />
              </mesh>
              <mesh position={[0, 0.115, 0]} material={mats.metal}>
                <cylinderGeometry args={[0.011, 0.011, 0.06, 10]} />
              </mesh>
              {/* the wheel, trailing behind the pivot */}
              <mesh
                position={[0, 0, -0.022]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
                material={tyre}
              >
                <cylinderGeometry args={[CASTOR_R, CASTOR_R, 0.032, 18]} />
              </mesh>
            </group>
          ))}
        </group>

        {/* ---- 7: battery pack under the seat ----------------------------- */}
        <group ref={bind(7)}>
          <group position={[0, 0.245, -0.04]}>
            <mesh castShadow material={mats.battery}>
              <boxGeometry args={[0.34, 0.15, 0.22]} />
            </mesh>
            <mesh position={[0, 0.078, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.12, 0.07]} />
              <meshStandardMaterial color="#c8ccd0" roughness={0.85} />
            </mesh>
            {/* retaining straps */}
            {[-0.1, 0.1].map((x) => (
              <mesh key={x} position={[x, 0.002, 0]}>
                <boxGeometry args={[0.028, 0.158, 0.226]} />
                <meshStandardMaterial color="#0a0a0c" roughness={0.96} />
              </mesh>
            ))}
          </group>
        </group>

        {/* ---- 8: footplate ----------------------------------------------- */}
        <group ref={bind(8)}>
          <group position={[0, 0.13, 0.44]}>
            <mesh rotation={[0.12, 0, 0]} castShadow material={mats.metal}>
              <boxGeometry args={[0.34, 0.012, 0.16]} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.13, 0.12, -0.03]} rotation={[0.3, 0, 0]} material={mats.metal}>
                <cylinderGeometry args={[0.012, 0.012, 0.26, 10]} />
              </mesh>
            ))}
          </group>
        </group>

        {/* ---- 9: frame --------------------------------------------------- */}
        <group ref={bind(9)}>
          {/* seat rails */}
          {([-1, 1] as const).map((s) => (
            <mesh
              key={s}
              position={[(s * SEAT_W) / 2, SEAT_Y - 0.05, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              material={mats.metal}
            >
              <cylinderGeometry args={[0.016, 0.016, SEAT_D + 0.06, 10]} />
            </mesh>
          ))}
          {/* cross member */}
          <mesh position={[0, SEAT_Y - 0.05, -0.16]} rotation={[0, 0, Math.PI / 2]} material={mats.metal}>
            <cylinderGeometry args={[0.014, 0.014, SEAT_W, 10]} />
          </mesh>
          {/* wheel struts down to the axles */}
          {([-1, 1] as const).map((s) => (
            <mesh
              key={`d${s}`}
              position={[s * (TRACK - 0.02), (SEAT_Y - 0.05 + WHEEL_R) / 2 + 0.06, -0.11]}
              rotation={[0.2, 0, s * 0.14]}
              material={mats.metal}
            >
              <cylinderGeometry args={[0.015, 0.015, 0.30, 10]} />
            </mesh>
          ))}
          {/* front forks down to the castors */}
          {([-1, 1] as const).map((s) => (
            <mesh
              key={`f${s}`}
              position={[s * 0.21, 0.30, 0.30]}
              rotation={[-0.42, 0, 0]}
              material={mats.metal}
            >
              <cylinderGeometry args={[0.014, 0.014, 0.34, 10]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ---- command packets, headset → controller ------------------------ */}
      <group ref={packets}>
        {Array.from({ length: packetCount }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.011, 10, 8]} />
            <meshBasicMaterial
              color="#4fd6c0"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function smoothstep(x: number) {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}
