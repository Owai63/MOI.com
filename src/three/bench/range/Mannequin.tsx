/* ============================================================================
   Mannequin — the training target that rides on the runner
   ----------------------------------------------------------------------------
   This is what the machine exists to move: a full-height training figure
   bolted to the carriage deck, so the whole point of the project — "a target
   that goes where the operator tells it to, reliably, over the air" — is one
   thing you can watch happen.

   Deliberately built as EQUIPMENT rather than as a person: moulded composite
   segments on a visible steel armature, a stencilled scoring zone on the
   torso, a serial band on the footplate. It is a piece of range hardware that
   happens to be human-shaped, which is what the real ones are, and it keeps
   the scene about the engineering.

   The figure faces -z, the direction the firing point is in.
   ========================================================================== */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Shell } from '../parts/primitives';
import { MAN } from './spec';

/** Proportions as a fraction of overall height, so the figure stays coherent
 *  if the scale ever changes. */
const P = {
  foot: 0.02,
  legTop: 0.50,
  pelvis: 0.54,
  chest: 0.86,
  shoulder: 0.83,
  neck: 0.88,
  head: 0.95,
} as const;

export function Mannequin({
  height = MAN.height,
  yaw = 0,
  detail = 'high',
}: {
  height?: number;
  /** rotation about y, radians — which way the figure faces. */
  yaw?: number;
  detail?: 'high' | 'low';
}) {
  const H = height;

  /* Materials are owned here rather than pulled from deviceMaterials(): the
     figure is not made of any of the bench's substances. Moulded composite is
     chalky and almost matte, and it has to hold its silhouette against a dark
     backstop without going shiny under the range lights. */
  const mats = useMemo(() => {
    const composite = new THREE.MeshStandardMaterial({
      /* Dark chalky grey. A pale figure standing a metre under a work light
         clips to a white silhouette, and a blown-out figure is the one thing
         in this scene that would stop reading as equipment; the stencilled
         scoring zone is what carries the shape instead. */
      color: '#444951',
      roughness: 0.95,
      metalness: 0.02,
    });
    const armature = new THREE.MeshStandardMaterial({
      color: '#2a2e34',
      roughness: 0.55,
      metalness: 0.6,
    });
    const marking = new THREE.MeshStandardMaterial({
      color: '#c8542a',
      roughness: 0.9,
      metalness: 0,
    });
    const plate = new THREE.MeshStandardMaterial({
      color: '#3b4046',
      roughness: 0.7,
      metalness: 0.45,
    });
    return { composite, armature, marking, plate };
  }, []);

  // one geometry per repeated element, shared between left and right
  const scoring = useMemo(() => new THREE.RingGeometry(H * 0.055, H * 0.068, 28), [H]);

  useEffect(
    () => () => {
      scoring.dispose();
      for (const m of Object.values(mats)) m.dispose();
    },
    [scoring, mats],
  );

  return (
    <group rotation={[0, yaw, 0]}>
      {/* --- footplate and the post it stands on ------------------------- */}
      <mesh position={[0, H * 0.008, 0]} castShadow receiveShadow material={mats.plate}>
        <boxGeometry args={[H * 0.20, H * 0.016, H * 0.16]} />
      </mesh>
      {/* stencilled asset number on the plate */}
      <mesh position={[0, H * 0.0165, H * 0.05]} rotation={[-Math.PI / 2, 0, 0]} material={mats.marking}>
        <planeGeometry args={[H * 0.10, H * 0.012]} />
      </mesh>
      {/* the mast: the figure is a shell on a steel spine, and the spine is
          what actually takes the load */}
      <mesh position={[0, H * 0.27, -H * 0.012]} material={mats.armature}>
        <boxGeometry args={[H * 0.026, H * 0.52, H * 0.026]} />
      </mesh>

      {/* --- legs -------------------------------------------------------- */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * H * 0.048, 0, 0]}>
          {/* thigh + shin as one tapered segment each, jointed at the knee */}
          <mesh position={[0, H * 0.36, 0]} castShadow material={mats.composite}>
            <cylinderGeometry args={[H * 0.036, H * 0.030, H * 0.28, 12]} />
          </mesh>
          <mesh position={[0, H * 0.13, 0.002]} castShadow material={mats.composite}>
            <cylinderGeometry args={[H * 0.030, H * 0.024, H * 0.24, 12]} />
          </mesh>
          {/* knee collar, so the join reads as an assembly and not a bend */}
          <mesh position={[0, H * 0.245, 0]} material={mats.armature}>
            <cylinderGeometry args={[H * 0.033, H * 0.033, H * 0.016, 12]} />
          </mesh>
          {/* boot */}
          <mesh position={[0, H * 0.022, H * 0.012]} castShadow material={mats.plate}>
            <boxGeometry args={[H * 0.046, H * 0.028, H * 0.078]} />
          </mesh>
        </group>
      ))}

      {/* --- pelvis and torso -------------------------------------------- */}
      <Shell
        size={[H * 0.148, H * 0.075, H * 0.086]}
        radius={H * 0.022}
        segments={2}
        material={mats.composite}
        position={[0, H * P.legTop + H * 0.028, 0]}
        castShadow
      />
      <Shell
        size={[H * 0.176, H * 0.28, H * 0.098]}
        radius={H * 0.030}
        segments={2}
        material={mats.composite}
        position={[0, H * 0.685, 0]}
        castShadow
      />
      {/* the stencilled scoring zone, on the front face */}
      <mesh position={[0, H * 0.70, -H * 0.050]} rotation={[0, Math.PI, 0]} geometry={scoring} material={mats.marking} />
      <mesh position={[0, H * 0.70, -H * 0.0505]} rotation={[0, Math.PI, 0]} material={mats.marking}>
        <circleGeometry args={[H * 0.012, 16]} />
      </mesh>

      {/* --- shoulders, arms --------------------------------------------- */}
      <mesh
        position={[0, H * P.shoulder, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        material={mats.composite}
      >
        <cylinderGeometry args={[H * 0.040, H * 0.040, H * 0.212, 14]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * H * 0.108, H * P.shoulder, 0]} rotation={[0, 0, s * 0.10]}>
          <mesh position={[0, -H * 0.09, 0]} castShadow material={mats.composite}>
            <cylinderGeometry args={[H * 0.030, H * 0.024, H * 0.175, 12]} />
          </mesh>
          <mesh position={[0, -H * 0.185, 0]} material={mats.armature}>
            <cylinderGeometry args={[H * 0.026, H * 0.026, H * 0.014, 12]} />
          </mesh>
          <mesh position={[0, -H * 0.265, H * 0.006]} castShadow material={mats.composite}>
            <cylinderGeometry args={[H * 0.024, H * 0.020, H * 0.16, 12]} />
          </mesh>
        </group>
      ))}

      {/* --- neck and head ------------------------------------------------ */}
      <mesh position={[0, H * P.neck, 0]} material={mats.armature}>
        <cylinderGeometry args={[H * 0.020, H * 0.020, H * 0.030, 12]} />
      </mesh>
      <Shell
        size={[H * 0.072, H * 0.096, H * 0.082]}
        radius={H * 0.030}
        segments={3}
        material={mats.composite}
        position={[0, H * P.head, 0]}
        castShadow
      />

      {/* --- the bracket that bolts the figure to the carriage ------------ */}
      {detail === 'high' && (
        <group>
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[s * H * 0.062, H * 0.05, -H * 0.03]}
              rotation={[0.5, 0, 0]}
              material={mats.armature}
            >
              <boxGeometry args={[H * 0.012, H * 0.11, H * 0.010]} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
