/* ============================================================================
   registry — what each chapter stages, and where
   ----------------------------------------------------------------------------
   Not every project is an object you can put on a bench, and pretending
   otherwise was the weak part of the first pass: four chapters got a board on
   a mat because that was the only staging the scene knew how to do.

   Each chapter now declares WHERE it happens:

     mat      hardware, on the cutting mat — the camera walks up to it
     laptop   software, so the subject is a console: the camera turns to the
              laptop and the screen runs the thing the chapter describes
     room     too big for a bench. The camera turns away from the bench
              entirely and out into the room behind it

   and optionally a `screen` program, which is what the laptop or the right
   monitor is running while that chapter is on screen. Hardware chapters use
   it too — the tracker's own track is drawn on the monitor behind it while
   the unit sits on the mat.

   `wave` selects the oscilloscope trace, so the instrument is always showing
   the signal the chapter is about.
   ========================================================================== */

import type { ProjectSlug } from '../../../data/content';
import type { ProgramId } from '../screens/programs';
import { TrackerDevice } from './TrackerDevice';
import { RangeFloorRig } from '../range/RangeFloorRig';
import { Wheelchair } from './Wheelchair';
import { OtaLink } from './OtaLink';
import { LifecycleBench } from './LifecycleBench';
import { VisionRig } from './VisionRig';

export type Waveform = 'serial' | 'pwm' | 'burst' | 'ramp' | 'noise' | 'pulse';

export type StageKind = 'mat' | 'laptop' | 'room';

export interface StagePose {
  /** metres, relative to the origin for this stage kind. */
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export interface DeviceEntry {
  slug: ProjectSlug;
  render: (props: {
    activeRef: React.MutableRefObject<number>;
    detail?: 'high' | 'low';
  }) => React.ReactElement;
  /** where this chapter is staged. */
  stageKind: StageKind;
  /** pose within that stage. */
  stage: StagePose;
  /** pose in the case study's inspection frame. */
  inspect: StagePose;
  /** Direction the camera stands off in, for `room` chapters. Normalised
   *  internally. Defaults to the wheelchair's over-the-bench three-quarter
   *  view; the range needs a flatter, more side-on one, because what it has
   *  to show is a length of track and a thing travelling along it. */
  roomDir?: [number, number, number];
  /** Camera standoff for `mat` and `room` chapters, metres. Set per device by
   *  eye rather than derived from a bounding box: what should fill the frame
   *  is the part worth looking at, and for the transit case that is the open
   *  interior, not the outside of the shell. Unused for `laptop`, whose
   *  framing comes from where the panel physically is (see layout.ts). */
  distance: number;
  /** height above the stage floor the camera aims at. */
  lookHeight: number;
  /** Lateral nudge of the aim point, metres. The range unit drives a rail
   *  that runs half a metre off the side of the case, and aiming at the case
   *  alone pushes the thing it is moving out of frame. */
  lookOffset?: [number, number, number];
  /** what the bench screens run during this chapter. */
  screen?: { target: 'laptop' | 'monitor'; program: ProgramId };
  wave: Waveform;
  accent: string;
}

export const DEVICES: DeviceEntry[] = [
  {
    slug: 'mymo2',
    render: (props) => <TrackerDevice {...props} />,
    stageKind: 'mat',
    // sits square on the mat with the antenna trailing to the right
    stage: { position: [0, 0, 0], rotation: [0, -0.35, 0], scale: 1 },
    inspect: { position: [0, 0, 0], rotation: [0, -0.42, 0], scale: 3.4 },
    // an 86mm object: the camera has to come right in or it reads as a chip
    distance: 0.34,
    lookHeight: 0.012,
    // the console behind it is tracking the unit that is on the bench
    screen: { target: 'monitor', program: 'route' },
    wave: 'serial',
    accent: '#3fe0d0',
  },
  {
    slug: 'shooting-range',
    /* Staged on the floor, not on the bench. The subject of this chapter is
       a box that MOVES: it rides a track with a training target bolted to
       the same carriage, and it moves because a command reached it from the
       laptop behind the camera. None of that fits on a cutting mat. */
    render: (props) => <RangeFloorRig {...props} />,
    stageKind: 'room',
    /* Laid down the right-hand side of the room, not on its centre mark.
       Everything the bench hangs over its own middle — the chair, the batten,
       the monitors — sits between the camera and the centre mark, and a
       three-metre track staged there is watched through a light fitting. From
       here the sight line is clear and the laptop the commands come from is
       still at the corner of frame. The rig lays its own track, so the yaw
       lives with it and not here. */
    stage: { position: [1.35, 0, 0.15], rotation: [0, 0, 0], scale: 1 },
    inspect: { position: [0, 0, 0], rotation: [0, -0.36, 0], scale: 0.95 },
    // far enough back to hold the whole laid section and the target on it
    distance: 5.2,
    lookHeight: 0.80,
    // the camera aims at the track, which is not where the room's mark is
    lookOffset: [1.35, 0, 0.15],
    // Same pitch as the chair's shot, so the bench still reads as a band
    // across the bottom of the frame rather than as half of it — but square
    // on to the track, because the subject is a line and a thing moving
    // along it.
    roomDir: [-0.08, 0.40, -1],
    screen: { target: 'monitor', program: 'range' },
    wave: 'pwm',
    accent: '#f6a250',
  },
  {
    slug: 'device-management',
    /* Console, server, and a globe with the unit standing on it — the whole
       path a configuration takes from a web form to a tracker that is not in
       the building. See OtaLink.tsx. */
    render: (props) => <OtaLink {...props} />,
    stageKind: 'mat',
    /* Barely yawed. The set is a LINE, read left to right, and turning it far
       enough to be "dynamic" is turning it far enough that the far end of the
       line is behind the near end. */
    stage: { position: [0, 0, -0.01], rotation: [0, -0.16, 0], scale: 1 },
    inspect: { position: [0, -0.06, 0], rotation: [0, -0.22, 0], scale: 1.05 },
    // a 310mm set standing 190mm tall, so the camera stands well back — much
    // further than the 86mm tracker's shot
    distance: 0.66,
    lookHeight: 0.062,
    // the rollout console runs on the monitor behind it as well
    screen: { target: 'monitor', program: 'ota' },
    wave: 'burst',
    accent: '#3fe0d0',
  },
  {
    slug: 'lifecycle-database',
    /* One device, five times over, on a stepped tray. See LifecycleBench.tsx
       for why a database is staged as the thing it keeps records about. */
    render: (props) => <LifecycleBench {...props} />,
    stageKind: 'mat',
    stage: { position: [0, 0, 0], rotation: [0, -0.24, 0], scale: 1 },
    inspect: { position: [0, -0.012, 0], rotation: [0, -0.30, 0], scale: 1.5 },
    distance: 0.54,
    lookHeight: 0.028,
    screen: { target: 'monitor', program: 'lifecycle' },
    wave: 'ramp',
    accent: '#8f7bf0',
  },
  {
    slug: 'violence-detection',
    /* A bench camera and the chart it is aimed at. Yawed most of a quarter
       turn so the printed target faces the reader while the camera stays in
       three-quarter view — the sight line between them is the composition. */
    render: (props) => <VisionRig {...props} />,
    stageKind: 'mat',
    stage: { position: [0.01, 0, 0], rotation: [0, 0.95, 0], scale: 1 },
    inspect: { position: [0, -0.03, 0], rotation: [0, 0.62, 0], scale: 1.9 },
    distance: 0.46,
    lookHeight: 0.052,
    screen: { target: 'monitor', program: 'vision' },
    wave: 'noise',
    accent: '#f6a250',
  },
  {
    slug: 'wheelchair',
    render: (props) => <Wheelchair {...props} />,
    stageKind: 'room',
    /* Turned to face back toward the bench. The chair drives along its own
       +z, so this also decides which way it sets off — three-quarters on and
       coming gently toward the viewer, rather than reversing into the wall. */
    stage: { position: [0, 0, 0], rotation: [0, 2.52, 0], scale: 1 },
    // a 1.1m chair, so the inspection frame scales it DOWN — the only device
    // here that does
    inspect: { position: [0, -0.3, 0], rotation: [0, -0.5, 0], scale: 0.42 },
    distance: 3.7,
    lookHeight: 0.55,
    wave: 'pulse',
    accent: '#4fd6c0',
  },
];

export const deviceIndex = (slug: string) =>
  DEVICES.findIndex((d) => d.slug === slug);

export const deviceFor = (slug: string) =>
  DEVICES.find((d) => d.slug === slug) ?? null;

/** Indices of the chapters staged out in the room rather than on the bench.
 *  Anything that dims the bench, or lifts the room's lights, keys off this. */
export const ROOM_CHAPTERS = DEVICES.reduce<number[]>((acc, d, i) => {
  if (d.stageKind === 'room') acc.push(i);
  return acc;
}, []);

/** True while the reader is turned away from the bench. */
export const isRoomChapter = (i: number) => ROOM_CHAPTERS.includes(i);
