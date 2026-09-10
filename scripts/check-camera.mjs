/* Sanity check for the camera walk.

   Loaded through Vite's SSR pipeline rather than plain node, because the
   module graph reaches sceneState.ts, which reads `import.meta.env`. */
import { createServer } from 'vite';
import assert from 'node:assert/strict';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const THREE = await server.ssrLoadModule('three');
const path = await server.ssrLoadModule('/src/three/bench/cameraPath.ts');
const rig = await server.ssrLoadModule('/src/three/bench/cameraRig.ts');
const layout = await server.ssrLoadModule('/src/three/bench/layout.ts');
const registry = await server.ssrLoadModule('/src/three/bench/devices/registry.tsx');

const { sampleStation, makePose, LAST_STATION, STATIONS } = path;
const { clampToRoom } = rig;
const { BENCH, SHELL } = layout;

const fmt = (v) => `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
const pose = makePose();
const before = new THREE.Vector3();

console.log(`stations ${STATIONS.length}, last ${LAST_STATION}`);
console.log(`room  x[${SHELL.minX}, ${SHELL.maxX}]  z[${SHELL.frontZ}, ${SHELL.backZ}]  y[${BENCH.floorY}, ${SHELL.ceilingY}]`);
console.log('');

const names = ['HERO', ...registry.DEVICES.map((d) => d.slug), 'CLOSING'];
for (let i = 0; i <= LAST_STATION; i++) {
  sampleStation(i, pose);
  const dist = pose.pos.distanceTo(pose.look);
  console.log(
    `${String(i).padEnd(2)} ${names[i].padEnd(20)} pos ${fmt(pose.pos)}  look ${fmt(pose.look)}  ${dist.toFixed(2)}m  fov ${pose.fov.toFixed(0)}  u ${STATIONS[i].u.toFixed(3)}  lean ${STATIONS[i].lean.length().toFixed(2)}m`,
  );
}

console.log('\n--- sweeping the whole travel ---');
let bad = 0;
let worst = 0;
let maxStep = 0;
const prev = new THREE.Vector3();
for (let t = 0; t <= LAST_STATION + 1e-6; t += 0.005) {
  sampleStation(t, pose);
  before.copy(pose.pos);
  clampToRoom(pose.pos);
  const c = before.distanceTo(pose.pos);
  if (c > worst) worst = c;
  if (c > 0.001) {
    bad++;
    if (bad <= 8) console.log(`  t=${t.toFixed(3)} clamped ${c.toFixed(3)}m from ${fmt(before)}`);
  }
  if (t > 0) maxStep = Math.max(maxStep, prev.distanceTo(pose.pos));
  prev.copy(pose.pos);
}

console.log(`\nsamples needing a clamp: ${bad}    worst correction: ${worst.toFixed(3)}m`);
console.log(`largest gap between adjacent samples: ${maxStep.toFixed(4)}m  (dt 0.005)`);
console.log(bad === 0 ? 'OK — the authored path never leaves the room or enters the bench.' : 'PATH LEAVES THE WALKABLE VOLUME');

assert.equal(bad, 0, 'The camera path must stay inside the walkable room.');

// The extra case studies must not alter the six authored homepage stations.
const { projects } = await server.ssrLoadModule('/src/data/content.ts');
const registered = [...registry.DEVICES, ...registry.ADDITIONAL_DEVICES];
assert.equal(STATIONS.length, registry.DEVICES.length + 2);
assert.equal(new Set(registered.map(d => d.slug)).size, projects.length);
for (const project of projects) assert.equal(typeof registry.deviceFor(project.slug)?.render, 'function', project.slug);

// Same target and elapsed time must settle identically at common frame rates.
const rates = [30, 60, 144];
const target = new THREE.Vector3(2, 0.4, -1);
const settled = rates.map(fps => {
  const vector = new rig.Spring3(); const scalar = new rig.Spring1();
  vector.snap(new THREE.Vector3(-1, 0, 2)); scalar.snap(32);
  for (let i = 0; i < fps; i++) { vector.step(target, 10, 1 / fps); scalar.step(46, 10, 1 / fps); }
  return { vector, scalar };
});
for (const result of settled.slice(1)) {
  assert.ok(result.vector.value.distanceTo(settled[0].vector.value) < 1e-10);
  assert.ok(Math.abs(result.scalar.value - settled[0].scalar.value) < 1e-10);
}
const stalled = new rig.Spring1(); stalled.snap(0);
for (const dt of [1/60, 0.2, 1/60, 0.5, 1/30]) {
  const previous = stalled.value; stalled.step(1, 10, dt);
  assert.ok(stalled.value >= previous && stalled.value <= 1, 'Dropped frames must settle without overshoot.');
}

const interaction = await server.ssrLoadModule('/src/three/bench/interaction.ts');
interaction.resetSceneControls(); interaction.advanceInspection(1/60, 0.7);
assert.equal(interaction.inspectionValue(0.7), 0.7);
interaction.sceneControls.demoValue = 1;
assert.equal(interaction.inspectionValue(0.7), 0.7, 'Engaging manual control must not jump.');
interaction.advanceInspection(0.1, 0.7);
assert.ok(interaction.inspectionValue(0.7) > 0.7 && interaction.inspectionValue(0.7) < 1);
interaction.resetSceneControls();
assert.equal(interaction.inspectionValue(0.4), 0.4, 'Reset hands control back to scrolling.');
console.log('PASS: 13 registered scenes, original station count, 30/60/144 Hz springs, dropped frames and manual/scroll handoff.');

await server.close();
