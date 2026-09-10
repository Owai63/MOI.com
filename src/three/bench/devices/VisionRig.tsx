/* ============================================================================
   VisionRig — Robust Real-Time Violence Detection, staged as a bench camera
   ----------------------------------------------------------------------------
   This is the chapter it would have been easiest to get wrong. The obvious
   staging — a CCTV frame of a public space with boxes drawn round people — is
   a fabricated dataset dressed up as a result, and this site does not do
   that: the case study itself is marked as needing real source content.

   What can be shown honestly is the APPARATUS. A camera on a bench tripod, a
   printed calibration target in front of it, and the detector's brackets
   travelling over the two regions on that chart. Everything in frame is
   equipment that would really be on a desk while a model is exercised, and
   the only thing that "detects" anything is detecting a printed rectangle.

   The brackets are deliberately imperfect: they drift, they resize, and the
   second one drops out and re-acquires. A tracker that locks four boxes
   perfectly still is the tell of an animation rather than a detector.
   ========================================================================== */

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Wire, Led, Screws } from '../parts/primitives';
import { useDeviceMaterials, ledMaterial } from '../materials';
import { visionTargetTexture } from '../textures';
import { useAssembly, type PartSpec } from '../assembly';
import { sceneState } from '../../sceneState';
import { POWER_GATE, POWER_RATE } from './power';

/* The rig looks along its own +x: the camera stands at the left of the mat
   and the chart at the right, so the whole thing reads as a sight line rather
   than as two unrelated objects. */
const CAM_X = -0.052;
const CARD_X = 0.062;

const CARD_W = 0.072;
const CARD_H = 0.05;
const CARD_Y = 0.052;

/* The chart is turned off the sight line rather than square to it. A camera
   aimed straight at a card puts the two objects on the same screen axis, so
   from any standpoint that shows the card's face they overlap, and from any
   standpoint that separates them the card is edge-on. Angling the target
   about a third of a turn — which is what anyone does with a test chart on a
   desk anyway — breaks the tie: the card faces the reader while the camera
   still stays in three-quarter view beside it. */
const CARD_YAW = 0.55;

const HUB_Y = 0.052;
const BODY_Y = 0.086;
const LEG_R = 0.03;

const PARTS: PartSpec[] = [
  /* 0 overlay  */ { pos: [0, 0, 0], out: [0.02, 0.05, 0.02], delay: 0.05 },
  /* 1 chart    */ { pos: [0, 0, 0], out: [0.06, 0.024, 0], delay: 0.3 },
  /* 2 head+cam */ { pos: [0, 0, 0], out: [-0.03, 0.05, 0], delay: 0.5 },
  /* 3 pan head */ { pos: [0, 0, 0], out: [0, 0.016, 0], delay: 0.7 },
  /* 4 tripod   */ { pos: [0, 0, 0], out: [0, -0.03, 0], delay: 0.85 },
  /* 5 cable    */ { pos: [0, 0, 0], out: [-0.02, 0.014, 0.055], delay: 0.95 },
];

/** Four corner brackets, the way a detector actually draws one — never a
 *  closed rectangle, because a closed rectangle hides the thing inside it. */
function Bracket({
  w,
  h,
  material,
  arm = 0.3,
  t = 0.0008,
}: {
  w: number;
  h: number;
  material: THREE.Material;
  arm?: number;
  t?: number;
}) {
  const ax = w * arm;
  const ay = h * arm;
  const corners: [number, number][] = [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ];
  return (
    <group>
      {corners.map(([sx, sy], i) => (
        <group key={i}>
          <mesh position={[(sx * (w - ax)) / 2, (sy * h) / 2, 0]} material={material}>
            <planeGeometry args={[ax, t]} />
          </mesh>
          <mesh position={[(sx * w) / 2, (sy * (h - ay)) / 2, 0]} material={material}>
            <planeGeometry args={[t, ay]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function VisionRig({
  activeRef,
  detail = 'high',
}: {
  activeRef: React.MutableRefObject<number>;
  detail?: 'high' | 'low';
}) {
  const mats = useDeviceMaterials();
  const { bind, live } = useAssembly(PARTS, activeRef);
  const power = useRef(0);

  const chart = useMemo(() => visionTargetTexture(), []);
  const chartMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: chart,
        roughness: 0.86,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [chart],
  );

  useLayoutEffect(() => () => chartMat.dispose(), [chartMat]);

  const trackMat = useMemo(() => ledMaterial('#f6a250', 0.2), []);
  const holdMat = useMemo(() => ledMaterial('#3fe0d0', 0.2), []);
  const irMat = useMemo(() => ledMaterial('#ff3b2f', 0.2), []);

  const primary = useRef<THREE.Group>(null);
  const secondary = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const d = Math.min(delta, 1 / 30);
    const want = sceneState.inspect ? 1 : live.current > POWER_GATE ? sceneState.power : 0;
    power.current = THREE.MathUtils.damp(power.current, want, POWER_RATE, d);
    const p = power.current;
    const t = state.clock.elapsedTime;

    /* The confident track: it drifts and breathes, because a bounding box
       re-derived every frame never lands in exactly the same place twice. */
    if (primary.current) {
      primary.current.position.set(
        -CARD_W * 0.19 + Math.sin(t * 0.7) * 0.0035,
        Math.sin(t * 0.53 + 1.2) * 0.0022,
        0.0012,
      );
      const s = 1 + Math.sin(t * 1.1) * 0.045;
      primary.current.scale.set(s, 1 + Math.sin(t * 0.9 + 0.6) * 0.05, 1);
    }

    /* The marginal one: acquired, lost, re-acquired. This is the honest half
       of the picture — the second region is the one a detector argues with. */
    const cycle = t % 7.4;
    const held = cycle < 3.1 || cycle > 4.6;
    if (secondary.current) {
      secondary.current.position.set(
        CARD_W * 0.2 + Math.sin(t * 0.9 + 2) * 0.003,
        -CARD_H * 0.02 + Math.sin(t * 0.61) * 0.002,
        0.0012,
      );
      secondary.current.visible = held && p > 0.2;
    }

    holdMat.emissiveIntensity = 0.05 + 3.6 * p;
    // the marginal track flickers while it is only just holding on
    trackMat.emissiveIntensity =
      0.05 + 3.6 * p * (cycle > 2.6 && cycle < 3.1 ? ((t * 12) % 1 < 0.5 ? 1 : 0.25) : 1);
    irMat.emissiveIntensity = 0.05 + 1.5 * p;
  });

  return (
    <group>
      {/* ---- 0: what the detector thinks it can see ----------------------- */}
      <group ref={bind(0)}>
        <group position={[CARD_X, CARD_Y, 0]} rotation={[0, -Math.PI / 2 + CARD_YAW, 0]}>
          <group ref={primary}>
            <Bracket w={CARD_W * 0.2} h={CARD_H * 0.62} material={holdMat} />
          </group>
          <group ref={secondary}>
            <Bracket w={CARD_W * 0.19} h={CARD_H * 0.5} material={trackMat} />
          </group>
        </group>
      </group>

      {/* ---- 1: the chart, on its stand ----------------------------------- */}
      <group ref={bind(1)}>
        <group position={[CARD_X, 0, 0]} rotation={[0, CARD_YAW, 0]}>
          {/* the card itself, angled off the sight line — see CARD_YAW */}
          <mesh
            position={[0, CARD_Y, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            castShadow
            material={chartMat}
          >
            <planeGeometry args={[CARD_W, CARD_H]} />
          </mesh>
          {/* backing board, so the card is an object and not a decal */}
          <mesh
            position={[0.0012, CARD_Y, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            material={mats.darkPlastic}
          >
            <boxGeometry args={[CARD_W + 0.004, CARD_H + 0.004, 0.002]} />
          </mesh>
          {/* a folded easel leg */}
          <mesh position={[0.006, CARD_Y - CARD_H * 0.5 - 0.012, 0]} material={mats.metal}>
            <boxGeometry args={[0.003, 0.026, 0.003]} />
          </mesh>
          <mesh position={[0.006, 0.0025, 0]} castShadow receiveShadow material={mats.metal}>
            <boxGeometry args={[0.024, 0.005, 0.034]} />
          </mesh>
        </group>
      </group>

      {/* ---- 2: the camera ------------------------------------------------ */}
      <group ref={bind(2)}>
        <group position={[CAM_X, BODY_Y, 0]}>
          <mesh castShadow receiveShadow material={mats.abs}>
            <boxGeometry args={[0.046, 0.03, 0.034]} />
          </mesh>
          {/* vented rear, the way a machine-vision body is built */}
          {detail === 'high' &&
            [0, 1, 2].map((i) => (
              <mesh key={i} position={[-0.0232, 0.006 - i * 0.006, 0]}>
                <boxGeometry args={[0.0008, 0.0018, 0.024]} />
                <meshStandardMaterial color="#08090b" roughness={0.9} />
              </mesh>
            ))}
          {/* lens barrel, out along the sight line */}
          <mesh position={[0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={mats.abs}>
            <cylinderGeometry args={[0.0105, 0.0115, 0.026, 20]} />
          </mesh>
          {/* focus ring */}
          <mesh position={[0.034, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.metal}>
            <cylinderGeometry args={[0.0112, 0.0112, 0.005, 20]} />
          </mesh>
          {/* the glass */}
          <mesh position={[0.0432, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.0088, 20]} />
            <meshPhysicalMaterial
              color="#07161f"
              roughness={0.06}
              metalness={0.25}
              clearcoat={1}
            />
          </mesh>
          {/* the illuminator ring around it */}
          {detail === 'high' &&
            Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <mesh
                  key={i}
                  position={[0.0434, Math.sin(a) * 0.0102, Math.cos(a) * 0.0102]}
                  rotation={[0, Math.PI / 2, 0]}
                  material={irMat}
                >
                  <circleGeometry args={[0.0011, 8]} />
                </mesh>
              );
            })}
          {/* recording indicator on the body */}
          <Led
            color="#39ff88"
            radius={0.0012}
            position={[-0.012, 0.0158, 0.008]}
            pattern="slow"
            powerRef={power}
          />
        </group>
      </group>

      {/* ---- 3: the pan head ---------------------------------------------- */}
      <group ref={bind(3)}>
        <group position={[CAM_X, HUB_Y, 0]}>
          <mesh position={[0, 0.012, 0]} castShadow material={mats.metal}>
            <boxGeometry args={[0.02, 0.012, 0.02]} />
          </mesh>
          <mesh position={[0, 0.003, 0]} material={mats.metal}>
            <cylinderGeometry args={[0.009, 0.011, 0.008, 14]} />
          </mesh>
          {/* the tilt handle */}
          <mesh
            position={[-0.012, 0.012, 0.014]}
            rotation={[0.5, 0, 0.3]}
            material={mats.darkPlastic}
          >
            <cylinderGeometry args={[0.0016, 0.0016, 0.026, 8]} />
          </mesh>
        </group>
      </group>

      {/* ---- 4: the tripod ------------------------------------------------- */}
      <group ref={bind(4)}>
        <group position={[CAM_X, 0, 0]}>
          {/* centre column up to the head */}
          <mesh position={[0, HUB_Y * 0.72, 0]} castShadow material={mats.metal}>
            <cylinderGeometry args={[0.0045, 0.0045, HUB_Y * 0.55, 12]} />
          </mesh>
          <mesh position={[0, HUB_Y * 0.44, 0]} material={mats.darkPlastic}>
            <cylinderGeometry args={[0.0072, 0.0072, 0.008, 12]} />
          </mesh>
          {/* three legs down to the mat */}
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2 + 0.5;
            const x = Math.cos(a) * LEG_R;
            const z = Math.sin(a) * LEG_R;
            const top = HUB_Y * 0.44;
            const len = Math.hypot(LEG_R, top);
            return (
              <group key={i}>
                <mesh
                  position={[x / 2, top / 2, z / 2]}
                  rotation={[0, -a, -Math.atan2(LEG_R, top)]}
                  castShadow
                  material={mats.metal}
                >
                  <cylinderGeometry args={[0.0026, 0.0032, len, 10]} />
                </mesh>
                {/* rubber foot */}
                <mesh position={[x, 0.0025, z]} receiveShadow material={mats.darkPlastic}>
                  <cylinderGeometry args={[0.005, 0.006, 0.005, 12]} />
                </mesh>
              </group>
            );
          })}
          <Screws positions={[[0, HUB_Y * 0.44, 0.0074]]} radius={0.0016} normal="z" />
        </group>
      </group>

      {/* ---- 5: the tether ------------------------------------------------- */}
      <group ref={bind(5)}>
        {detail === 'high' && (
          <Wire
            points={[
              [CAM_X - 0.023, BODY_Y - 0.006, 0.006],
              [CAM_X - 0.05, 0.024, 0.03],
              [CAM_X - 0.062, 0.004, 0.062],
            ]}
            radius={0.0016}
            color="#0a0b0d"
            segments={22}
          />
        )}
      </group>
    </group>
  );
}
