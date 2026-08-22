/* ============================================================================
   cameraRig — how the camera actually moves, once it knows where to be
   ----------------------------------------------------------------------------
   cameraPath.ts decides the pose. This decides the MOTION, and the two are
   separate because they fail in different ways: a wrong pose is a bad
   photograph, a wrong motion is motion sickness.

   Three things live here.

   1. A critically damped spring, rather than the exponential `damp` this scene
      used to run on. `damp` has no memory of velocity: reverse the scroll
      mid-move and the camera's speed discontinuously flips sign, which is
      exactly the "snap" that a scroll-driven camera is usually accused of. A
      spring carries velocity across the frame, so a reversal decelerates
      through zero and comes back. It is also unconditionally stable at any
      timestep, which the implicit formulation below is chosen for — a dropped
      frame during a fast scroll must not be able to overshoot.

   2. A room clamp. The walkway makes the authored path safe, but pointer
      parallax, the column frame-shift and the portrait fallback all nudge the
      camera off it afterwards. This is the backstop that keeps the result
      inside the room and out of the bench, so no combination of those can put
      the camera behind the table.

   3. Bank and float. A few tenths of a degree of roll into a lateral move, and
      a slow two-axis drift, scaled down as the camera closes on an object.
      Nothing about them is legible on its own; together they are most of the
      difference between "a camera" and "a transform being interpolated".
   ========================================================================== */

import * as THREE from 'three';
import { BENCH, SHELL } from './layout';

/* --- critically damped spring -------------------------------------------- */

const AXES = ['x', 'y', 'z'] as const;

/**
 * Implicit-Euler critically damped spring over a Vector3.
 *
 * Solving implicitly rather than explicitly is what makes this safe to drive
 * from a scroll handler: the explicit form goes unstable once `dt * omega`
 * approaches 1, which is a 60Hz camera meeting a 15Hz frame.
 */
export class Spring3 {
  readonly value = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();

  /** @param omega natural frequency, rad/s. Higher is tighter. */
  step(target: THREE.Vector3, omega: number, dt: number) {
    const f = 1 + 2 * dt * omega;
    const oo = omega * omega;
    const hoo = dt * oo;
    const hhoo = dt * hoo;
    const detInv = 1 / (f + hhoo);

    for (let i = 0; i < 3; i++) {
      const k = AXES[i];
      const x = this.value[k];
      const v = this.velocity[k];
      const t = target[k];
      this.value[k] = (f * x + dt * v + hhoo * t) * detInv;
      this.velocity[k] = (v + hoo * (t - x)) * detInv;
    }
  }

  /** Jump to a pose with no residual motion — used when the loop resumes. */
  snap(target: THREE.Vector3) {
    this.value.copy(target);
    this.velocity.set(0, 0, 0);
  }
}

/** The scalar version, for field of view. */
export class Spring1 {
  value = 0;
  velocity = 0;

  step(target: number, omega: number, dt: number) {
    const f = 1 + 2 * dt * omega;
    const oo = omega * omega;
    const hoo = dt * oo;
    const hhoo = dt * hoo;
    const detInv = 1 / (f + hhoo);
    const x = this.value;
    const v = this.velocity;
    this.value = (f * x + dt * v + hhoo * target) * detInv;
    this.velocity = (v + hoo * (target - x)) * detInv;
  }

  snap(target: number) {
    this.value = target;
    this.velocity = 0;
  }
}

/* --- room clamp ---------------------------------------------------------- */

/* The shell, inset by enough that the camera's near plane never touches a
   wall. Derived from SHELL rather than typed again, so moving a wall moves the
   cage with it — the failure mode of two copies of these numbers is a camera
   that stops short of nothing, or one that ends up outside the building. */
const INSET = 0.28;
const ROOM_MIN_X = SHELL.minX + INSET;
const ROOM_MAX_X = SHELL.maxX - INSET;
const ROOM_MIN_Z = SHELL.frontZ + INSET;
const ROOM_MAX_Z = SHELL.backZ - INSET;
const ROOM_MIN_Y = BENCH.floorY + 0.32;
const ROOM_MAX_Y = SHELL.ceilingY - INSET;

/* The bench, grown by a body's width. Below the benchtop this is solid: there
   is a desk, a steel frame and a wall there. Above it, the camera is allowed
   in — leaning over your own bench to look at something is the entire point of
   the close chapters, and refusing it would push every board shot back to
   arm's length. */
const BENCH_MIN_X = -1.42;
const BENCH_MAX_X = 1.42;
const BENCH_MIN_Z = -0.62;
const BENCH_MAX_Z = 0.62;
/** Above this height the bench is no longer an obstacle, only furniture. */
const BENCH_CLEAR_Y = 0.16;

/**
 * Push `p` back into the walkable volume. Mutates in place.
 *
 * The bench is resolved along whichever axis needs the smaller correction, so
 * a camera drifting in from the front is pushed back out the front rather than
 * teleported round the end.
 */
export function clampToRoom(p: THREE.Vector3) {
  p.x = THREE.MathUtils.clamp(p.x, ROOM_MIN_X, ROOM_MAX_X);
  p.y = THREE.MathUtils.clamp(p.y, ROOM_MIN_Y, ROOM_MAX_Y);
  p.z = THREE.MathUtils.clamp(p.z, ROOM_MIN_Z, ROOM_MAX_Z);

  if (p.y >= BENCH_CLEAR_Y) return;
  if (p.x < BENCH_MIN_X || p.x > BENCH_MAX_X) return;
  if (p.z < BENCH_MIN_Z || p.z > BENCH_MAX_Z) return;

  // inside the bench: leave by the nearest face
  const outFront = BENCH_MAX_Z - p.z;
  const outBack = p.z - BENCH_MIN_Z;
  const outRight = BENCH_MAX_X - p.x;
  const outLeft = p.x - BENCH_MIN_X;
  const up = BENCH_CLEAR_Y - p.y;

  const least = Math.min(outFront, outBack, outRight, outLeft, up);
  if (least === up) p.y = BENCH_CLEAR_Y;
  else if (least === outFront) p.z = BENCH_MAX_Z;
  else if (least === outBack) p.z = BENCH_MIN_Z;
  else if (least === outRight) p.x = BENCH_MAX_X;
  else p.x = BENCH_MIN_X;
}

/* --- portrait framing ---------------------------------------------------- */

/** The aspect every field of view in cameraPath.ts was authored against. */
export const REFERENCE_ASPECT = 1.5;

/** Widest vertical field of view a portrait viewport is allowed to open to.
 *  Past this the perspective distortion at the edges costs more than the
 *  framing gains. */
const MAX_PORTRAIT_FOV = 64;

/**
 * The vertical field of view that shows the same WIDTH as `fov` did at the
 * reference aspect, and how much extra standoff is still owed after the
 * widening was capped.
 *
 * Three's `fov` is vertical, so a portrait viewport shows dramatically less
 * horizontally at the same standoff. The previous fix walked the camera
 * backwards, which is why the phone layout ended up behind the bench and, on
 * the room chapters, outside the building. Opening the lens keeps the
 * authored standpoint exactly where it was put and simply shows more of the
 * room — which is what a wider lens is for.
 */
export function portraitFraming(fov: number, aspect: number): { fov: number; pull: number } {
  if (aspect >= REFERENCE_ASPECT) return { fov, pull: 1 };

  const half = THREE.MathUtils.degToRad(fov) / 2;
  const wantHalf = Math.atan((Math.tan(half) * REFERENCE_ASPECT) / Math.max(0.35, aspect));
  const cappedHalf = Math.min(wantHalf, THREE.MathUtils.degToRad(MAX_PORTRAIT_FOV) / 2);

  return {
    fov: THREE.MathUtils.radToDeg(cappedHalf * 2),
    // whatever the lens could not give, taken as standoff instead
    pull: Math.min(1.45, Math.tan(wantHalf) / Math.tan(cappedHalf)),
  };
}

/* --- float --------------------------------------------------------------- */

/**
 * A slow, non-repeating two-axis drift, written into `out`.
 *
 * Deliberately not noise: three incommensurable sines never loop inside a
 * reading session but stay bounded and differentiable, so this can be added to
 * a spring target without fighting it.
 */
export function breathe(t: number, amount: number, out: THREE.Vector3) {
  out.set(
    (Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.73 + 1.1) * 0.4) * amount,
    (Math.sin(t * 0.41 + 2.3) * 0.5 + Math.sin(t * 0.19) * 0.5) * amount * 0.7,
    Math.sin(t * 0.27 + 0.6) * amount * 0.5,
  );
}
