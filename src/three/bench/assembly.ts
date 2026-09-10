/* ============================================================================
   assembly — one displacement model for both device animations
   ----------------------------------------------------------------------------
   Every device is a list of named parts, and every part carries two things:
   where it rests, and the direction it travels when the assembly comes apart.

   Those two numbers cover both animations the site needs:

     build   0 → 1   parts fly IN along -out and fade up   (bench: "it appears
                     and starts working" as a chapter comes into view)
     explode 0 → 1   parts fly OUT along +out, held apart  (case study: the
                     device separates so the internals can be read)

   Running them off one vector means an exploded part always retraces the path
   it arrived on, which is what makes the two states feel like the same object
   rather than two effects bolted to the same mesh.
   ========================================================================== */

import { useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { inspectionValue } from './interaction';
import { sceneState } from '../sceneState';

export interface PartSpec {
  /** rest position in the device's local space. */
  pos: [number, number, number];
  /** direction and distance travelled when separated. */
  out: [number, number, number];
  /** 0..1 arrival order — later parts land last. */
  delay?: number;
  /** radians added to the part's own yaw at full separation. */
  twist?: number;
  /** How much of the page's explode this part takes, 0..1 (default 1).
   *  Set to 0 for scenery that a device is mounted ON rather than made of —
   *  the range rail does not fly apart when the case on it opens up. */
  explode?: number;
}

/** How much further out a part sits before it has been built, relative to its
 *  exploded distance. Slightly over 1 so the entrance reads as "flown in from
 *  off-stage" rather than "grown from the exploded pose". */
const ENTRY_REACH = 1.55;

export interface AssemblyApi {
  /** ref callback for part index i. */
  bind: (i: number) => (el: THREE.Object3D | null) => void;
  /** 0..1, how alive the device is this frame — read for LEDs and motion. */
  live: React.MutableRefObject<number>;
}

/**
 * Drives a device's parts from the shared scene state.
 *
 * @param parts      one entry per part, in the order they are bound
 * @param activeRef  0..1 gate for THIS device (a bench device is only built
 *                   while its chapter is on screen; the inspected device is
 *                   always 1)
 */
export function useAssembly(
  parts: PartSpec[],
  activeRef: React.MutableRefObject<number>,
): AssemblyApi {
  const items = useRef<(THREE.Object3D | null)[]>([]);
  const live = useRef(0);

  // Pre-resolve the specs into flat arrays so the frame loop never touches an
  // object literal or allocates. With ~40 parts on screen this matters.
  const table = useMemo(() => {
    const n = parts.length;
    const px = new Float32Array(n);
    const py = new Float32Array(n);
    const pz = new Float32Array(n);
    const ox = new Float32Array(n);
    const oy = new Float32Array(n);
    const oz = new Float32Array(n);
    const delay = new Float32Array(n);
    const twist = new Float32Array(n);
    const ex = new Float32Array(n);
    const restYaw = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = parts[i];
      px[i] = p.pos[0];
      py[i] = p.pos[1];
      pz[i] = p.pos[2];
      ox[i] = p.out[0];
      oy[i] = p.out[1];
      oz[i] = p.out[2];
      delay[i] = p.delay ?? 0;
      twist[i] = p.twist ?? 0;
      ex[i] = p.explode ?? 1;
      restYaw[i] = Number.NaN; // captured on first frame from the JSX rotation
    }
    return { n, px, py, pz, ox, oy, oz, delay, twist, ex, restYaw };
  }, [parts]);

  const bind = useCallback(
    (i: number) => (el: THREE.Object3D | null) => {
      items.current[i] = el;
    },
    [],
  );

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1);
    const active = activeRef.current;

    // `build` is per-device: the shared build progress scaled by whether this
    // device is the one on stage. Damped so a chapter change reads as the old
    // device folding away while the new one assembles.
    /* A solo stage (either case-study set) is always fully built: the page
       has one subject and no chapter bands to fade it in and out of. */
    const solo = sceneState.stage !== 'bench';
    const targetBuild = solo ? 1 : sceneState.build * active;
    live.current = sceneState.snap
      ? targetBuild
      : THREE.MathUtils.damp(live.current, targetBuild, 7.5, d);

    const build = live.current;
    const explode = solo ? inspectionValue(sceneState.explode) : 0;
    if (!solo && active === 0 && build < 0.0001) {
      // Preserve every model; skip transform/material work while it is hidden.
      for (const item of items.current) if (item) item.visible = false;
      return;
    }

    for (let i = 0; i < table.n; i++) {
      const el = items.current[i];
      if (!el) continue;

      if (Number.isNaN(table.restYaw[i])) table.restYaw[i] = el.rotation.y;

      // staggered local build: parts with a later delay arrive later
      const dl = table.delay[i];
      const local = THREE.MathUtils.clamp((build - dl * 0.35) / 0.65, 0, 1);
      // ease-out-back-ish landing without the overshoot going through the mesh
      const eased = 1 - Math.pow(1 - local, 3);

      const spread = (1 - eased) * ENTRY_REACH + explode * table.ex[i];

      el.position.set(
        table.px[i] + table.ox[i] * spread,
        table.py[i] + table.oy[i] * spread,
        table.pz[i] + table.oz[i] * spread,
      );
      el.rotation.y = table.restYaw[i] + table.twist[i] * spread;
      el.visible = eased > 0.004;

      // Parts fade as they fly out on entry; on the case study they stay
      // solid, because an exploded view that dims is just a mess.
      const op = solo ? 1 : eased;
      applyOpacity(el, op);
    }
  });

  return { bind, live };
}

/** Walk a part and set opacity on its materials. Materials are shared between
 *  parts, so this writes the *maximum* requested opacity per frame and lets
 *  the last writer win — acceptable because only one device fades at a time. */
const lastOpacity = new WeakMap<THREE.Object3D, number>();

function applyOpacity(root: THREE.Object3D, opacity: number) {
  // Avoid traversing a part's entire subtree every frame when its visual
  // opacity has not meaningfully changed.
  const next = opacity >= 0.999 ? 1 : Math.round(opacity * 100) / 100;
  if (lastOpacity.get(root) === next) return;
  lastOpacity.set(root, next);

  if (next === 1) {
    root.traverse(setOpaque);
    return;
  }
  fadeTarget = next;
  root.traverse(setFaded);
}

let fadeTarget = 1;

function setOpaque(o: THREE.Object3D) {
  const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[];
  if (!m) return;
  if (Array.isArray(m)) {
    for (const mm of m) if (mm.opacity !== 1) (mm.opacity = 1), (mm.transparent = false);
  } else if (m.opacity !== 1) {
    m.opacity = 1;
    m.transparent = false;
  }
}

function setFaded(o: THREE.Object3D) {
  const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[];
  if (!m) return;
  if (Array.isArray(m)) {
    for (const mm of m) (mm.transparent = true), (mm.opacity = fadeTarget);
  } else {
    m.transparent = true;
    m.opacity = fadeTarget;
  }
}
