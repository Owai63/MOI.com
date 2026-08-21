/* ============================================================================
   spec — the dimensions of the target-runner system, in metres
   ----------------------------------------------------------------------------
   One place for every number the runner, the rail and the two range sets
   share. The home page shows a short length of this track set up on the lab
   floor; the case study shows the same hardware on a full lane. If those two
   read as different machines the whole thing falls over, so they are built
   from the same table and differ only in how much rail is laid.

   The frame convention, everywhere in this folder:

     +x   direction of travel, downrange
     +y   up
     -z   the way the target faces — toward the firing point

   A lane that runs some other way in world space rotates the whole group;
   nothing inside it is re-authored.
   ========================================================================== */

/* --- the transit case (the controller itself) ---------------------------- */

export const CASE = {
  /** across the direction of travel is the case's own depth, not its width:
   *  the unit is mounted broadside so the operator can open the lid. */
  w: 0.40,
  d: 0.32,
  h: 0.125,
  wall: 0.011,
  lidT: 0.042,
  /** fully-open lid angle, matching the photographs — leans back past
   *  vertical and rests on its hinge stops. */
  lidOpen: -1.98,
} as const;

/* --- the track ----------------------------------------------------------- */

export const RAIL = {
  /** centre-to-centre of the two rails. */
  gauge: 0.34,
  /** cross-section of one rail head. */
  headW: 0.030,
  headH: 0.035,
  /** top of the rail head above the floor — what the wheels ride on. */
  top: 0.085,
  /** sleeper: width across the track, thickness, length along it. */
  sleeper: [0.50, 0.05, 0.09] as [number, number, number],
  sleeperGap: 0.5,
  /** the toothed rack the drive pinion engages, offset to one side. */
  rackZ: 0.0,
  rackH: 0.022,
} as const;

/* --- the carriage -------------------------------------------------------- */

export const CAR = {
  /** deck plate: along travel, thickness, across travel. */
  deck: [0.86, 0.012, 0.56] as [number, number, number],
  /** top surface of the deck — everything on the runner stands on this. */
  deckY: 0.196,
  wheelR: 0.050,
  wheelW: 0.032,
  /** half-spacing of the axles along the direction of travel. */
  wheelbase: 0.30,
  /** Where the mannequin stands: the downrange-facing end of the deck. The
   *  target goes toward the firing point and the controller goes behind it —
   *  the only arrangement that survives the range being used. */
  targetX: -0.26,
  /** where the controller case stands, behind the target. */
  caseX: 0.16,
} as const;

/* --- the mannequin ------------------------------------------------------- */

export const MAN = {
  /** overall height of the figure above its footplate. */
  height: 1.52,
} as const;

/* --- lanes --------------------------------------------------------------- */

/** Length of rail laid on the home page: a demonstration section set up on
 *  the lab floor, long enough for the run to read as travel. */
export const LAB_RAIL_LEN = 3.2;

/** Length of rail on the case study's lane. Real installations run further;
 *  this is as far as a 32° lens can hold the target and still show the
 *  hardware on it, and the distance markers say what the real numbers are. */
export const LANE_RAIL_LEN = 12.4;

/** Clear travel available on a rail of the given length, once the end stops
 *  and the carriage's own length are taken out. */
export function travelSpan(railLength: number) {
  return railLength - CAR.deck[0] - 0.22;
}
