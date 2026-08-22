/* ============================================================================
   Keyboard — a real key field, for the price of three draw calls
   ----------------------------------------------------------------------------
   The laptop used to be a dark plane, with the note "one dark slab with a grid
   of separations reads correctly at bench distance". That was true while the
   camera stayed on the bench. It stopped being true the moment the camera sat
   down at the machine: at 600mm the keyboard is a quarter of the frame, and a
   flat rectangle there is the most obviously fake thing in the scene.

   Modelling it honestly costs less than it looks like it should:

   * every keycap is the SAME geometry at a different transform, so all
     seventy-odd are one InstancedMesh — one draw call of real geometry that
     catches the bench light and holds a highlight along each cap's taper
   * the legends are one transparent plane sitting at cap-top height. They
     cannot ride on the instanced caps without per-instance UVs, and they do
     not need to: every cap is the same height, so one plane lands on all of
     them
   * the backlight is one emissive plane UNDER the caps, so what the reader
     sees is light escaping around the keys — which is what a backlit keyboard
     looks like from anywhere except straight down

   Caps, legends and gaps all come from keyboardLayout.ts, so a key cannot
   drift away from the letter printed on it.
   ========================================================================== */

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { keyLegendTexture } from '../textures';
import { KEYBOARD, keySlots } from './keyboardLayout';

/** One keycap: a shallow frustum, wider at the base than at the top.
 *
 *  An extruded rounded rectangle would be nicer and costs twenty times as much
 *  for a shape that is twenty pixels tall. A four-segment cylinder IS a box;
 *  giving it two different radii makes it a box with tapered sides, which at
 *  this size is the whole read — the taper is what catches the bench light
 *  along the edge of every key and separates one cap from the next.
 */
function capGeometry() {
  const g = new THREE.CylinderGeometry(0.66, 0.72, 1, 4);
  // put the flats on the axes rather than the corners
  g.rotateY(Math.PI / 4);
  // normalise so the BASE is exactly one unit across, since that is the
  // dimension the layout's pitch is measured in
  const unit = 1 / (0.72 * Math.SQRT2);
  g.scale(unit, 1, unit);
  return g;
}

/** Where the backlight starts before the first frame damps it anywhere. */
const INITIAL_BACKLIGHT = 0.5;

export function Keyboard({
  /** field size in metres. */
  width,
  depth,
  /** cap height above the deck. */
  height = 0.0024,
  /** How lit the backlight is, 0..1.
   *
   *  A ref rather than a number, following the same pattern as the devices'
   *  `activeRef`: the owner writes it from its own frame loop and this damps
   *  towards it. Passed as a plain prop it would be sampled once at mount and
   *  then hold that value forever, which is exactly the bug it looks like it
   *  is not — the keyboard would light up for whichever chapter happened to be
   *  on screen when the laptop was first built, and never change again. */
  level,
}: {
  width: number;
  depth: number;
  height?: number;
  level?: React.MutableRefObject<number>;
}) {
  const slots = useMemo(() => keySlots(KEYBOARD), []);
  const geometry = useMemo(capGeometry, []);
  const legend = useMemo(() => keyLegendTexture(KEYBOARD), []);
  const caps = useRef<THREE.InstancedMesh>(null);

  const capMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#131519',
        // laptop caps are a fine matte texture, not a gloss
        roughness: 0.72,
        metalness: 0.06,
      }),
    [],
  );

  const legendMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: legend,
        transparent: true,
        /* On a backlit board the legend is a hole cut through the cap with the
           light behind it, not ink — so it is emissive, and the glyph texture
           is left white for the material to tint. */
        color: '#0b0d10',
        emissive: new THREE.Color('#cfe4ff'),
        emissiveMap: legend,
        emissiveIntensity: INITIAL_BACKLIGHT,
        toneMapped: false,
        roughness: 0.8,
        depthWrite: false,
      }),
    [legend],
  );

  const backlightMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#04060a',
        emissive: new THREE.Color('#7fb4ff'),
        emissiveIntensity: INITIAL_BACKLIGHT * 0.45,
        toneMapped: false,
        roughness: 0.6,
      }),
    [],
  );

  useFrame((_, delta) => {
    if (!level) return;
    const d = Math.min(delta, 1 / 30);
    const want = level.current;
    legendMaterial.emissiveIntensity = THREE.MathUtils.damp(
      legendMaterial.emissiveIntensity,
      want,
      3,
      d,
    );
    backlightMaterial.emissiveIntensity = THREE.MathUtils.damp(
      backlightMaterial.emissiveIntensity,
      want * 0.45,
      3,
      d,
    );
  });

  useLayoutEffect(() => {
    const mesh = caps.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    slots.forEach((s, i) => {
      dummy.position.set((s.cx - 0.5) * width, height / 2, (s.cy - 0.5) * depth);
      dummy.scale.set(s.w * width, height, s.h * depth);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [slots, width, depth, height]);

  useEffect(
    () => () => {
      geometry.dispose();
      capMaterial.dispose();
      legendMaterial.dispose();
      backlightMaterial.dispose();
    },
    [geometry, capMaterial, legendMaterial, backlightMaterial],
  );

  return (
    <group>
      {/* the well the keys sit in, a shade below the deck */}
      <mesh position={[0, -0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width + 0.007, depth + 0.007]} />
        <meshStandardMaterial color="#07080a" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* the backlight, escaping around the caps */}
      <mesh
        position={[0, -0.0002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={backlightMaterial}
      >
        <planeGeometry args={[width, depth]} />
      </mesh>

      {/* Shadows off: seventy-six 2.4mm slabs contribute nothing a shadow map
          at this resolution can resolve, and they would be paid for on every
          frame the bench light is on. */}
      <instancedMesh ref={caps} args={[geometry, capMaterial, slots.length]} receiveShadow />

      {/* legends, sitting on the cap tops */}
      <mesh
        position={[0, height + 0.00014, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={legendMaterial}
      >
        <planeGeometry args={[width, depth]} />
      </mesh>
    </group>
  );
}
