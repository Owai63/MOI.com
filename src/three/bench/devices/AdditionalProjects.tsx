import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AdditionalModel, ModelResources, type AdditionalSlug, type MotionRef } from '../../studio/Models';
import { studios, stepAt } from '../../studio/catalog';
import { sceneState } from '../../sceneState';
import { inspectionValue } from '../interaction';

/** The added projects live inside the same full-screen inspection renderer
 * as the original hardware. Scroll drives their demonstration until a reader
 * chooses a manual state in the overlay. */
export function AdditionalProject({ slug }: { slug: AdditionalSlug }) {
  const motion: MotionRef = useRef({ value: 0, time: 0, running: true });
  const phase = useRef(-1);
  const [value, setValue] = useState(0);
  useFrame(({ clock }, delta) => {
    const next = inspectionValue(sceneState.explode);
    motion.current.value = THREE.MathUtils.damp(motion.current.value, next, 9, Math.min(delta, 0.1));
    motion.current.time = clock.elapsedTime;
    const at = stepAt(next, studios[slug].steps);
    if (phase.current !== at) { phase.current = at; setValue(next); }
  }, -10);
  return <ModelResources><AdditionalModel slug={slug} motion={motion} value={value} /></ModelResources>;
}
