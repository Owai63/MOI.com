/* ============================================================================
   OtaLink — Device Management & OTA Platform, staged as the path a config takes
   ----------------------------------------------------------------------------
   The subject of this chapter is not a board. It is a REACH: a tracker is out
   in the field — anywhere on Earth — and an operator changes a setting on a
   web console, and that setting arrives on the unit. The platform is the whole
   line between those two facts, and every piece of it has to be in the frame
   or the chapter is showing you the wrong thing.

   So the bench holds the three ends of that line, left to right:

     the console   a web form with the unit selected and four fields set
     the server    the rack the request lands on and is queued from
     the world     a globe, with the unit standing on it a long way from here

   and then it runs a job down the line, on a loop:

     the operator pushes    →  console button lights
     console → server       →  a packet travels the short hop
     server works           →  activity across the rack
     server → the unit      →  a long arc over the globe
     the unit answers       →  radio rings, amber while it writes,
                               green when the configuration is applied
     the acknowledgement    →  travels the whole way back to the console

   The acknowledgement is the half that matters and the half a diagram usually
   leaves out. Anything can transmit; what makes this a management platform
   rather than a broadcast is that the console knows the unit took it.

   The globe is openly schematic — a graticule and coarse coastlines, no
   claimed deployment map — and the unit on it is unbadged. What is being
   shown is the architecture, not a customer list.
   ========================================================================== */

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Wire, Led, RadioRings, Screws } from '../parts/primitives';
import { useDeviceMaterials, ledMaterial } from '../materials';
import { worldTexture, otaConsoleTexture } from '../textures';
import { useAssembly, type PartSpec } from '../assembly';
import { sceneState } from '../../sceneState';
import { POWER_GATE, POWER_RATE } from './power';

/* --- the set, left to right (metres) -------------------------------------- */

const CONSOLE = {
  x: -0.122,
  w: 0.100,
  h: 0.066,
  /** leaned back off vertical, the way a desk display stands. */
  tilt: -0.36,
  /** height of the panel's centre above the mat. */
  y: 0.038,
};

const SERVER = { x: -0.02, w: 0.056, d: 0.05, unitH: 0.011, units: 3 };

const GLOBE = { x: 0.1, y: 0.094, r: 0.055 };

/** Where the unit stands. Well onto the FACE of the globe rather than near
 *  its limb: a pin on the silhouette edge reads as something stuck to the
 *  outside of the sphere, and the point being made is that the unit is
 *  somewhere ON the world, with the world curving away behind it. */
const SITE_DIR = new THREE.Vector3(0.2, 0.34, 0.92).normalize();
const SITE_BASE = SITE_DIR.clone().multiplyScalar(GLOBE.r).add(new THREE.Vector3(GLOBE.x, GLOBE.y, 0));
const SITE_TIP = SITE_DIR.clone().multiplyScalar(GLOBE.r + 0.016).add(new THREE.Vector3(GLOBE.x, GLOBE.y, 0));

/** The rest of the fleet: dim pins, so the one being configured is one OF
 *  something rather than the only device in the world. */
const OTHER_SITES: THREE.Vector3[] = [
  new THREE.Vector3(-0.55, 0.35, 0.76),
  new THREE.Vector3(0.1, -0.42, 0.9),
  new THREE.Vector3(0.72, 0.12, 0.68),
  new THREE.Vector3(-0.25, 0.78, 0.57),
].map((v) => v.normalize());

/* --- the two hops --------------------------------------------------------- */

const HOP_A = new THREE.CatmullRomCurve3([
  new THREE.Vector3(CONSOLE.x + 0.03, CONSOLE.y + 0.024, 0.02),
  new THREE.Vector3(CONSOLE.x + 0.056, CONSOLE.y + 0.062, 0.022),
  new THREE.Vector3(SERVER.x - 0.004, SERVER.units * SERVER.unitH + 0.008, 0.014),
]);

const HOP_B = new THREE.CatmullRomCurve3([
  new THREE.Vector3(SERVER.x + 0.006, SERVER.units * SERVER.unitH + 0.008, 0.008),
  new THREE.Vector3(SERVER.x + 0.042, 0.15, 0.03),
  new THREE.Vector3(GLOBE.x - 0.006, 0.185, 0.04),
  SITE_TIP.clone(),
]);

/* --- the job, as a timeline ----------------------------------------------- */

const T = {
  arm: 0.6, //  the operator commits
  a0: 1.3, //   packet leaves the console
  a1: 2.2, //   packet reaches the server
  srv: 2.25, // the rack takes it
  b0: 2.8, //   packet leaves the server
  b1: 4.5, //   packet reaches the unit
  write: 5.7, // the unit has written it
  ack0: 6.1, //  acknowledgement sets off back
  ack1: 7.8, //  reaches the server
  ack2: 8.7, //  reaches the console
  end: 11, //   idle, then round again
};

const span = (t: number, a: number, b: number) =>
  THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
const between = (t: number, a: number, b: number) => t >= a && t <= b;

const PENDING = new THREE.Color('#28323a');
const CYAN = new THREE.Color('#3fe0d0');
const AMBER = new THREE.Color('#f6a250');
const GREEN = new THREE.Color('#39ff88');

/* --- parts ---------------------------------------------------------------- */

const PARTS: PartSpec[] = [
  /* 0 link      */ { pos: [0, 0, 0], out: [0, 0.07, 0.02], delay: 0.05 },
  /* 1 globe     */ { pos: [0, 0, 0], out: [0.055, 0.05, 0], delay: 0.25 },
  /* 2 stand     */ { pos: [0, 0, 0], out: [0.03, -0.035, 0], delay: 0.5 },
  /* 3 server    */ { pos: [0, 0, 0], out: [0, 0.05, -0.035], delay: 0.65 },
  /* 4 console   */ { pos: [0, 0, 0], out: [-0.07, 0.04, 0.025], delay: 0.8 },
  /* 5 base rail */ { pos: [0, 0, 0], out: [0, -0.03, 0], delay: 0.92 },
];

export function OtaLink({
  activeRef,
  detail = 'high',
}: {
  activeRef: React.MutableRefObject<number>;
  detail?: 'high' | 'low';
}) {
  const mats = useDeviceMaterials();
  const { bind, live } = useAssembly(PARTS, activeRef);
  const power = useRef(0);

  /* --- surfaces ---------------------------------------------------------- */

  const world = useMemo(() => worldTexture(), []);
  const console2d = useMemo(() => otaConsoleTexture(), []);

  const globeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: world,
        roughness: 0.82,
        metalness: 0.08,
        emissive: new THREE.Color('#0a2630'),
        emissiveMap: world,
        emissiveIntensity: 0.28,
      }),
    [world],
  );
  const screenMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: console2d,
        emissive: new THREE.Color('#ffffff'),
        emissiveMap: console2d,
        emissiveIntensity: 1,
        color: '#000000',
        toneMapped: false,
        roughness: 0.5,
      }),
    [console2d],
  );
  const atmosphere = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#4fd8ff',
        transparent: true,
        opacity: 0.07,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  useLayoutEffect(
    () => () => {
      globeMat.dispose();
      screenMat.dispose();
      atmosphere.dispose();
    },
    [globeMat, screenMat, atmosphere],
  );

  /* --- the things that change ------------------------------------------- */

  const btnMat = useMemo(() => ledMaterial('#3fe0d0', 0.2), []);
  const deviceMat = useMemo(() => ledMaterial('#28323a', 0.2), []);
  const packetMat = useMemo(() => ledMaterial('#3fe0d0', 4), []);
  const ackMat = useMemo(() => ledMaterial('#39ff88', 4), []);
  const rackMats = useMemo(
    () => Array.from({ length: SERVER.units }, () => ledMaterial('#3fe0d0', 0.2)),
    [],
  );
  const siteMats = useMemo(
    () => OTHER_SITES.map(() => ledMaterial('#3fe0d0', 0.2)),
    [],
  );

  const globe = useRef<THREE.Group>(null);
  const packet = useRef<THREE.Mesh>(null);
  const ack = useRef<THREE.Mesh>(null);
  /** 0..1 gate for the rings at the unit — RadioRings reads a ref, so the
   *  transmission can be switched on exactly when the packet lands. */
  const airRef = useRef(0);

  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    const want = sceneState.inspect ? 1 : live.current > POWER_GATE ? sceneState.power : 0;
    power.current = THREE.MathUtils.damp(power.current, want, POWER_RATE, d);
    const p = power.current;
    const t = state.clock.elapsedTime % T.end;

    // the world keeps turning whatever the console is doing
    if (globe.current) globe.current.rotation.y = state.clock.elapsedTime * 0.16;

    /* the console: armed in cyan while the push is in flight, green once the
       unit has acknowledged it */
    const acked = t >= T.ack2;
    const armed = between(t, T.arm, T.ack2);
    btnMat.emissive.copy(acked ? GREEN : CYAN);
    const pulse = armed && t < T.a0 ? ((t * 4) % 1 < 0.5 ? 1 : 0.35) : armed ? 0.7 : 0.18;
    btnMat.emissiveIntensity = 0.05 + pulse * 4.2 * p;
    screenMat.emissiveIntensity = 0.2 + 1.05 * p;

    /* the rack: quiet until the request lands on it, then busy while it is
       queued, sent, and waiting on the answer */
    const busy = between(t, T.srv, T.ack1);
    for (let i = 0; i < rackMats.length; i++) {
      const m = rackMats[i];
      const lit = busy ? ((t * (7 + i * 3)) % 1 < 0.5 ? 1 : 0.15) : 0.12;
      m.emissive.copy(busy ? CYAN : PENDING);
      m.emissiveIntensity = 0.05 + lit * 3.2 * p;
    }

    /* the outbound packet: the short hop to the server, then the long one
       out to wherever the unit actually is */
    if (packet.current) {
      let on = false;
      if (between(t, T.a0, T.a1)) {
        HOP_A.getPointAt(span(t, T.a0, T.a1), v);
        on = true;
      } else if (between(t, T.b0, T.b1)) {
        HOP_B.getPointAt(span(t, T.b0, T.b1), v);
        on = true;
      }
      packet.current.visible = on && p > 0.15;
      if (on) packet.current.position.copy(v);
    }

    /* the answer, all the way back */
    if (ack.current) {
      let on = false;
      if (between(t, T.ack0, T.ack1)) {
        HOP_B.getPointAt(1 - span(t, T.ack0, T.ack1), v);
        on = true;
      } else if (between(t, T.ack1, T.ack2)) {
        HOP_A.getPointAt(1 - span(t, T.ack1, T.ack2), v);
        on = true;
      }
      ack.current.visible = on && p > 0.15;
      if (on) ack.current.position.copy(v);
    }

    /* the unit: dark until it is addressed, amber while it writes the new
       configuration, green once it holds it */
    const writing = between(t, T.b1, T.write);
    if (t < T.b1) deviceMat.emissive.copy(PENDING);
    else if (writing) deviceMat.emissive.copy(AMBER);
    else deviceMat.emissive.copy(GREEN);
    const devLit = t < T.b1 ? 0.3 : writing ? ((t * 9) % 1 < 0.5 ? 1 : 0.2) : 1;
    deviceMat.emissiveIntensity = 0.05 + devLit * 4.4 * p;

    // it is on the air while it receives and while it answers
    const talking = between(t, T.b1 - 0.25, T.write) || between(t, T.ack0 - 0.2, T.ack0 + 0.5);
    airRef.current = THREE.MathUtils.damp(airRef.current, talking ? p : 0, 6, d);

    // the rest of the fleet: alive, unremarkable, on their own schedules
    for (let i = 0; i < siteMats.length; i++) {
      siteMats[i].emissiveIntensity =
        (0.1 + 0.5 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 0.7 + i * 1.9))) * p;
    }
  });

  return (
    <group>
      {/* ---- 0: the link, and what travels along it ----------------------- */}
      <group ref={bind(0)}>
        {/* the route itself, drawn faintly: a path exists whether or not
            anything is on it this second */}
        <Wire
          points={HOP_A.points.map((q) => [q.x, q.y, q.z] as [number, number, number])}
          radius={0.00035}
          color="#12333a"
          emissive="#1d6b6a"
          segments={26}
        />
        <Wire
          points={HOP_B.points.map((q) => [q.x, q.y, q.z] as [number, number, number])}
          radius={0.00035}
          color="#12333a"
          emissive="#1d6b6a"
          segments={40}
        />
        <mesh ref={packet} material={packetMat} visible={false}>
          <sphereGeometry args={[0.0024, 10, 8]} />
        </mesh>
        <mesh ref={ack} material={ackMat} visible={false}>
          <sphereGeometry args={[0.0021, 10, 8]} />
        </mesh>
      </group>

      {/* ---- 1: the world, and the unit standing on it -------------------- */}
      <group ref={bind(1)}>
        <group position={[GLOBE.x, GLOBE.y, 0]}>
          {/* Tilted, because a globe that spins about a vertical axis reads as
              a ball on a stick. */}
          <group ref={globe} rotation={[0, 0, 0.41]}>
            <mesh castShadow receiveShadow material={globeMat}>
              <sphereGeometry args={[GLOBE.r, detail === 'high' ? 48 : 24, detail === 'high' ? 32 : 16]} />
            </mesh>
          </group>
          {/* a breath of atmosphere on the limb, so the sphere has an edge
              against a dark bench rather than ending in nothing */}
          <mesh material={atmosphere}>
            <sphereGeometry args={[GLOBE.r * 1.045, 32, 20]} />
          </mesh>
        </group>

        {/* the rest of the fleet, as pins */}
        {OTHER_SITES.map((dir, i) => {
          const at = dir.clone().multiplyScalar(GLOBE.r + 0.004);
          return (
            <mesh
              key={i}
              position={[GLOBE.x + at.x, GLOBE.y + at.y, at.z]}
              material={siteMats[i]}
            >
              <sphereGeometry args={[0.0013, 8, 6]} />
            </mesh>
          );
        })}

        {/* the unit under configuration: a pin, a small unbadged tracker on
            top of it, and the air around it when it is talking */}
        <group position={[SITE_BASE.x, SITE_BASE.y, SITE_BASE.z]}>
          <mesh
            position={[SITE_DIR.x * 0.008, SITE_DIR.y * 0.008, SITE_DIR.z * 0.008]}
            rotation={[Math.PI / 2 - Math.asin(SITE_DIR.y), 0, -Math.atan2(SITE_DIR.x, SITE_DIR.z)]}
            material={mats.metal}
          >
            <cylinderGeometry args={[0.0006, 0.0006, 0.016, 6]} />
          </mesh>
        </group>
        <group position={[SITE_TIP.x, SITE_TIP.y, SITE_TIP.z]}>
          <mesh castShadow material={mats.abs}>
            <boxGeometry args={[0.013, 0.006, 0.009]} />
          </mesh>
          <mesh position={[0, 0.004, 0.003]} material={deviceMat}>
            <sphereGeometry args={[0.0012, 10, 8]} />
          </mesh>
          {/* stub antenna */}
          <mesh position={[0.0075, 0.0035, 0]} rotation={[0, 0, -0.3]} material={mats.darkPlastic}>
            <cylinderGeometry args={[0.0005, 0.0005, 0.008, 6]} />
          </mesh>
          {detail === 'high' && (
            <RadioRings
              position={[0.0075, 0.010, 0]}
              color="#3fe0d0"
              maxRadius={0.05}
              period={1.5}
              count={2}
              powerRef={airRef}
            />
          )}
        </group>
      </group>

      {/* ---- 2: what the globe stands in ---------------------------------- */}
      <group ref={bind(2)}>
        <group position={[GLOBE.x, 0, 0]}>
          <mesh position={[0, 0.004, 0]} castShadow receiveShadow material={mats.metal}>
            <cylinderGeometry args={[0.026, 0.03, 0.008, 24]} />
          </mesh>
          {/* the meridian ring the sphere sits inside */}
          <mesh
            position={[0, GLOBE.y - 0.03, 0]}
            rotation={[Math.PI / 2, 0, 0.41]}
            material={mats.metal}
          >
            <torusGeometry args={[GLOBE.r + 0.006, 0.0012, 8, detail === 'high' ? 48 : 20, Math.PI * 1.1]} />
          </mesh>
          <mesh position={[0, GLOBE.y * 0.32, 0]} material={mats.metal}>
            <cylinderGeometry args={[0.0035, 0.0045, GLOBE.y * 0.62, 12]} />
          </mesh>
        </group>
      </group>

      {/* ---- 3: the server the request lands on --------------------------- */}
      <group ref={bind(3)}>
        <group position={[SERVER.x, 0, 0]} rotation={[0, 0.22, 0]}>
          {/* the rack's two uprights */}
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[(s * (SERVER.w + 0.004)) / 2, (SERVER.units * SERVER.unitH) / 2 + 0.004, 0]}
              castShadow
              material={mats.metal}
            >
              <boxGeometry args={[0.004, SERVER.units * SERVER.unitH + 0.008, SERVER.d]} />
            </mesh>
          ))}
          {Array.from({ length: SERVER.units }, (_, i) => (
            <group key={i} position={[0, 0.004 + i * SERVER.unitH + SERVER.unitH / 2, 0]}>
              <mesh castShadow receiveShadow material={mats.darkPlastic}>
                <boxGeometry args={[SERVER.w, SERVER.unitH - 0.0015, SERVER.d]} />
              </mesh>
              {/* front bezel: a vent block and the activity lamp */}
              <mesh position={[-SERVER.w * 0.16, 0, SERVER.d / 2 + 0.0004]}>
                <planeGeometry args={[SERVER.w * 0.5, SERVER.unitH * 0.42]} />
                <meshStandardMaterial color="#0a0c0f" roughness={0.85} />
              </mesh>
              <mesh
                position={[SERVER.w * 0.34, 0, SERVER.d / 2 + 0.0008]}
                material={rackMats[i]}
              >
                <circleGeometry args={[0.0011, 10]} />
              </mesh>
            </group>
          ))}
          {/* the uplink out of the top of the rack */}
          <Led
            color="#8fc4ff"
            radius={0.001}
            position={[SERVER.w * 0.2, SERVER.units * SERVER.unitH + 0.008, 0]}
            pattern="fast"
            powerRef={power}
          />
        </group>
      </group>

      {/* ---- 4: the console the operator is sitting at -------------------- */}
      <group ref={bind(4)}>
        <group position={[CONSOLE.x, 0, 0]} rotation={[0, 0.34, 0]}>
          <group position={[0, CONSOLE.y, 0]} rotation={[CONSOLE.tilt, 0, 0]}>
            {/* the panel's shell */}
            <mesh position={[0, 0, -0.0015]} castShadow material={mats.darkPlastic}>
              <boxGeometry args={[CONSOLE.w + 0.005, CONSOLE.h + 0.005, 0.003]} />
            </mesh>
            <mesh position={[0, 0, 0.0008]} material={screenMat}>
              <planeGeometry args={[CONSOLE.w, CONSOLE.h]} />
            </mesh>
            {/* The armed state of the PUSH button, as a rule UNDER its
                printed label rather than a panel over it. A lit block on top
                covers the words, which is the one part of this console worth
                being able to read. */}
            <mesh position={[0, -CONSOLE.h * 0.432, 0.0012]} material={btnMat}>
              <planeGeometry args={[CONSOLE.w * 0.9, CONSOLE.h * 0.022]} />
            </mesh>
          </group>
          {/* stand */}
          <mesh position={[0, CONSOLE.y * 0.45, -0.012]} rotation={[0.34, 0, 0]} material={mats.metal}>
            <boxGeometry args={[0.006, CONSOLE.y * 0.95, 0.004]} />
          </mesh>
          <mesh position={[0, 0.0025, -0.016]} castShadow receiveShadow material={mats.metal}>
            <boxGeometry args={[0.05, 0.005, 0.034]} />
          </mesh>
        </group>
      </group>

      {/* ---- 5: the rail the whole set is laid out on --------------------- */}
      <group ref={bind(5)}>
        <mesh position={[-0.01, 0.0015, -0.03]} receiveShadow material={mats.darkPlastic}>
          <boxGeometry args={[0.3, 0.003, 0.016]} />
        </mesh>
        <Screws
          positions={[
            [-0.15, 0.003, -0.03],
            [0.13, 0.003, -0.03],
          ]}
          radius={0.0016}
        />
      </group>
    </group>
  );
}
