/* ============================================================================
   cameraPath — the dolly the whole page is choreographed against
   ----------------------------------------------------------------------------
   The page is one continuous camera move, not a set of cuts.
   `sceneState.station` is a floating index into this list; the rig reads the
   two neighbouring stations and interpolates, so a scroll of any speed reads
   as one unbroken movement.

     station 0        wide, standing back from the bench — the hero
     station 1..N     one framing per work chapter
     station N+1      pulled back out again for the closing sections

   Chapter stations are generated from where the chapter is actually staged
   (see devices/registry.tsx), which is what makes the moves mean something:
   walking up to an object on the mat, leaning in to read a screen, and — for
   the chapter whose subject is a powered wheelchair — turning away from the
   bench entirely to face the room behind it. That last one genuinely reverses
   the view direction, which is why it lands as an event rather than as
   another push-in.
   ========================================================================== */

import * as THREE from 'three';
import { STAGE, ROOM, BENCH, laptopScreenPose } from './layout';
import { DEVICES, type DeviceEntry } from './devices/registry';

export interface Station {
  pos: [number, number, number];
  look: [number, number, number];
}

/** Azimuth (from the bench's front) and elevation for mat chapters, so
 *  consecutive ones swing the camera to the other side of the object rather
 *  than creeping in a straight line. */
const MAT_ANGLES: [number, number][] = [
  [0.42, 0.38],
  // the transit case stands open, so this one needs height to see inside it
  [-0.26, 0.62],
  [0.72, 0.34],
  [-0.62, 0.44],
];

function orbit(
  azimuth: number,
  elevation: number,
  distance: number,
  height: number,
  offset: [number, number, number] = [0, 0, 0],
): Station {
  const ce = Math.cos(elevation);
  const aim: [number, number, number] = [
    STAGE[0] + offset[0],
    STAGE[1] + height + offset[1],
    STAGE[2] + offset[2],
  ];
  return {
    pos: [
      aim[0] + Math.sin(azimuth) * distance * ce,
      STAGE[1] + Math.sin(elevation) * distance + 0.02,
      aim[2] + Math.cos(azimuth) * distance * ce,
    ],
    look: aim,
  };
}

/** Framed on the laptop panel. The pose is taken off the panel's real
 *  transform rather than typed in, and swung a few degrees off-axis: a
 *  dead-on shot of a screen is flat, and coming round keeps the bench and the
 *  rig beside it in frame. The aim point sits below the panel centre so the
 *  screen rides high and the hardware it is talking to shows underneath. */
function laptopStation(): Station {
  const { center, normal } = laptopScreenPose();
  const swung = normal
    .clone()
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.3)
    .normalize();
  const pos = center.clone().addScaledVector(swung, 0.58);
  pos.y += 0.1;
  return {
    pos: [pos.x, pos.y, pos.z],
    look: [center.x, center.y - 0.045, center.z],
  };
}

/** Turned around, facing the floor area behind the bench. The camera sits
 *  above the benchtop so the bench edge frames the bottom of the shot — the
 *  viewer is standing at the bench looking away from it, not teleported. */
function roomStation(device: DeviceEntry): Station {
  const off = device.lookOffset ?? [0, 0, 0];
  const look: [number, number, number] = [
    ROOM.stage[0] + off[0],
    BENCH.floorY + device.lookHeight + off[1],
    ROOM.stage[2] + off[2],
  ];
  /* Back off toward the bench. The default is a little to one side and above
     — a three-quarter view, which is right for a chair. A chapter whose
     subject travels along a line asks for something flatter and more side-on,
     and says so with `roomDir`. */
  const d = device.roomDir ?? [-0.15, 0.3, -1];
  const dir = new THREE.Vector3(d[0], d[1], d[2]).normalize();
  const pos = new THREE.Vector3(...look).addScaledVector(dir, device.distance);
  return { pos: [pos.x, pos.y, pos.z], look };
}

/** The wide shots that open and close the page. Both look along the bench so
 *  the instruments, screens and the chair all read, and both sit far enough
 *  back that the device on the mat is legibly small. */
const HERO: Station = {
  pos: [0.92, 0.46, 1.62],
  look: [-0.1, 0.06, -0.02],
};

const CLOSING: Station = {
  pos: [-1.02, 0.54, 1.48],
  look: [0.06, 0.04, -0.06],
};

let matIndex = 0;
export const STATIONS: Station[] = [
  HERO,
  ...DEVICES.map((device) => {
    switch (device.stageKind) {
      case 'laptop':
        return laptopStation();
      case 'room':
        return roomStation(device);
      default: {
        const [az, el] = MAT_ANGLES[matIndex++ % MAT_ANGLES.length];
        return orbit(az, el, device.distance, device.lookHeight, device.lookOffset);
      }
    }
  }),
  CLOSING,
];

/** Index of the last station. */
export const LAST_STATION = STATIONS.length - 1;

/** Station index for work chapter `i`. */
export const chapterStation = (i: number) => 1 + i;

/* --- sampling ------------------------------------------------------------ */

const a = new THREE.Vector3();
const b = new THREE.Vector3();

/** Write the interpolated camera pose at floating station `t` into `outPos`
 *  and `outLook`. Allocation-free: called every frame. */
export function sampleStation(
  t: number,
  outPos: THREE.Vector3,
  outLook: THREE.Vector3,
) {
  const clamped = THREE.MathUtils.clamp(t, 0, LAST_STATION);
  const i = Math.floor(clamped);
  const j = Math.min(i + 1, LAST_STATION);
  const f = clamped - i;
  // smoothstep between stations: the camera eases out of one framing and into
  // the next instead of running at constant speed through the middle
  const s = f * f * (3 - 2 * f);

  const A = STATIONS[i];
  const B = STATIONS[j];

  a.set(A.pos[0], A.pos[1], A.pos[2]);
  b.set(B.pos[0], B.pos[1], B.pos[2]);
  outPos.copy(a).lerp(b, s);

  a.set(A.look[0], A.look[1], A.look[2]);
  b.set(B.look[0], B.look[1], B.look[2]);
  outLook.copy(a).lerp(b, s);
}

/* --- inspection (case study) --------------------------------------------- */

/* Devices are normalised to roughly a 300mm object by `inspect.scale` in the
   registry, so the inspection camera is a constant rather than per-device.
   It pulls back as the assembly separates: an exploded transit case occupies
   about twice the volume of the closed one, and a fixed camera would let the
   parts leave the frame exactly when they become worth looking at. */
const INSPECT_BASE = 0.70;
const INSPECT_EXPLODED = 1.28;

export function inspectPose(explode: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  const distance = THREE.MathUtils.lerp(INSPECT_BASE, INSPECT_EXPLODED, explode);
  outPos.set(0, distance * 0.42, distance);
  /* Parts travel further up than down when an assembly separates — lids and
     boards lift, only the base drops — so the aim point rises with the
     explosion or the top of the stack leaves the frame. */
  outLook.set(0, 0.02 + explode * 0.1, 0);
}
