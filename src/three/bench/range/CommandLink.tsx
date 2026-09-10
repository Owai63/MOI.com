/* ============================================================================
   CommandLink — the operator's commands, crossing the air to the runner
   ----------------------------------------------------------------------------
   The chapter's claim is that a target moves because a packet reached it. So
   the packets are drawn: a shallow arc from the console out to the whip on
   the case, with command frames running along it and the occasional
   acknowledgement coming back the other way.

   The far end of the arc is the antenna on a moving carriage, so the curve is
   rebuilt every frame. That is deliberately cheap — three control points, a
   quadratic evaluated at a fixed number of samples, no allocation after
   mount. A link that stayed straight while the target ran away from it would
   undo the whole point of drawing it.
   ========================================================================== */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ANTENNA_TIP } from './TargetRunner';

const ARC_SAMPLES = 30;

export function CommandLink({
  /** console end of the link, in the lane's own space. */
  from,
  atRef,
  travel,
  powerRef,
  color = '#f6a250',
  ackColor = '#3fe0d0',
  count = 5,
  /** how much the arc bows upward, as a fraction of its span. */
  lift = 0.20,
  detail = 'high',
}: {
  from: [number, number, number];
  atRef: React.MutableRefObject<number>;
  travel: number;
  powerRef: React.MutableRefObject<number>;
  color?: string;
  ackColor?: string;
  count?: number;
  lift?: number;
  detail?: 'high' | 'low';
}) {
  const packets = useRef<THREE.Group>(null);
  const acks = useRef<THREE.Group>(null);

  const a = useMemo(() => new THREE.Vector3(...from), [from]);
  const b = useMemo(() => new THREE.Vector3(), []);
  const c = useMemo(() => new THREE.Vector3(), []);
  const p = useMemo(() => new THREE.Vector3(), []);

  const dotGeo = useMemo(() => new THREE.SphereGeometry(0.028, 8, 6), []);
  const cmdMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color],
  );
  const ackMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(ackColor),
        transparent: true,
        opacity: 0,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [ackColor],
  );
  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(ARC_SAMPLES * 3), 3),
    );
    return g;
  }, []);
  const lineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        toneMapped: false,
        depthWrite: false,
      }),
    [color],
  );

  /* The arc is a plain THREE.Line rather than a <line> element: r3f's
     intrinsic would be reconstructed whenever this component re-renders, and
     the geometry it carries is written to every frame. */
  const arc = useMemo(() => new THREE.Line(lineGeo, lineMat), [lineGeo, lineMat]);

  useEffect(
    () => () => {
      dotGeo.dispose();
      cmdMat.dispose();
      ackMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
    },
    [dotGeo, cmdMat, ackMat, lineGeo, lineMat],
  );

  useFrame((state, delta) => {
    const power = powerRef.current;
    const d = Math.min(delta, 0.1);

    // the far end: the whip on the case, wherever the carriage has got to
    b.set(ANTENNA_TIP[0] + (atRef.current - 0.5) * travel, ANTENNA_TIP[1], ANTENNA_TIP[2]);
    // control point: the midpoint, lifted
    c.copy(a).add(b).multiplyScalar(0.5);
    c.y += a.distanceTo(b) * lift;

    const t = state.clock.elapsedTime;

    {
      const pos = lineGeo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < ARC_SAMPLES; i++) {
        quad(a, c, b, i / (ARC_SAMPLES - 1), p);
        arr[i * 3] = p.x;
        arr[i * 3 + 1] = p.y;
        arr[i * 3 + 2] = p.z;
      }
      pos.needsUpdate = true;
      lineGeo.computeBoundingSphere();
      lineMat.opacity = THREE.MathUtils.damp(lineMat.opacity, power * 0.1, 3, d);
    }

    /* Command frames run outward. They are not evenly spread: a burst of
       three close together and then a gap reads like framed traffic rather
       than like a string of fairy lights. */
    if (packets.current) {
      cmdMat.opacity = power * 0.9;
      for (let i = 0; i < count; i++) {
        const dot = packets.current.children[i] as THREE.Mesh;
        if (!dot) continue;
        const u = (t * 0.62 + i * 0.055 + Math.floor(i / 3) * 0.34) % 1;
        quad(a, c, b, u, p);
        dot.position.copy(p);
        const fade = Math.sin(u * Math.PI);
        dot.scale.setScalar(0.5 + fade * 0.9);
      }
    }

    /* Acknowledgements come back, slower and fewer — the retry logic in the
       chapter, running the other way down the same link. */
    if (acks.current) {
      ackMat.opacity = power * 0.75;
      for (let i = 0; i < acks.current.children.length; i++) {
        const dot = acks.current.children[i] as THREE.Mesh;
        const u = 1 - ((t * 0.38 + i * 0.5) % 1);
        quad(a, c, b, u, p);
        dot.position.copy(p);
        dot.scale.setScalar(0.4 + Math.sin(u * Math.PI) * 0.6);
      }
    }
  });

  return (
    <group>
      <primitive object={arc} />
      <group ref={packets}>
        {Array.from({ length: count }).map((_, i) => (
          <mesh key={i} geometry={dotGeo} material={cmdMat} />
        ))}
      </group>
      {detail === 'high' && (
        <group ref={acks}>
          {Array.from({ length: 2 }).map((_, i) => (
            <mesh key={i} geometry={dotGeo} material={ackMat} />
          ))}
        </group>
      )}
    </group>
  );
}

/** Quadratic Bézier, written into `out`. */
function quad(
  a: THREE.Vector3,
  c: THREE.Vector3,
  b: THREE.Vector3,
  t: number,
  out: THREE.Vector3,
) {
  const s = 1 - t;
  out.set(
    s * s * a.x + 2 * s * t * c.x + t * t * b.x,
    s * s * a.y + 2 * s * t * c.y + t * t * b.y,
    s * s * a.z + 2 * s * t * c.z + t * t * b.z,
  );
  return out;
}
