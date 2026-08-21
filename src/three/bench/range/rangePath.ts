/* ============================================================================
   rangePath — the case study's camera, and the timeline it runs on
   ----------------------------------------------------------------------------
   The shooting-range case study is the one project on this site whose subject
   is a PLACE rather than an object, so it does not get the turntable-and-
   explode treatment the other case studies use. It gets a lane, and a camera
   that walks it:

     0  the lane          stood behind the firing point, the whole run visible
     1  the console       down at the operator's laptop, where a command starts
     2  away              low beside the rail as the runner sets off
     3  the run           travelling alongside the carriage, downrange
     4  the controller    in tight on the case, which opens and separates
     5  back              turned around at the far end while the target returns

   Two of those shots are bolted to the carriage rather than to the room:
   `follow` scales the runner's own x into the station, so a tracking shot
   stays with the thing it is tracking however far the reader has scrubbed it.

   The timeline below is the whole choreography, expressed as keyframes
   against one scrubbed 0..1. Nothing here runs on a clock: scroll the page
   backwards and the target drives backwards, the case closes, and the command
   goes back into the console. That is the difference between a scene and a
   video of a scene.
   ========================================================================== */

import * as THREE from 'three';
import { LANE_RAIL_LEN, travelSpan, CAR } from './spec';

export const LANE_TRAVEL = travelSpan(LANE_RAIL_LEN);
/** x of the firing line — everything the operator does happens behind it. */
export const FIRING_X = -LANE_RAIL_LEN / 2 - 0.8;
/** x of the backstop face. */
export const BACKSTOP_X = LANE_RAIL_LEN / 2 + 1.4;
/** where the console table stands, off the lane's shoulder. */
export const CONSOLE: [number, number, number] = [FIRING_X - 0.35, 0, -1.25];

/** x of the carriage centre at 0..1 along the rail. */
export const runnerX = (at: number) => (at - 0.5) * LANE_TRAVEL;

export interface Shot {
  pos: [number, number, number];
  look: [number, number, number];
  /** 1 = the station travels with the carriage; 0 = it is fixed in the room. */
  follow?: number;
}

export const SHOTS: Shot[] = [
  /* 0 — the lane. High and behind the firing point, so the reader sees the
     whole length of the thing before anything happens on it. */
  {
    pos: [FIRING_X - 3.6, 2.30, 0.62],
    look: [2.0, 0.60, 0.0],
  },
  /* 1 — the console. Close enough to read the lane list on the screen, with
     the firing line and the parked runner beyond it. */
  {
    pos: [CONSOLE[0] - 0.98, 1.46, CONSOLE[2] - 0.98],
    look: [CONSOLE[0] + 0.26, 0.99, CONSOLE[2] + 0.14],
  },
  /* 2 — away. Down at deck height beside the rail: the wheels, the pinion in
     the rack, and the target going past the lens. */
  {
    pos: [-1.35, 0.52, 1.95],
    look: [0.15, 0.62, 0.0],
    follow: 1,
  },
  /* 3 — the run. A chase, from the firing-point side and above: the bay is
     only 2.6m to the wall, so there is no room to stand off a 1.7m target
     side-on and still hold it in a 32° frame. From behind it the lane itself
     supplies the distance, and the target is seen face-on as it goes. */
  {
    pos: [-3.2, 1.62, 1.25],
    look: [0.5, 0.80, 0.0],
    follow: 1,
  },
  /* 4 — the controller. In tight on the case as it opens and separates; the
     aim point sits above the deck because the parts travel up. */
  {
    pos: [1.30, 1.05, 1.55],
    look: [CAR.caseX + 0.02, 0.42, 0.02],
    follow: 1,
  },
  /* 5 — back. Turned around at the far end, watching the target run home to
     a firing point that is now the lit thing in the distance. */
  {
    pos: [BACKSTOP_X - 0.9, 1.62, 2.15],
    look: [-2.2, 0.85, 0.0],
  },
];

export const LAST_SHOT = SHOTS.length - 1;

/* --- sampling ------------------------------------------------------------ */

const a = new THREE.Vector3();
const b = new THREE.Vector3();

function station(i: number, at: number, out: THREE.Vector3, look: boolean) {
  const s = SHOTS[i];
  const src = look ? s.look : s.pos;
  const shift = (s.follow ?? 0) * runnerX(at);
  out.set(src[0] + shift, src[1], src[2]);
}

/** Interpolated camera pose at floating shot index `t`, with the carriage at
 *  `at`. Allocation-free: called every frame. */
export function sampleShot(
  t: number,
  at: number,
  outPos: THREE.Vector3,
  outLook: THREE.Vector3,
) {
  const clamped = THREE.MathUtils.clamp(t, 0, LAST_SHOT);
  const i = Math.floor(clamped);
  const j = Math.min(i + 1, LAST_SHOT);
  const f = clamped - i;
  // smoothstep, so the camera eases out of one framing and into the next
  const e = f * f * (3 - 2 * f);

  station(i, at, a, false);
  station(j, at, b, false);
  outPos.copy(a).lerp(b, e);

  station(i, at, a, true);
  station(j, at, b, true);
  outLook.copy(a).lerp(b, e);
}

/* ============================================================================
   The timeline
   ==========================================================================*/

interface Beat {
  /** scrubbed page progress this keyframe sits at. */
  p: number;
  shot: number;
  /** 0..1 along the rail. */
  runner: number;
  explode: number;
}

/* Held keyframes matter as much as moving ones. A shot that arrives and
   immediately leaves reads as a cut; the pairs of identical values below are
   where the camera stops and lets the reader look at something. */
const TIMELINE: Beat[] = [
  { p: 0.00, shot: 0, runner: 0.00, explode: 0 },
  { p: 0.14, shot: 0, runner: 0.00, explode: 0 },
  { p: 0.24, shot: 1, runner: 0.00, explode: 0 },
  { p: 0.34, shot: 1, runner: 0.02, explode: 0 },
  { p: 0.44, shot: 2, runner: 0.16, explode: 0 },
  { p: 0.53, shot: 2.4, runner: 0.36, explode: 0 },
  { p: 0.62, shot: 3, runner: 0.68, explode: 0 },
  { p: 0.71, shot: 3, runner: 0.87, explode: 0 },
  { p: 0.80, shot: 4, runner: 0.88, explode: 0.5 },
  { p: 0.89, shot: 4, runner: 0.88, explode: 1 },
  { p: 1.00, shot: 5, runner: 0.05, explode: 0 },
];

export interface RangeFrame {
  shot: number;
  runner: number;
  explode: number;
  /** index of the beat the reader is in, for the caption overlay. */
  beat: number;
}

const frame: RangeFrame = { shot: 0, runner: 0, explode: 0, beat: 0 };

/** Which caption belongs to each keyframe. Six captions, eleven keyframes:
 *  each beat holds across a pair, and the caption changes at the midpoint of
 *  the move between them — so the words arrive while the camera is still
 *  travelling, not after it has stopped. */
const CAPTION_OF: number[] = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5];

/** Evaluate the whole choreography at scrubbed progress `p`. Returns a shared
 *  object — read it, do not keep it. */
export function rangeAt(p: number): RangeFrame {
  const x = THREE.MathUtils.clamp(p, 0, 1);
  let i = 0;
  while (i < TIMELINE.length - 2 && x > TIMELINE[i + 1].p) i++;
  const A = TIMELINE[i];
  const B = TIMELINE[i + 1];
  const span = Math.max(1e-4, B.p - A.p);
  const f = THREE.MathUtils.clamp((x - A.p) / span, 0, 1);
  const e = f * f * (3 - 2 * f);

  frame.shot = THREE.MathUtils.lerp(A.shot, B.shot, e);
  frame.runner = THREE.MathUtils.lerp(A.runner, B.runner, e);
  frame.explode = THREE.MathUtils.lerp(A.explode, B.explode, e);
  frame.beat = CAPTION_OF[f < 0.5 ? i : i + 1];
  return frame;
}
