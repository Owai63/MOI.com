/* ============================================================================
   useScreenProgram — run a console program onto a texture
   ----------------------------------------------------------------------------
   Owns one canvas and its CanvasTexture, and redraws whichever program is
   currently active.

   Two things are deliberate here:

   * It only draws while a program is active. A canvas of this size costs a
     full texture upload per redraw, and there is no reason to pay that while
     the reader is three chapters away from the screen showing it.
   * It redraws at a fixed low rate rather than every frame. Consoles do not
     animate at 60fps — the slight stutter is what a real dashboard looks
     like — and it keeps the upload cost bounded regardless of frame rate.
   ========================================================================== */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ScreenProgram } from './programs';

/* Consoles do not animate at 60fps — the slight stutter is what a real
   dashboard looks like — and every redraw here costs a full texture upload of
   the whole canvas, on the main thread, which is the kind of periodic hitch a
   reader feels as a scroll stutter rather than as a slow frame. At 1024x678
   RGBA that is ~2.8MB per upload; ten a second is a bill worth keeping an eye
   on, and twelve bought nothing visible. */
const REDRAW_HZ = 10;

export function useScreenProgram(
  program: ScreenProgram | null,
  width: number,
  height: number,
) {
  const surface = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    // something neutral before the first draw, so the panel is never white
    ctx.fillStyle = '#070a0f';
    ctx.fillRect(0, 0, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, ctx, texture };
  }, [width, height]);

  useEffect(() => () => surface.texture.dispose(), [surface]);

  const startedAt = useRef(0);
  const lastDraw = useRef(-1);
  const lastId = useRef<string | null>(null);

  useFrame((state) => {
    if (!program) {
      lastId.current = null;
      return;
    }
    const now = state.clock.elapsedTime;

    // a program that has just come on screen starts from its own zero, so the
    // rollout always begins at the beginning rather than mid-flight
    if (lastId.current !== program.id) {
      lastId.current = program.id;
      startedAt.current = now;
      lastDraw.current = -1;
    }

    if (now - lastDraw.current < 1 / REDRAW_HZ) return;
    lastDraw.current = now;

    program.draw(surface.ctx, now - startedAt.current, width, height);
    surface.texture.needsUpdate = true;
  });

  return surface.texture;
}
