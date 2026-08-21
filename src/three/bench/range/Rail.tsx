/* ============================================================================
   Rail — the track the target runner drives itself along
   ----------------------------------------------------------------------------
   Two rails on sleepers with a toothed rack between them. The rack is the
   important part: it is why the runner can be a self-contained box with a
   battery in it rather than something dragged by a cable at the far end, and
   it is what the pinion under the carriage is visibly engaging.

   Length is a parameter. The home page lays a demonstration section on the
   lab floor; the case study lays a full lane. Same track either way.

   Everything is instanced or shared: a 12m lane is ~50 sleepers and ~600 rack
   teeth, and those are the only two things here that repeat enough to matter.
   ========================================================================== */

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { deviceMaterials } from '../materials';
import { RAIL } from './spec';

/** Rack tooth pitch. Also the pinion's, in TargetRunner. */
export const RACK_PITCH = 0.02;

export function Rail({
  length,
  detail = 'high',
}: {
  /** total laid length along +x, centred on the group origin. */
  length: number;
  detail?: 'high' | 'low';
}) {
  const mats = useMemo(() => deviceMaterials(), []);
  const half = length / 2;

  const sleepers = useMemo(() => {
    const gap = RAIL.sleeperGap;
    const n = Math.max(2, Math.floor(length / gap) + 1);
    return { n, gap, first: -half + (length - (n - 1) * gap) / 2 };
  }, [length, half]);

  /* Teeth are drawn only where a camera could resolve them. At low detail,
     and along the far two thirds of a long lane, the rack reads as a ribbed
     strip anyway, so the strip is all that is built. */
  const teeth = useMemo(() => {
    if (detail !== 'high') return 0;
    return Math.min(220, Math.floor(length / RACK_PITCH));
  }, [detail, length]);

  const sleeperRef = useRef<THREE.InstancedMesh>(null);
  const toothRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const m = sleeperRef.current;
    if (!m) return;
    for (let i = 0; i < sleepers.n; i++) {
      dummy.position.set(sleepers.first + i * sleepers.gap, RAIL.sleeper[1] / 2, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [sleepers, dummy]);

  useLayoutEffect(() => {
    const m = toothRef.current;
    if (!m || !teeth) return;
    // teeth are laid from the near end outward — that is the stretch the
    // camera gets closest to on both sets
    const start = -half + RACK_PITCH * 0.5;
    for (let i = 0; i < teeth; i++) {
      dummy.position.set(start + i * RACK_PITCH, RAIL.top - RAIL.rackH * 0.35, RAIL.rackZ);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [teeth, half, dummy]);

  const sleeperGeo = useMemo(
    () => new THREE.BoxGeometry(RAIL.sleeper[2], RAIL.sleeper[1], RAIL.sleeper[0]),
    [],
  );
  const toothGeo = useMemo(
    () => new THREE.BoxGeometry(RACK_PITCH * 0.5, RAIL.rackH * 0.7, 0.028),
    [],
  );
  useEffect(
    () => () => {
      sleeperGeo.dispose();
      toothGeo.dispose();
    },
    [sleeperGeo, toothGeo],
  );

  const railY = RAIL.top - RAIL.headH / 2;

  return (
    <group>
      {/* sleepers */}
      <instancedMesh
        ref={sleeperRef}
        args={[sleeperGeo, mats.darkPlastic, sleepers.n]}
        castShadow
        receiveShadow
      />

      {/* the two rails */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={s}
          position={[0, railY, (s * RAIL.gauge) / 2]}
          castShadow
          receiveShadow
          material={mats.metal}
        >
          <boxGeometry args={[length, RAIL.headH, RAIL.headW]} />
        </mesh>
      ))}

      {/* the rack: a continuous web with the teeth instanced on top of it */}
      <mesh position={[0, RAIL.top - RAIL.rackH * 0.85, RAIL.rackZ]} material={mats.steel} receiveShadow>
        <boxGeometry args={[length, RAIL.rackH * 0.6, 0.030]} />
      </mesh>
      {teeth > 0 && (
        <instancedMesh ref={toothRef} args={[toothGeo, mats.steel, teeth]} castShadow />
      )}

      {/* end stops, and the limit switch each one strikes */}
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[s * (half - 0.03), 0, 0]}>
          <mesh position={[0, RAIL.top + 0.035, 0]} castShadow material={mats.metal}>
            <boxGeometry args={[0.03, 0.10, RAIL.gauge + 0.10]} />
          </mesh>
          {/* the rubber buffer on the face the carriage would meet */}
          <mesh position={[-s * 0.020, RAIL.top + 0.035, 0]} material={mats.darkPlastic}>
            <boxGeometry args={[0.012, 0.056, 0.09]} />
          </mesh>
          {/* limit switch on its bracket, wired back along the track */}
          <group position={[-s * 0.075, RAIL.top + 0.020, RAIL.gauge / 2 + 0.05]}>
            <mesh castShadow>
              <boxGeometry args={[0.052, 0.030, 0.024]} />
              <meshStandardMaterial color="#1e63b5" roughness={0.5} metalness={0.1} />
            </mesh>
            <mesh position={[0, -0.020, 0]} material={mats.metal}>
              <boxGeometry args={[0.062, 0.008, 0.034]} />
            </mesh>
            {/* actuator lever, pointing back up the track */}
            <mesh position={[-s * 0.030, 0.012, 0]} rotation={[0, 0, s * 0.5]} material={mats.steel}>
              <boxGeometry args={[0.038, 0.003, 0.010]} />
            </mesh>
          </group>
        </group>
      ))}

      {/* anchor feet, so the track is bolted to a floor rather than resting
          on it — one pair at each end and one in the middle */}
      {detail === 'high' &&
        ([-1, 0, 1] as const).map((f) =>
          ([-1, 1] as const).map((s) => (
            <mesh
              key={`${f}:${s}`}
              position={[f * (half - 0.25), 0.008, (s * (RAIL.gauge + 0.16)) / 2]}
              material={mats.metal}
              receiveShadow
            >
              <boxGeometry args={[0.09, 0.016, 0.07]} />
            </mesh>
          )),
        )}
    </group>
  );
}
