/* ============================================================================
   Furniture — the bench itself, the chair, the light, and the bench dressing
   ----------------------------------------------------------------------------
   Everything here is set dressing: it never animates and never fades, so it is
   built from shared materials and static geometry. The reference photographs
   are of a real electronics bench — unfinished pine top, an anti-static strip
   down the middle, a self-healing cutting mat, blue louvre bins, a batten light
   overhead — and that is what this reproduces.

   The scene is modelled at true scale. The bench is 2.6m long, so the tracker
   really is a small object on it, which is what makes the camera push toward a
   chapter feel like walking up to a workbench rather than zooming an image.
   ========================================================================== */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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

  const legX = W / 2 - 0.10;
  const legZ = D / 2 - 0.09;

  return (
    <group>
      {/* benchtop */}
      <mesh position={[0, -T / 2, 0]} receiveShadow castShadow material={m.benchTop}>
        <boxGeometry args={[W, T, D]} />
      </mesh>
      {/* front edge lipping, a shade darker than the face */}
      <mesh position={[0, -T / 2, D / 2 + 0.001]}>
        <boxGeometry args={[W, T, 0.004]} />
        <meshStandardMaterial color="#7d5f39" roughness={0.8} />
      </mesh>

      {/* welded steel frame */}
      {(
        [
          [-legX, -legZ],
          [legX, -legZ],
          [-legX, legZ],
          [legX, legZ],
        ] as const
      ).map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, (floorY - T) / 2, z]} material={m.chassis}>
          <boxGeometry args={[0.05, Math.abs(floorY) - T, 0.05]} />
        </mesh>
      ))}
      {/* cross rails and the lower shelf */}
      {[-legZ, legZ].map((z) => (
        <mesh key={z} position={[0, floorY + 0.30, z]} material={m.chassis}>
          <boxGeometry args={[legX * 2, 0.04, 0.04]} />
        </mesh>
      ))}
      <mesh position={[0, floorY + 0.28, 0]} receiveShadow material={m.chassis}>
        <boxGeometry args={[W - 0.24, 0.018, D - 0.22]} />
      </mesh>

      {/* anti-static strip running the length of the bench */}
      <mesh position={[0, 0.0012, -0.10]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={m.esdMat}>
        <planeGeometry args={[W - 0.1, 0.14]} />
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
      {/* five-star base with casters */}
      {casters.map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x / 2, BENCH.floorY + 0.05, z / 2]} rotation={[0, -Math.atan2(z, x), 0]} material={m.polymer}>
            <boxGeometry args={[0.27, 0.022, 0.04]} />
          </mesh>
          <mesh
            position={[x, BENCH.floorY + 0.028, z]}
            rotation={[Math.PI / 2, 0, 0]}
            material={m.polymer}
          >
            <cylinderGeometry args={[0.026, 0.026, 0.02, 12]} />
          </mesh>
        </group>
      ))}
      {/* gas cylinder */}
      <mesh position={[0, BENCH.floorY + 0.26, 0]} material={m.chassis}>
        <cylinderGeometry args={[0.026, 0.032, 0.42, 14]} />
      </mesh>
      {/* seat pad */}
      <mesh position={[0, seatY, 0]} castShadow material={m.polymer}>
        <boxGeometry args={[0.46, 0.06, 0.44]} />
      </mesh>
      {/* backrest, reclined */}
      <group position={[0, seatY + 0.03, -0.21]} rotation={[0.22, 0, 0]}>
        <mesh position={[0, 0.26, 0]} castShadow material={m.polymer}>
          <boxGeometry args={[0.42, 0.5, 0.05]} />
        </mesh>
        {/* lumbar frame */}
        <mesh position={[0, 0.26, -0.03]} material={m.chassis}>
          <boxGeometry args={[0.44, 0.52, 0.014]} />
        </mesh>
      </group>
      {/* armrest */}
      {[-0.25, 0.25].map((x) => (
        <mesh key={x} position={[x, seatY + 0.17, -0.02]} material={m.polymer}>
          <boxGeometry args={[0.045, 0.02, 0.24]} />
        </mesh>
      ))}
    </group>
  );
}

/* --- overhead light ------------------------------------------------------ */

/** The batten fixture over the bench. The emissive tube is the visible source;
 *  the actual illumination comes from the lights in the canvas rig, which are
 *  positioned to agree with it.
 *
 *  It also switches off when the reader turns away to the room chapter. That
 *  is not only housekeeping: the fixture hangs almost exactly in the eyeline
 *  of the room shot, and left burning it lays a clipped white bar straight
 *  across the top of the frame. Dropping the bench light as the room light
 *  comes up is what someone standing there would do anyway. */
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
      1.05 * (1 - away) + 0.04,
      2,
      Math.min(delta, 1 / 30),
    );
  });

  return (
    <group position={position}>
      <mesh material={m.polymer}>
        <boxGeometry args={[length, 0.05, 0.07]} />
      </mesh>
      {/* diffuser */}
      <mesh position={[0, -0.027, 0]}>
        <boxGeometry args={[length * 0.96, 0.008, 0.055]} />
        <meshStandardMaterial
          ref={tube}
          color="#0e1114"
          emissive={new THREE.Color('#dceeff')}
          emissiveIntensity={1.05}
          toneMapped={false}
          roughness={0.4}
        />
      </mesh>
      {/* suspension */}
      {[-length * 0.36, length * 0.36].map((x) => (
        <mesh key={x} position={[x, 0.14, 0]} material={m.chassis}>
          <cylinderGeometry args={[0.003, 0.003, 0.28, 6]} />
        </mesh>
      ))}
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
              <mesh castShadow material={m.bin}>
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
        <mesh position={[0, 0.012, 0]} castShadow material={m.chassis}>
          <boxGeometry args={[0.11, 0.024, 0.085]} />
        </mesh>
        {/* helical rest */}
        <mesh position={[0, 0.055, 0]} rotation={[0, 0, Math.PI / 2]} material={m.chassis}>
          <torusGeometry args={[0.03, 0.004, 6, 16]} />
        </mesh>
        {/* the iron itself, lying in the rest */}
        <group position={[0.01, 0.062, 0]} rotation={[0, 0, -0.28]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={m.polymer}>
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
      <group position={[0.55, 0, 0.30]} rotation={[-Math.PI / 2, 0, 0.4]}>
        <mesh material={m.rubber}>
          <torusGeometry args={[0.07, 0.005, 6, 26]} />
        </mesh>
        <mesh position={[0, 0, 0.012]} material={m.rubber}>
          <torusGeometry args={[0.062, 0.005, 6, 26]} />
        </mesh>
      </group>

      {detail === 'high' && (
        <>
          {/* precision screwdriver lying beside the mat */}
          <group position={[0.24, 0.006, 0.30]} rotation={[0, -0.9, Math.PI / 2]}>
            <mesh material={m.polymer}>
              <cylinderGeometry args={[0.007, 0.009, 0.075, 10]} />
            </mesh>
            <mesh position={[0, 0.058, 0]}>
              <cylinderGeometry args={[0.0018, 0.0018, 0.045, 8]} />
              <meshStandardMaterial color="#b9c0c6" roughness={0.3} metalness={1} />
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
