/* ============================================================================
   layout — where everything in the room stands
   ----------------------------------------------------------------------------
   These were inline in Workbench.tsx, which was fine while every chapter was
   framed on the same spot on the mat. Now that chapters can be staged on the
   laptop screen or out in the room, the camera has to know where those things
   physically are — and a camera that reads one set of numbers while the props
   are placed from another drifts the moment either is touched.

   The screen poses are DERIVED, not typed in: a laptop panel sits at the end
   of a chain of a group yaw, a hinge angle and a plane rotation, and working
   that out by hand once is a guarantee of getting it wrong later. The same
   Object3D maths the renderer uses is run here instead.
   ========================================================================== */

import * as THREE from 'three';

export const BENCH = {
  /** working surface height — the origin plane for everything on the bench. */
  topY: 0,
  width: 2.6,
  depth: 1.0,
  thickness: 0.045,
  floorY: -0.78,
} as const;

/** Where bench devices appear: slightly left of centre, on the cutting mat. */
export const STAGE: [number, number, number] = [-0.12, 0, 0.09];

/* --- placements ---------------------------------------------------------- */

export const LAPTOP = {
  position: [0.40, 0, 0.24] as [number, number, number],
  yaw: -0.42,
  width: 0.32,
  depth: 0.222,
  /** open angle of the lid, radians about its hinge at the back edge. */
  lidAngle: -1.86,
};

/** Where a rig belonging to a laptop-staged chapter sits: on the bench just
 *  left of the machine, so it falls into the lower corner of the frame when
 *  the camera comes round to read the screen. */
export const LAPTOP_BENCH_SPOT: [number, number, number] = [0.10, 0, 0.36];

export const MONITORS = {
  position: [0.46, 0, -0.36] as [number, number, number],
  yaw: -0.16,
  panelW: 0.50,
  panelH: 0.29,
  bezel: 0.008,
  /** local x and yaw of the left and right panels. */
  left: { x: -0.28, yaw: 0.22 },
  right: { x: 0.28, yaw: -0.22 },
};

export const SCOPE = {
  position: [-0.86, 0, -0.30] as [number, number, number],
  yaw: 0.30,
};

export const PSU = {
  position: [-1.24, 0, -0.28] as [number, number, number],
  yaw: 0.42,
};

/* Pushed toward the left end of the bench. On the room chapters the camera
   turns around and looks past this spot; on the centre mark the chair back
   sits exactly where the subject does. */
export const CHAIR_POSITION: [number, number, number] = [-1.05, 0, 0.92];

export const BATTEN = {
  /** 0.95m over the benchtop. Also clear of the room cameras' eyelines — at
   *  0.72 the fixture sat level with them and laid a bar across those shots,
   *  and the x here keeps it off the sight line to the range lane, which is
   *  laid down the right-hand side of the room. */
  position: [-0.32, 0.95, -0.24] as [number, number, number],
  length: 1.06,
};

/* --- the shell -----------------------------------------------------------

   The architecture, as six planes. One place for these because three
   different things have to agree on them: RoomShell draws them, cameraRig
   clamps the camera inside them, and the lighting rig hangs fixtures off the
   ceiling height. A wall moved in only one of those shows up as the camera
   stopping short of nothing, or as a fixture buried in the slab.

   The bench stands against the front wall, which is what makes the walkable
   floor a single simply-connected region and lets one walkway loop reach
   everything in the room.                                                  */

export const SHELL = {
  minX: -3.7,
  maxX: 3.7,
  /** the wall the bench backs onto. */
  frontZ: -1.2,
  /** the wall with the doorway in it, at the far end of the room. */
  backZ: 3.9,
  /** 3m floor-to-ceiling. */
  ceilingY: BENCH.floorY + 3.0,
  /** underside of the suspended ceiling fixtures. */
  fixtureY: BENCH.floorY + 2.62,
} as const;

/** Where the ceiling fixtures hang, and therefore where the room lights are.
 *  Laid over the open floor rather than over the bench, which has its own.
 *
 *  TWO, not three, and the count is a performance decision as much as a
 *  lighting one. Three.js forward-renders: every lit fragment in the frame
 *  loops over every light in the scene, so each fixture here is paid for on
 *  every pixel of a full-viewport canvas, whether or not any of its light
 *  reaches that pixel. Three fixtures over a 7x5m room looked marginally
 *  better and cost the entire scene a third more fragment work than two do.
 *
 *  Read by BOTH the fixtures in RoomShell and the lights in BenchCanvas, so
 *  the thing you can see and the thing doing the lighting cannot drift apart. */
export const CEILING_FIXTURES: [number, number][] = [
  [-1.5, 1.5],
  [-0.2, 3.0],
];

/* --- the room behind the bench ------------------------------------------- */

/** The floor area the camera turns around to face. The bench occupies
 *  z ∈ [-0.5, 0.5]; this is well clear of it, so getting there really is a
 *  180° turn rather than a pan along the same wall. */
export const ROOM = {
  /** where a floor-standing subject is placed. */
  stage: [0.24, BENCH.floorY, 2.45] as [number, number, number],
  /** back wall of the room, behind that subject. Same plane as SHELL.backZ,
   *  which is where it is actually drawn. */
  wallZ: 3.9,
  /** The lamp that comes up when the room is in use. High enough to sit above
   *  the frame at the room chapter's standoff — a bare emissive strip across
   *  the top of the shot reads as a bug, not as lighting. */
  light: [0.3, 1.92, 2.0] as [number, number, number],
};

/* --- derived screen poses ------------------------------------------------ */

export interface SurfacePose {
  /** world-space centre of the display surface. */
  center: THREE.Vector3;
  /** world-space outward normal of the display surface. */
  normal: THREE.Vector3;
}

/** Run a transform chain through real Object3Ds and read the result, rather
 *  than composing rotations by hand. */
function poseOf(build: (root: THREE.Object3D) => THREE.Object3D): SurfacePose {
  const root = new THREE.Object3D();
  const surface = build(root);
  root.updateWorldMatrix(true, true);
  const center = new THREE.Vector3().setFromMatrixPosition(surface.matrixWorld);
  const normal = new THREE.Vector3(0, 0, 1)
    .transformDirection(surface.matrixWorld)
    .normalize();
  return { center, normal };
}

function child(parent: THREE.Object3D) {
  const o = new THREE.Object3D();
  parent.add(o);
  return o;
}

/** Centre and facing of the laptop's panel, following group yaw → hinge →
 *  the plane's own rotation. */
export function laptopScreenPose(): SurfacePose {
  return poseOf((root) => {
    const group = child(root);
    group.position.set(...LAPTOP.position);
    group.rotation.y = LAPTOP.yaw;

    // lid, hinged at the back edge of the base
    const lid = child(group);
    lid.position.set(0, 0.012, -LAPTOP.depth / 2);
    lid.rotation.x = LAPTOP.lidAngle;

    // the panel sits on the lid's inner face
    const panel = child(lid);
    panel.position.set(0, 0.0006, LAPTOP.depth / 2);
    panel.rotation.x = Math.PI / 2;
    return panel;
  });
}

/** Centre and facing of one of the two monitor panels. */
export function monitorScreenPose(which: 'left' | 'right'): SurfacePose {
  const p = MONITORS[which];
  return poseOf((root) => {
    const group = child(root);
    group.position.set(...MONITORS.position);
    group.rotation.y = MONITORS.yaw;

    const panelGroup = child(group);
    panelGroup.position.set(p.x, 0, 0);
    panelGroup.rotation.y = p.yaw;

    const panel = child(panelGroup);
    panel.position.set(0, MONITORS.panelH / 2 + 0.13, 0.0092);
    return panel;
  });
}
