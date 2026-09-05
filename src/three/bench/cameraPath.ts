/* ============================================================================
   cameraPath — the walk the whole page is choreographed against
   ----------------------------------------------------------------------------
   The reader is a person moving through a lab, not a camera on a rail through
   the middle of the furniture.

   That distinction drives the whole design here. The previous pass placed each
   chapter's camera by pushing a fixed distance out along a direction from the
   subject, and then travelled between those points in a straight line. Both
   halves of that are wrong for a room:

     · a fixed standoff from a floor-standing subject puts the camera outside
       the building — the range chapter's 5.2m standoff resolved to z = -2.2,
       which is behind the bench and inside the wall
     · a straight line between two points on opposite sides of a room passes
       through everything between them, which is why the move read as sliding
       through the bench rather than walking around it

   So the camera now has FEET. A closed walkway (`WALK`) is laid through the
   free floor of the room — around the front of the bench, out past its right
   end, across the room and back along the left. Every station is projected
   onto that walkway, and travel between two stations follows the walkway the
   short way round. The camera physically cannot cut through the bench, because
   the path it moves along never goes there.

   What each station adds on top of the walkway is a LEAN: the offset from
   standing on the walkway to where the eye actually is for that shot — down
   and over the benchtop to read a board, lower and closer to read a screen.
   The lean is released while walking and taken up again on arrival, so a move
   between two distant stations reads as "stand up, walk over, lean back in".

     station 0        standing in the room, taking in the whole bench
     station 1..N     one standpoint per work chapter
     station N+1      walked round to the far end for the closing sections
   ========================================================================== */

import * as THREE from 'three';
import { BENCH, STAGE, ROOM } from './layout';
import { DEVICES } from './devices/registry';
import type { ProjectSlug } from '../../data/content';

/* --- the walkway --------------------------------------------------------- */

/** Eye height of someone standing in this room: 1.62m above the floor.
 *  Everything on the walkway is at this height; stations lean off it. */
export const WALK_EYE = BENCH.floorY + 1.62;

/* The free floor, as a closed loop of (x, z). Ordered anticlockwise starting
   off the right-hand end of the bench.

   Read against layout.ts: the bench occupies x in [-1.3, 1.3], z in
   [-0.5, 0.5] and stands against the front wall, so there is no floor behind
   it — which is what makes a single loop sufficient to reach everything. The
   office chair at (-1.05, 0.92) is cleared by ~0.45m on the C→D leg, and
   cleared entirely in the only way that matters, which is that its back is
   0.6m below this height.

   The laid track and the taped work square are both crossed by this loop, on
   purpose: they are 85mm and 0mm tall respectively, and a walkway that treated
   floor tape as a wall would have to leave half the room unreachable. */
const WALK: [number, number][] = [
  [2.25, 0.10], //  A  off the right-hand end of the bench
  [1.70, 1.00], //  B  front right — in front of the monitors and the laptop
  [0.20, 1.05], //  C  front centre — in front of the cutting mat
  [-1.25, 1.45], // D  front left, stepped out around the chair
  [-2.35, 1.15], // E  off the left-hand end of the bench
  [-2.90, 2.00], // F  back into the room down its left side
  [-1.50, 2.80], // G  behind the work square
  [0.30, 3.10], //  H  the back of the room, by the doorway
  [1.85, 2.55], //  I  the head of the laid track
  [2.70, 1.60], //  J  the right-hand side of the room
];

const walkway = new THREE.CatmullRomCurve3(
  WALK.map(([x, z]) => new THREE.Vector3(x, WALK_EYE, z)),
  true,
  'centripetal',
  0.5,
);

/** Total walked length of the loop, metres. Used to turn a difference in loop
 *  parameter into a distance, which is what decides whether a move is a step
 *  or a walk. */
const WALK_LENGTH = walkway.getLength();

/* A resampled copy of the loop, for projecting a point onto it. Built once:
   ten stations against 512 samples is trivial, and it never runs again. */
const SAMPLES = 512;
const samples: THREE.Vector3[] = [];
for (let i = 0; i < SAMPLES; i++) {
  samples.push(walkway.getPointAt(i / SAMPLES, new THREE.Vector3()));
}

/** Loop parameter (0..1) of the point on the walkway nearest `x, z`. */
function project(x: number, z: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < SAMPLES; i++) {
    const s = samples[i];
    const d = (s.x - x) * (s.x - x) + (s.z - z) * (s.z - z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best / SAMPLES;
}

/** Signed shortest difference between two loop parameters, in (-0.5, 0.5]. */
function loopDelta(from: number, to: number): number {
  let d = to - from;
  if (d > 0.5) d -= 1;
  else if (d < -0.5) d += 1;
  return d;
}

/* --- stations ------------------------------------------------------------ */

/** One authored shot, before it is attached to the walkway. */
interface Shot {
  /** where the eye is, world metres. */
  pos: [number, number, number];
  /** what it is aimed at. */
  look: [number, number, number];
  /** Vertical field of view in degrees. Wide for a room, tight for an object:
   *  changing it across a move is a large part of why the travel reads as
   *  cinematic rather than as a dolly at constant zoom. */
  fov: number;
}

export interface Station {
  /** loop parameter of the standpoint this shot is taken from. */
  u: number;
  /** eye position minus the walkway point — the lean. */
  lean: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

const scratchWalk = new THREE.Vector3();

/** Attach an authored shot to the walkway. */
function station(shot: Shot): Station {
  const u = project(shot.pos[0], shot.pos[2]);
  walkway.getPointAt(u, scratchWalk);
  return {
    u,
    lean: new THREE.Vector3(
      shot.pos[0] - scratchWalk.x,
      shot.pos[1] - scratchWalk.y,
      shot.pos[2] - scratchWalk.z,
    ),
    look: new THREE.Vector3(shot.look[0], shot.look[1], shot.look[2]),
    fov: shot.fov,
  };
}

/* --- the shots ----------------------------------------------------------- */

/** Standing in the room to the right of centre, far enough back that the whole
 *  bench, the chair and the lit screens are all in frame at once. Wide, because
 *  the first thing the page has to say is "this is a room". */
const HERO: Shot = {
  pos: [1.86, 0.68, 2.88],
  look: [-0.10, 0.0, -0.08],
  fov: 40,
};

/** Walked round to the other end and turned back on the bench. A different
 *  vantage from the hero rather than a reprise of it, so the page closes
 *  somewhere it has actually travelled to. */
const CLOSING: Shot = {
  pos: [-2.38, 0.72, 2.10],
  look: [0.14, -0.02, 0.06],
  fov: 38,
};

/** Leaning over the benchtop to read something on the cutting mat.
 *
 *  The eye comes just past the front edge of the bench, which is where your
 *  head goes when you lean in, and it is what makes the standoff small enough
 *  for an 86mm object to read without the camera pretending to be a
 *  microscope. `drop` sets how far above the subject that lands: too little
 *  and the shot is a cheek resting on the benchtop, too much and a flat board
 *  is seen from directly overhead and stops being an object at all. Around
 *  35 degrees is where both problems are smallest. */
function matShot(
  subject: [number, number, number],
  swing: number,
  drop: number,
  /* Standoff and lens. The tracker is an 86mm object and 0.46m at 30 degrees
     is the framing that was tuned for it; the three rigs that joined it on
     the mat are a 190mm rail, a 210mm tray and a camera looking at a card
     across 120mm, and every one of them is out of frame at that standoff.
     Left as defaults so the tracker's shot is byte-for-byte what it was. */
  distance = 0.46,
  fov = 30,
): Shot {
  const aim = new THREE.Vector3(
    STAGE[0] + subject[0],
    STAGE[1] + subject[1],
    STAGE[2] + subject[2],
  );
  /* Approach direction: out toward the front of the bench (+z), swung round
     the subject so consecutive mat chapters are not the same photograph. */
  const dir = new THREE.Vector3(Math.sin(swing), drop, Math.cos(swing)).normalize();
  const pos = aim.clone().addScaledVector(dir, distance);
  return {
    pos: [pos.x, pos.y, pos.z],
    look: [aim.x, aim.y, aim.z],
    fov,
  };
}

/* The laptop shot went with the chapters that used it. Three chapters were
   staged on that screen only because they had no object of their own; each
   now has one on the mat, and a camera helper with no caller is a trap for
   whoever reads this file next. layout.laptopScreenPose() is still there and
   still used — Computers.tsx frames the panel with it.
   ------------------------------------------------------------------------ */

/** Standing out on the floor, facing a subject too big for the bench.
 *  Authored as a standpoint rather than derived from a standoff: this room is
 *  7m across, and "3.7m back from the chair along this vector" is a position
 *  that may simply not be inside it. */
function roomShot(
  pos: [number, number, number],
  aim: [number, number, number],
  fov: number,
): Shot {
  return {
    pos,
    look: [ROOM.stage[0] + aim[0], BENCH.floorY + aim[1], ROOM.stage[2] + aim[2]],
    fov,
  };
}

/** The shot for each chapter, by slug. Keyed rather than positional so
 *  reordering the registry cannot silently point a camera at the wrong thing. */
const CHAPTER_SHOTS: Partial<Record<ProjectSlug, Shot>> = {
  // the tracker on the mat, leaned over from the front right
  mymo2: matShot([0, 0.012, 0], 0.62, 0.72),

  /* The whole installation, in one ultra-wide.
     ------------------------------------------------------------------------
     This chapter is the only one whose subject is a RELATIONSHIP: a console on
     the bench, three metres of track on the floor, and a command travelling
     from one to the other (see range/CommandLink.tsx). A shot that holds only
     the track is a shot of half the story, which is what the previous framing
     was — the laptop the commands come from was behind the camera.

     Getting both into one frame decides the standpoint almost entirely. From
     anywhere on the right of the room the bench and the track are on opposite
     sides of you, over 70 degrees apart. From the far left they collapse to
     about 39 degrees of the same view: the bench and its lit screens down the
     left of frame, the track running away to the right, and the office chair
     falling into the bottom corner as foreground. So: the left-hand end of the
     room, up a little, on a genuinely wide lens. */
  'shooting-range': {
    pos: [-2.55, 1.05, 0.95],
    look: [0.72, -0.05, 1.22],
    fov: 53,
  },

  /* These three used to be three reads of the same laptop screen, because
     they had no object of their own to look at. They have one now (see
     devices/OtaFleet, LifecycleBench and VisionRig), so they are shot on the
     mat like the tracker — and each is framed for what its subject actually
     is rather than for a panel they happened to share.

     The consoles did not go away: each still runs on the monitor behind the
     bench, so the chapter is the hardware AND the software talking to it in
     one frame, instead of the software alone. */

  /* Console, server, globe — three things on a line, with a packet arcing
     over the top of them. Almost square on and deliberately flat: this is the
     one chapter whose subject is a RELATIONSHIP between objects at bench
     scale, so what has to survive is the left-to-right order and the height of
     the arc. A three-quarter view foreshortens the line and puts the arc
     edge-on, which is the one direction it carries no information in. */
  'device-management': matShot([0, 0.072, 0], -0.14, 0.34, 0.76, 32),

  // A staircase of five states. Nearly side-on, because the risers are the
  // information: from above, five bays at five heights look like one tray.
  'lifecycle-database': matShot([0, 0.03, 0], 0.34, 0.46, 0.46, 30),

  // A camera and the chart it is pointed at. Swung most of the way round to
  // the perpendicular of the sight line, so the two objects are side by side
  // rather than one behind the other — the chart itself is angled to meet the
  // standpoint (VisionRig.CARD_YAW), which is what makes that affordable.
  'violence-detection': matShot([0, 0.05, 0], 0.45, 0.50, 0.44, 32),

  /* The chair, from the front left, standing. Far enough round that the office
     chair at the bench falls into the near edge of frame as a foreground
     element rather than sitting in the middle of the shot. */
  wheelchair: roomShot([-1.78, 0.62, 1.24], [0, 0.55, 0], 36),
};

/** Fallback for a chapter with no authored shot: stand on the walkway nearest
 *  the subject and look at it. Never as good as an authored one, but it is in
 *  the room and pointing the right way, which is the whole bar. */
function fallbackShot(index: number): Shot {
  const entry = DEVICES[index];
  const room = entry.stageKind === 'room';
  const base = room ? ROOM.stage : STAGE;
  const off = entry.lookOffset ?? [0, 0, 0];
  const aim: [number, number, number] = [
    base[0] + entry.stage.position[0] + off[0],
    (room ? BENCH.floorY : 0) + entry.lookHeight + off[1],
    base[2] + entry.stage.position[2] + off[2],
  ];
  const u = project(aim[0], aim[2]);
  walkway.getPointAt(u, scratchWalk);
  return { pos: [scratchWalk.x, scratchWalk.y, scratchWalk.z], look: aim, fov: 34 };
}

export const STATIONS: Station[] = [
  station(HERO),
  ...DEVICES.map((entry, i) => station(CHAPTER_SHOTS[entry.slug] ?? fallbackShot(i))),
  station(CLOSING),
];

/** Index of the last station. */
export const LAST_STATION = STATIONS.length - 1;

/** Station index for work chapter `i`. */
export const chapterStation = (i: number) => 1 + i;

/* --- sampling ------------------------------------------------------------ */

/** The pose the rig aims at this frame. Mutated in place; never allocated. */
export interface CameraPose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

export function makePose(): CameraPose {
  return { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 34 };
}

const smoothstep = (t: number) => {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/** Sixth-order ease. Zero velocity AND zero acceleration at both ends, which
 *  is the difference between a move that stops and a move that arrives. */
const smootherstep = (t: number) => {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/** How much of a station's lean is held at ease value `x`. Released through
 *  the middle of a move so the camera comes back to standing on the walkway
 *  while it is travelling, and takes the lean up again on arrival. */
function holdLean(x: number) {
  return smoothstep((x - 0.42) / 0.58);
}

/** Write the interpolated pose at floating station `t` into `out`.
 *  Allocation-free: called every frame. */
export function sampleStation(t: number, out: CameraPose) {
  const clamped = THREE.MathUtils.clamp(t, 0, LAST_STATION);
  const i = Math.floor(clamped);
  const j = Math.min(i + 1, LAST_STATION);
  const f = clamped - i;

  const A = STATIONS[i];
  const B = STATIONS[j];

  /* The body eases with a sixth-order curve; the head finishes turning a
     little before the body stops, the way a person looks where they are going
     before they have finished getting there. */
  const sPos = smootherstep(f);
  const sLook = smootherstep(f * 1.16);

  // --- feet: along the walkway, the short way round
  const u = A.u + loopDelta(A.u, B.u) * sPos;
  walkway.getPointAt(u - Math.floor(u), out.pos);

  /* --- lean, weighted by how far this move actually walks. A move of a step
     or two keeps its lean and simply slides it across; a move across the room
     stands the camera up first. Without this the camera bobbed upright and
     back down between the three laptop chapters, which are the same standpoint
     read three ways. */
  const travel = Math.abs(loopDelta(A.u, B.u)) * WALK_LENGTH;
  const rise = smoothstep((travel - 0.4) / 1.1);
  const wA = THREE.MathUtils.lerp(1 - sPos, holdLean(1 - sPos), rise);
  const wB = THREE.MathUtils.lerp(sPos, holdLean(sPos), rise);
  out.pos.addScaledVector(A.lean, wA).addScaledVector(B.lean, wB);

  // --- aim
  out.look.copy(A.look).lerp(B.look, sLook);
  out.fov = THREE.MathUtils.lerp(A.fov, B.fov, sPos);
}

/* --- inspection (case study) --------------------------------------------- */

/* Devices are normalised to roughly a 300mm object by `inspect.scale` in the
   registry, so the inspection camera is a constant rather than per-device.
   It pulls back as the assembly separates: an exploded transit case occupies
   about twice the volume of the closed one, and a fixed camera would let the
   parts leave the frame exactly when they become worth looking at. */
const INSPECT_BASE = 0.7;
const INSPECT_EXPLODED = 1.28;

export function inspectPose(explode: number, out: CameraPose) {
  const distance = THREE.MathUtils.lerp(INSPECT_BASE, INSPECT_EXPLODED, explode);
  /* Rises and comes round a few degrees as the assembly opens, so the reader
     is looking INTO the separated stack rather than at its side. */
  const swing = explode * 0.22;
  out.pos.set(
    Math.sin(swing) * distance,
    distance * (0.42 + explode * 0.16),
    Math.cos(swing) * distance,
  );
  /* Parts travel further up than down when an assembly separates — lids and
     boards lift, only the base drops — so the aim point rises with the
     explosion or the top of the stack leaves the frame. */
  out.look.set(0, 0.02 + explode * 0.1, 0);
  out.fov = THREE.MathUtils.lerp(32, 36, explode);
}
