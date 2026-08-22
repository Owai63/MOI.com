/* ============================================================================
   Furniture — the bench itself, the chair, the light, and the bench dressing
   ----------------------------------------------------------------------------
   Everything here is set dressing: it never animates and never fades, so it is
   built from shared materials and static geometry. The reference photographs
   are of a real electronics bench — unfinished pine top, an anti-static strip
   down the middle, a self-healing cutting mat, blue louvre bins, a batten light
   overhead — and that is what this reproduces.

   The scene is modelled at true scale. The bench is 2.6m long, so the tracker
   really is a small object on it, which is what makes the camera walking up to
   a chapter feel like walking up to a workbench rather than zooming an image.

   Almost everything here gained a chamfer in this pass, and it is worth being
   explicit about why, because "add a radius to the boxes" sounds like fussing.
   A square edge between two faces is a single line whose brightness is decided
   entirely by which of the two faces is better lit. A radiused edge is a thin
   band that catches a highlight along its whole length, independent of either
   face. That highlight is the thing your eye uses to read an object's shape,
   and it is the single clearest difference between a rendered box and a piece
   of furniture — which matters far more now that the camera walks past this
   furniture at arm's length instead of viewing it all from one fixed shot.
   ========================================================================== */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { benchMaterials } from '../materials';
import { sceneState } from '../../sceneState';
import { isRoomChapter } from '../devices/registry';

/* Placement constants live in ../layout so the camera and the props read the
   same numbers; re-exported here because everything that draws the bench
   already imports from this module. */
export { BENCH, STAGE } from '../layout';
import { BENCH, STAGE } from '../layout';

export function Desk() {
  const m = benchMaterials();
  const { width: W, depth: D, thickness: T, floorY } = BENCH;

  const legX = W / 2 - 0.1;
  const legZ = D / 2 - 0.09;

  return (
    <group>
      {/* Benchtop. The 4mm radius runs the whole 2.6m front edge, which from
          anywhere on the walkway is the brightest line in the lower half of
          the frame. */}
      <RoundedBox
        args={[W, T, D]}
        radius={0.004}
        smoothness={2}
        position={[0, -T / 2, 0]}
        receiveShadow
        castShadow
        material={m.benchTop}
      />
      {/* front edge lipping, a shade darker than the face */}
      <mesh position={[0, -T / 2, D / 2 + 0.0015]}>
        <boxGeometry args={[W, T * 0.92, 0.004]} />
        <meshStandardMaterial color="#7d5f39" roughness={0.8} />
      </mesh>

      {/* welded steel frame: box-section legs on levelling feet */}
      {(
        [
          [-legX, -legZ],
          [legX, -legZ],
          [-legX, legZ],
          [legX, legZ],
        ] as const
      ).map(([x, z]) => (
        <group key={`${x}${z}`}>
          <mesh
            position={[x, (floorY - T) / 2 + 0.02, z]}
            castShadow
            receiveShadow
            material={m.chassis}
          >
            <boxGeometry args={[0.05, Math.abs(floorY) - T - 0.04, 0.05]} />
          </mesh>
          {/* the levelling foot, and the threaded stem it rides on */}
          <mesh position={[x, floorY + 0.024, z]} material={m.chassis}>
            <cylinderGeometry args={[0.008, 0.008, 0.03, 8]} />
          </mesh>
          <mesh position={[x, floorY + 0.006, z]} castShadow material={m.polymer}>
            <cylinderGeometry args={[0.026, 0.028, 0.012, 12]} />
          </mesh>
        </group>
      ))}

      {/* cross rails, end rails and the lower shelf */}
      {[-legZ, legZ].map((z) => (
        <mesh key={z} position={[0, floorY + 0.3, z]} castShadow material={m.chassis}>
          <boxGeometry args={[legX * 2, 0.04, 0.04]} />
        </mesh>
      ))}
      {[-legX, legX].map((x) => (
        <mesh key={x} position={[x, floorY + 0.3, 0]} material={m.chassis}>
          <boxGeometry args={[0.04, 0.04, legZ * 2]} />
        </mesh>
      ))}
      <mesh position={[0, floorY + 0.28, 0]} receiveShadow castShadow material={m.chassis}>
        <boxGeometry args={[W - 0.24, 0.018, D - 0.22]} />
      </mesh>

      {/* What lives on the lower shelf. In frame from most of the walkway now,
          and an empty shelf under a working bench is a tell. */}
      <group position={[-0.62, floorY + 0.289, 0.02]}>
        <mesh position={[0, 0.11, 0]} castShadow material={m.chassis}>
          <boxGeometry args={[0.34, 0.22, 0.3]} />
        </mesh>
        <mesh position={[0, 0.11, 0.152]} material={m.polymer}>
          <boxGeometry args={[0.3, 0.18, 0.006]} />
        </mesh>
      </group>
      {[0.36, 0.56].map((x, i) => (
        <mesh key={x} position={[x, floorY + 0.35, -0.02 + i * 0.05]} castShadow material={m.bin}>
          <boxGeometry args={[0.18, 0.12, 0.26]} />
        </mesh>
      ))}

      {/* anti-static strip running the length of the bench, and the bonding
          point it earths to */}
      <mesh
        position={[0, 0.0012, -0.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        material={m.esdMat}
      >
        <planeGeometry args={[W - 0.1, 0.14]} />
      </mesh>
      <mesh position={[-W / 2 + 0.06, 0.004, -0.1]} material={m.chassis}>
        <cylinderGeometry args={[0.007, 0.007, 0.008, 10]} />
      </mesh>
    </group>
  );
}

/** The self-healing mat the device stands on — the stage. */
export function StageMat() {
  const m = benchMaterials();
  return (
    <mesh
      position={[STAGE[0], 0.0018, STAGE[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      material={m.cuttingMat}
    >
      <planeGeometry args={[0.62, 0.46]} />
    </mesh>
  );
}

/* --- chair --------------------------------------------------------------- */

export function Chair({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const m = benchMaterials();
  const seatY = BENCH.floorY + 0.47;

  const casters = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        return [Math.cos(a) * 0.26, Math.sin(a) * 0.26] as const;
      }),
    [],
  );

  return (
    <group position={position}>
      {/* Five-star base with real casters. This is the one piece of furniture
          the walkway passes within half a metre of, so its silhouette is the
          one that gets looked at. */}
      {casters.map(([x, z], i) => {
        const yaw = -Math.atan2(z, x);
        return (
          <group key={i}>
            <mesh
              position={[x / 2, BENCH.floorY + 0.055, z / 2]}
              rotation={[0, yaw, 0.03]}
              castShadow
              material={m.polymer}
            >
              <boxGeometry args={[0.27, 0.026, 0.045]} />
            </mesh>
            {/* fork and wheel, rather than a puck */}
            <mesh position={[x, BENCH.floorY + 0.048, z]} material={m.polymer}>
              <boxGeometry args={[0.022, 0.03, 0.03]} />
            </mesh>
            <mesh
              position={[x, BENCH.floorY + 0.026, z]}
              rotation={[Math.PI / 2, 0, yaw]}
              castShadow
              material={m.rubber}
            >
              <cylinderGeometry args={[0.026, 0.026, 0.022, 14]} />
            </mesh>
          </group>
        );
      })}

      {/* gas cylinder, with the chrome ram showing above its shroud */}
      <mesh position={[0, BENCH.floorY + 0.16, 0]} castShadow material={m.polymer}>
        <cylinderGeometry args={[0.028, 0.038, 0.2, 16]} />
      </mesh>
      <mesh position={[0, BENCH.floorY + 0.32, 0]} material={m.aluminium}>
        <cylinderGeometry args={[0.019, 0.019, 0.16, 14]} />
      </mesh>

      {/* the seat mechanism, and the height lever off the side of it */}
      <mesh position={[0, seatY - 0.045, -0.01]} castShadow material={m.chassis}>
        <boxGeometry args={[0.16, 0.05, 0.2]} />
      </mesh>
      <mesh
        position={[0.11, seatY - 0.055, 0.07]}
        rotation={[0, 0, Math.PI / 2]}
        material={m.chassis}
      >
        <cylinderGeometry args={[0.008, 0.008, 0.09, 8]} />
      </mesh>

      {/* Seat: a firm base with a softer top overhanging it. Two stacked
          rounded boxes is all it takes to give a cushion the rolled front edge
          that reads as upholstery from across the room. */}
      <RoundedBox
        args={[0.44, 0.035, 0.42]}
        radius={0.014}
        smoothness={3}
        position={[0, seatY - 0.012, 0]}
        castShadow
        material={m.polymer}
      />
      <RoundedBox
        args={[0.46, 0.05, 0.44]}
        radius={0.022}
        smoothness={3}
        position={[0, seatY + 0.018, 0.006]}
        castShadow
        receiveShadow
        material={m.seatFabric}
      />

      {/* backrest, reclined, on a visible spine */}
      <group position={[0, seatY + 0.03, -0.21]} rotation={[0.22, 0, 0]}>
        <RoundedBox
          args={[0.42, 0.5, 0.045]}
          radius={0.02}
          smoothness={3}
          position={[0, 0.28, 0]}
          castShadow
          material={m.seatFabric}
        />
        {/* the frame the back is stretched on */}
        <mesh position={[0, 0.28, -0.032]} material={m.chassis}>
          <boxGeometry args={[0.44, 0.53, 0.016]} />
        </mesh>
        {/* lumbar bar */}
        <mesh position={[0, 0.1, 0.026]} material={m.chassis}>
          <boxGeometry args={[0.34, 0.03, 0.012]} />
        </mesh>
        {/* the spine back down to the seat */}
        <mesh position={[0, -0.02, -0.03]} rotation={[-0.22, 0, 0]} material={m.chassis}>
          <boxGeometry args={[0.07, 0.14, 0.03]} />
        </mesh>
      </group>

      {/* armrests: a pad on an upright, not a floating bar */}
      {[-0.25, 0.25].map((x) => (
        <group key={x}>
          <mesh position={[x, seatY + 0.09, -0.06]} material={m.chassis}>
            <boxGeometry args={[0.024, 0.15, 0.03]} />
          </mesh>
          <RoundedBox
            args={[0.05, 0.022, 0.24]}
            radius={0.009}
            smoothness={2}
            position={[x, seatY + 0.175, -0.02]}
            castShadow
            material={m.polymer}
          />
        </group>
      ))}
    </group>
  );
}

/* --- overhead light ------------------------------------------------------ */

/** The batten fixture over the bench. The emissive tube is the visible source;
 *  the actual illumination comes from the lights in the canvas rig, which are
 *  positioned to agree with it.
 *
 *  It dims when the reader turns away to a room chapter, but no longer goes
 *  out. It used to: the fixture hangs close to the eyeline of the old room
 *  shot and left burning it laid a clipped white bar across the top of the
 *  frame. Now that the camera walks around, the bench and the floor area are
 *  in the same shot for most of the journey, and a bench light that switches
 *  itself off when you turn your back is a stage trick you can see the wires
 *  on. */
export function BattenLight({
  position = [0, 0, 0],
  length = 1.2,
}: {
  position?: [number, number, number];
  length?: number;
}) {
  const m = benchMaterials();
  const tube = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((_, delta) => {
    if (!tube.current) return;
    const away = isRoomChapter(sceneState.activeProject) ? 1 : 0;
    tube.current.emissiveIntensity = THREE.MathUtils.damp(
      tube.current.emissiveIntensity,
      1.15 - away * 0.4,
      2,
      Math.min(delta, 1 / 30),
    );
  });

  return (
    <group position={position}>
      {/* housing, with a reflector wing either side of the tube */}
      <mesh castShadow material={m.polymer}>
        <boxGeometry args={[length, 0.05, 0.07]} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[0, -0.02, s * 0.038]} rotation={[s * 0.55, 0, 0]} material={m.aluminium}>
          <boxGeometry args={[length * 0.98, 0.004, 0.035]} />
        </mesh>
      ))}
      {/* diffuser */}
      <mesh position={[0, -0.027, 0]}>
        <boxGeometry args={[length * 0.96, 0.008, 0.055]} />
        <meshStandardMaterial
          ref={tube}
          color="#0e1114"
          emissive={new THREE.Color('#dceeff')}
          emissiveIntensity={1.15}
          toneMapped={false}
          roughness={0.4}
        />
      </mesh>
      {/* suspension, and the flex running back to the wall */}
      {[-length * 0.36, length * 0.36].map((x) => (
        <mesh key={x} position={[x, 0.14, 0]} material={m.chassis}>
          <cylinderGeometry args={[0.003, 0.003, 0.28, 6]} />
        </mesh>
      ))}
      <mesh position={[length * 0.36, 0.2, -0.16]} rotation={[0.9, 0, 0]} material={m.rubber}>
        <cylinderGeometry args={[0.0022, 0.0022, 0.42, 6]} />
      </mesh>
    </group>
  );
}

/* --- bench dressing ------------------------------------------------------ */

/** Louvre parts bins, cable coils, a soldering iron in its stand, and the
 *  loose hand tools that make a bench look worked at rather than staged. */
export function Dressing({ detail = 'high' }: { detail?: 'high' | 'low' }) {
  const m = benchMaterials();

  return (
    <group>
      {/* stacked parts bins at the right end */}
      <group position={[0.96, 0, -0.28]} rotation={[0, -0.12, 0]}>
        {[0, 1, 2].map((row) =>
          [0, 1].map((col) => (
            <group key={`${row}${col}`} position={[col * 0.135, row * 0.088, -row * 0.055]}>
              <mesh castShadow receiveShadow material={m.bin}>
                <boxGeometry args={[0.125, 0.082, 0.17]} />
              </mesh>
              {/* the open front face */}
              <mesh position={[0, 0.016, 0.086]}>
                <boxGeometry args={[0.105, 0.05, 0.004]} />
                <meshStandardMaterial color="#0a1226" roughness={0.7} />
              </mesh>
              {/* white label holder */}
              <mesh position={[0, -0.028, 0.087]}>
                <boxGeometry args={[0.07, 0.016, 0.003]} />
                <meshStandardMaterial color="#d8dce0" roughness={0.8} />
              </mesh>
            </group>
          )),
        )}
      </group>

      {/* soldering iron resting in its stand */}
      <group position={[-0.72, 0, 0.22]} rotation={[0, 0.6, 0]}>
        <mesh position={[0, 0.012, 0]} castShadow receiveShadow material={m.chassis}>
          <boxGeometry args={[0.11, 0.024, 0.085]} />
        </mesh>
        {/* helical rest */}
        <mesh position={[0, 0.055, 0]} rotation={[0, 0, Math.PI / 2]} material={m.chassis}>
          <torusGeometry args={[0.03, 0.004, 6, 16]} />
        </mesh>
        {/* the iron itself, lying in the rest */}
        <group position={[0.01, 0.062, 0]} rotation={[0, 0, -0.28]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={m.polymer}>
            <cylinderGeometry args={[0.011, 0.013, 0.13, 12]} />
          </mesh>
          <mesh position={[0.085, 0.02, 0]} rotation={[0, 0, -1.28]}>
            <coneGeometry args={[0.006, 0.055, 10]} />
            <meshStandardMaterial color="#8e6a3a" roughness={0.5} metalness={0.7} />
          </mesh>
        </group>
        {/* silicone lead trailing off the bench */}
        <mesh position={[-0.09, 0.055, 0.03]} rotation={[0, 0.4, 0]} material={m.rubber}>
          <torusGeometry args={[0.05, 0.0035, 6, 18, Math.PI * 1.4]} />
        </mesh>
      </group>

      {/* coiled test leads */}
      <group position={[0.55, 0, 0.3]} rotation={[-Math.PI / 2, 0, 0.4]}>
        <mesh castShadow material={m.rubber}>
          <torusGeometry args={[0.07, 0.005, 6, 26]} />
        </mesh>
        <mesh position={[0, 0, 0.012]} material={m.rubber}>
          <torusGeometry args={[0.062, 0.005, 6, 26]} />
        </mesh>
      </group>

      {detail === 'high' && (
        <>
          {/* precision screwdriver lying beside the mat */}
          <group position={[0.24, 0.006, 0.3]} rotation={[0, -0.9, Math.PI / 2]}>
            <mesh castShadow material={m.polymer}>
              <cylinderGeometry args={[0.007, 0.009, 0.075, 10]} />
            </mesh>
            <mesh position={[0, 0.058, 0]}>
              <cylinderGeometry args={[0.0018, 0.0018, 0.045, 8]} />
              <meshStandardMaterial color="#b9c0c6" roughness={0.3} metalness={1} />
            </mesh>
          </group>

          {/* a pad of squared paper with a pen across it */}
          <group position={[-0.5, 0.0016, 0.3]} rotation={[0, 0.34, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[0.16, 0.21]} />
              <meshStandardMaterial color="#b9bdc2" roughness={0.94} />
            </mesh>
            <mesh
              position={[0.02, 0.004, 0.01]}
              rotation={[0, 0.9, Math.PI / 2]}
              castShadow
              material={m.polymer}
            >
              <cylinderGeometry args={[0.005, 0.004, 0.13, 10]} />
            </mesh>
          </group>

          {/* mug, because every bench has one */}
          <group position={[-0.95, 0, 0.26]}>
            <mesh position={[0, 0.045, 0]} castShadow>
              <cylinderGeometry args={[0.042, 0.036, 0.09, 20, 1, true]} />
              <meshStandardMaterial color="#20242a" roughness={0.4} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.004, 0]}>
              <cylinderGeometry args={[0.036, 0.036, 0.008, 20]} />
              <meshStandardMaterial color="#20242a" roughness={0.4} />
            </mesh>
            <mesh position={[0.05, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.021, 0.005, 6, 14, Math.PI * 1.1]} />
              <meshStandardMaterial color="#20242a" roughness={0.4} />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
}
