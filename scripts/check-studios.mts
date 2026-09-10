import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { projects } from '../src/data/content.ts';
import { IMAGE_VISUALS } from '../src/data/projectVisuals.ts';
import { studios, stepAt } from '../src/three/studio/catalog.ts';
import { studioAr } from '../src/three/studio/ar.ts';

// Guard the catalogue contract: a future project must not silently get a
// generic or missing studio, inaccessible controls, or a broken fallback.
assert.equal(projects.length, 13);
assert.deepEqual(Object.keys(studios).sort(), projects.map(p => p.slug).sort());
for (const project of projects) {
  const spec = studios[project.slug];
  assert.ok(spec.steps.length >= 3, `${project.slug}: inspectable states`);
  for (const copy of [spec.title, spec.description, spec.control, ...spec.steps, ...spec.labels]) {
    assert.ok(studioAr[copy]?.trim(), `${project.slug}: missing Arabic for ${copy}`);
  }
  assert.ok(existsSync(`public${IMAGE_VISUALS[project.slug]!.src}`), `${project.slug}: fallback image`);
  assert.equal(stepAt(0, spec.steps), 0);
  assert.equal(stepAt(1, spec.steps), spec.steps.length - 1);
}
console.log('PASS: 13/13 project studios, control endpoints, Arabic copy and fallback assets.');
