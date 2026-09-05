/* ============================================================================
   framecheck — where things actually land on screen
   ----------------------------------------------------------------------------
   check-camera.mjs answers "is the camera somewhere legal". This answers the
   harder question: given the station, the portrait lens widening AND the
   two-column frame shift, does the thing the chapter is about end up inside
   the viewport, and where.

   The frame shift is the part worth simulating rather than reasoning about.
   It moves the camera and its aim point together along the view's right
   vector by a fraction of the STANDOFF, so how far the subject travels across
   the frame depends on the field of view as well — which means the same
   constant produces a gentle nudge on a wide shot and a shove on a tight one.
   That is not obvious from reading it, and it is exactly the kind of thing
   that puts a subject half off screen on one chapter and nowhere near the edge
   on the next.

   Run: node scripts/framecheck.mjs
   ========================================================================== */
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const THREE = await server.ssrLoadModule('three');
const { sampleStation, makePose, LAST_STATION } = await server.ssrLoadModule(
  '/src/three/bench/cameraPath.ts',
);
const { portraitFraming } = await server.ssrLoadModule('/src/three/bench/cameraRig.ts');
const layout = await server.ssrLoadModule('/src/three/bench/layout.ts');
const { DEVICES } = await server.ssrLoadModule('/src/three/bench/devices/registry.tsx');
const { LAB_LANE_YAW } = await server.ssrLoadModule('/src/three/bench/range/RangeFloorRig.tsx');
const { LAB_RAIL_LEN } = await server.ssrLoadModule('/src/three/bench/range/spec.ts');

const { ROOM, BENCH, MONITORS, STAGE, LAPTOP_BENCH_SPOT, laptopScreenPose } = layout;

/* A point in one bench device's LOCAL space, in world space.
   Three chapters are now staged on the mat with their own geometry, and each
   of them is wider than the tracker the mat framing was tuned for — a rail of
   six units, a tray of five, a camera and the card it is aimed at. Asking
   "is the cutting mat in frame" says nothing useful about any of those, so
   the marks are taken off the registry's own stage transform instead of
   being typed in: move a device in registry.tsx and this check moves with
   it. */
function deviceMark(slug, local) {
  const d = DEVICES.find((x) => x.slug === slug);
  if (!d) throw new Error(`no device for ${slug}`);
  const origin =
    d.stageKind === 'room' ? ROOM.stage : d.stageKind === 'laptop' ? LAPTOP_BENCH_SPOT : STAGE;
  const g = new THREE.Object3D();
  g.position.set(
    origin[0] + d.stage.position[0],
    origin[1] + d.stage.position[1],
    origin[2] + d.stage.position[2],
  );
  g.rotation.set(...d.stage.rotation);
  g.scale.setScalar(d.stage.scale);
  g.updateMatrixWorld(true);
  return new THREE.Vector3(...local).applyMatrix4(g.matrixWorld);
}

/* --- the landmarks worth asking about ------------------------------------ */

const laneCentre = new THREE.Vector3(ROOM.stage[0] + 1.35, BENCH.floorY, ROOM.stage[2] + 0.15);
const laneDir = new THREE.Vector3(Math.cos(LAB_LANE_YAW), 0, -Math.sin(LAB_LANE_YAW));
const laneHalf = LAB_RAIL_LEN / 2;
const panel = laptopScreenPose().center;

const MARKS = {
  'laptop screen': panel,
  'laptop screen L': panel.clone().add(new THREE.Vector3(-0.14, 0, -0.06)),
  'laptop screen R': panel.clone().add(new THREE.Vector3(0.14, 0, 0.06)),
  monitors: new THREE.Vector3(MONITORS.position[0], 0.27, MONITORS.position[2]),
  'cutting mat': new THREE.Vector3(-0.12, 0.02, 0.09),

  // the OTA set: the console at one end of the line, the globe at the other,
  // the unit standing on it, and the top of the arc between them
  'ota console': deviceMark('device-management', [-0.122, 0.038, 0]),
  'ota server': deviceMark('device-management', [-0.02, 0.03, 0]),
  'ota globe': deviceMark('device-management', [0.1, 0.149, 0]),
  'ota unit': deviceMark('device-management', [0.114, 0.118, 0.065]),
  'ota arc apex': deviceMark('device-management', [0.04, 0.185, 0.035]),

  // the lifecycle tray: the first and last of the five states
  'lifecycle 01': deviceMark('lifecycle-database', [-0.084, 0.006, 0]),
  'lifecycle 05': deviceMark('lifecycle-database', [0.084, 0.046, 0]),

  // the detection rig: the camera and the chart it is pointed at
  'vision camera': deviceMark('violence-detection', [-0.052, 0.086, 0]),
  'vision chart': deviceMark('violence-detection', [0.062, 0.052, 0]),
  'track near': laneCentre.clone().addScaledVector(laneDir, -laneHalf),
  'track far': laneCentre.clone().addScaledVector(laneDir, laneHalf),
  wheelchair: new THREE.Vector3(ROOM.stage[0], BENCH.floorY + 0.55, ROOM.stage[2]),
  'bench left': new THREE.Vector3(-1.3, 0, 0),
  'bench right': new THREE.Vector3(1.3, 0, 0),
};

/** What each station is actually about — checked strictly. */
const SUBJECTS = {
  0: ['bench left', 'bench right', 'monitors'],
  1: ['cutting mat'],
  2: ['track near', 'track far', 'laptop screen'],
  3: ['ota console', 'ota server', 'ota globe', 'ota unit', 'ota arc apex'],
  4: ['lifecycle 01', 'lifecycle 05'],
  5: ['vision camera', 'vision chart'],
  6: ['wheelchair'],
  7: ['bench left', 'bench right'],
};

/* --- the rig, as BenchCanvas applies it ---------------------------------- */

const UP = new THREE.Vector3(0, 1, 0);
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

function poseFor(station, aspect, bias) {
  const pose = makePose();
  sampleStation(station, pose);

  const framing = portraitFraming(pose.fov, aspect);
  pose.fov = framing.fov;
  if (framing.pull > 1) {
    forward.copy(pose.pos).sub(pose.look).multiplyScalar(framing.pull);
    pose.pos.copy(pose.look).add(forward);
  }

  if (bias !== 0) {
    forward.copy(pose.look).sub(pose.pos);
    const distance = forward.length();
    forward.normalize();
    right.crossVectors(forward, UP).normalize();
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(pose.fov) / 2) * distance * aspect;
    const shiftX = -bias * halfWidth * 0.46;
    pose.pos.addScaledVector(right, shiftX);
    pose.look.addScaledVector(right, shiftX);
  }
  return pose;
}

function camFor(pose, aspect) {
  const cam = new THREE.PerspectiveCamera(pose.fov, aspect, 0.02, 48);
  cam.position.copy(pose.pos);
  cam.lookAt(pose.look);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  return cam;
}

/* --- report --------------------------------------------------------------- */

const names = ['HERO', ...DEVICES.map((d) => d.slug), 'CLOSING'];
const pad = (n) => (n >= 0 ? '+' : '') + n.toFixed(2);
let failures = 0;

for (const [label, aspect, withBias] of [
  ['desktop 16:9, two-column frame shift applied', 16 / 9, true],
  ['phone portrait, no frame shift', 390 / 780, false],
]) {
  console.log(`\n########  ${label}  ########`);
  for (let i = 0; i <= LAST_STATION; i++) {
    // chapter i-1 drives the bias; the hero and closing shots have none
    const chapter = i - 1;
    const bias = withBias && chapter >= 0 && chapter < DEVICES.length ? (chapter % 2 === 0 ? 1 : -1) : 0;
    const pose = poseFor(i, aspect, bias);
    const cam = camFor(pose, aspect);

    console.log(`\n${i} ${names[i]}   fov ${pose.fov.toFixed(1)}  bias ${bias >= 0 ? '+' : ''}${bias}`);
    for (const key of SUBJECTS[i]) {
      const ndc = MARKS[key].clone().project(cam);
      const inFrame = Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z < 1;
      /* How close to an edge, as a fraction: 0 = dead centre, 1 = on the edge.
         The bar is 0.95 rather than something safer because a subject that is
         MEANT to fill a half-width column has its outer edge at the viewport
         edge by definition — the L/R marks on the laptop screen are extents,
         not centres, and flagging those at 0.85 would just be flagging the
         layout working. Past 0.95 is a real clipping risk. */
      const edge = Math.max(Math.abs(ndc.x), Math.abs(ndc.y));
      const flag = !inFrame ? 'OFF SCREEN' : edge > 0.95 ? 'near edge' : '';
      if (!inFrame || edge > 0.95) failures++;
      console.log(`    ${key.padEnd(16)} x ${pad(ndc.x)}  y ${pad(ndc.y)}   ${flag}`);
    }
  }
}

console.log(
  failures === 0
    ? '\nOK — every chapter subject is comfortably inside the frame in both layouts.'
    : `\n${failures} subject(s) off screen or crowding an edge.`,
);
await server.close();
