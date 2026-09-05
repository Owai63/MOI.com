/* ============================================================================
   perf — what one frame of the bench actually costs
   ----------------------------------------------------------------------------
   Usage:  npm run dev     (in another terminal)
           npm run perf

   Drives a locally installed Chrome over the DevTools protocol against the dev
   server, same as scripts/render-og.mjs, and reads the numbers out of the live
   renderer at several scroll positions.

   WHAT THIS DOES AND DOES NOT MEASURE
   -----------------------------------
   Headless Chrome here has no GPU: it rasterises through SwiftShader at a
   fraction of a frame per second. Any frame RATE it reports is meaningless,
   and so is anything derived from one.

   What IS exact, and identical to what a real GPU would see:

     · renderer.info.render.calls      draw calls per frame
     · renderer.info.render.triangles  triangles submitted per frame
     · renderer.info.programs.length   compiled shader variants
     · the light count, by type

   Those four are the whole story for this scene, because the cost here is
   dominated by two multiplicative things rather than by raw geometry: three.js
   forward-renders, so EVERY lit fragment loops over EVERY light, and every
   shadow-casting light re-renders the entire scene into its map. Doubling the
   lights roughly doubles the fragment cost of the whole frame; adding a second
   shadow caster adds a whole extra pass over all that geometry. Post-processing
   passes are counted here too, since each is another full-screen pass.

   So the numbers to watch are the light count, the shadow-caster count and the
   pass count — not the triangles.
   ========================================================================== */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_UNDER_TEST = process.env.PERF_URL || 'http://localhost:5199/';
const PORT = 9334;

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const browser = CANDIDATES.find((p) => existsSync(p));
if (!browser) {
  console.error('No Chrome or Edge found. Set CHROME_PATH.');
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), 'bench-perf-'));
const child = spawn(
  browser,
  [
    '--headless=new',
    '--hide-scrollbars',
    // SwiftShader, but a real WebGL2 context — which is all we need
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--window-size=1600,900',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForBrowser() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const page = (await res.json()).find((t) => t.type === 'page');
      if (page) return page;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('No DevTools page target.');
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (!m.id || !pending.has(m.id)) return;
    const { resolve: ok, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(JSON.stringify(m.error))) : ok(m.result);
  };
  const ready = new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) =>
    new Promise((ok, reject) => {
      pending.set(++id, { resolve: ok, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  return { ws, ready, send };
}

/* Accumulate over real frames rather than sampling once.

   `renderer.info.render` is reset at the start of every render, so reading it
   from outside the loop catches whatever the LAST pass happened to submit —
   which is why a naive read reports "1 draw call" for a scene of four hundred
   meshes: the last thing drawn was a full-screen post-processing quad. Turning
   autoReset off and counting frames alongside it gives the real per-frame
   figure, including every shadow and post pass. */
const START = `(() => {
  const gl = window.__benchGl;
  const scene = window.__benchScene;
  if (!gl) return false;
  gl.info.autoReset = false;
  gl.info.reset();
  window.__perfFrames = 0;
  /* Split the frame at the scene boundary. three.js fires these around the
     main scene render, so the calls accumulated between them are geometry and
     everything after is the post chain — which is the difference between "too
     many objects" and "too many passes", and therefore between two completely
     different fixes. */
  window.__sceneCalls = 0;
  window.__sceneRenders = 0;
  let mark = 0;
  scene.onBeforeRender = () => { mark = gl.info.render.calls; };
  scene.onAfterRender = () => {
    window.__sceneCalls += gl.info.render.calls - mark;
    window.__sceneRenders++;
  };
  const tick = () => { window.__perfFrames++; window.__perfRaf = requestAnimationFrame(tick); };
  window.__perfRaf = requestAnimationFrame(tick);
  return true;
})()`;

const STOP = `(() => {
  cancelAnimationFrame(window.__perfRaf);
  const gl = window.__benchGl;
  const scene = window.__benchScene;
  const frames = Math.max(1, window.__perfFrames);
  const r = gl.info.render;
  const out = {
    frames,
    calls: r.calls / frames,
    triangles: r.triangles / frames,
    sceneCalls: window.__sceneCalls / frames,
    sceneRendersPerFrame: window.__sceneRenders / frames,
  };
  scene.onBeforeRender = () => {};
  scene.onAfterRender = () => {};
  gl.info.autoReset = true;
  return out;
})()`;

/* Who is actually being drawn.

   Wrapping `renderBufferDirect` is the only truthful way to answer this: it is
   the single funnel every draw call in three.js goes through, so a tally keyed
   on the object gives an exact per-frame breakdown — including anything drawn
   more than once, which counting `visible` objects in the graph cannot see. */
const SPY = `(() => {
  const gl = window.__benchGl;
  const orig = gl.renderBufferDirect.bind(gl);
  const tally = new Map();
  let frames = 0;
  gl.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    let chain = (object && (object.name || object.type)) || '?';
    if (object && object.material && !Array.isArray(object.material)) chain += ':' + object.material.type;
    let p = object && object.parent;
    let depth = 0;
    while (p && depth < 7) { chain = (p.name || p.type) + '>' + chain; p = p.parent; depth++; }
    tally.set(chain, (tally.get(chain) || 0) + 1);
    return orig(camera, scene, geometry, material, object, group);
  };
  const tick = () => { frames++; window.__spyRaf = requestAnimationFrame(tick); };
  window.__spyRaf = requestAnimationFrame(tick);
  window.__spyStop = () => {
    cancelAnimationFrame(window.__spyRaf);
    gl.renderBufferDirect = orig;
    const f = Math.max(1, frames);
    const rows = [...tally.entries()]
      .map(([k, v]) => [k, v / f])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14);
    return { frames: f, total: [...tally.values()].reduce((a, b) => a + b, 0) / f, rows };
  };
  return true;
})()`;

/** Everything that does not need a frame to measure. */
const PROBE = `(() => {
  const gl = window.__benchGl;
  const scene = window.__benchScene;
  if (!gl || !scene) return { error: 'scene not mounted' };

  const lights = { point: 0, spot: 0, directional: 0, hemisphere: 0, ambient: 0, rectArea: 0 };
  let shadowCasters = 0;
  let meshes = 0;
  let visibleMeshes = 0;
  let staticSubtrees = 0;
  let transparentVisible = 0;
  const kinds = { mesh: 0, instanced: 0, line: 0, points: 0, sprite: 0 };
  const materials = new Set();

  scene.traverse((o) => {
    if (o.isLight) {
      if (o.isPointLight) lights.point++;
      else if (o.isSpotLight) lights.spot++;
      else if (o.isDirectionalLight) lights.directional++;
      else if (o.isHemisphereLight) lights.hemisphere++;
      else if (o.isAmbientLight) lights.ambient++;
      else if (o.isRectAreaLight) lights.rectArea++;
      if (o.castShadow) shadowCasters++;
    }
    if (o.matrixWorldAutoUpdate === false) staticSubtrees++;
    /* Everything that produces a draw call, not just meshes. Lines, points
       and sprites are drawn too, and counting only meshes is how a scene can
       look like it should submit 390 calls and actually submit 680. */
    if (o.isMesh || o.isInstancedMesh || o.isLine || o.isPoints || o.isSprite) {
      meshes++;
      if (o.isLine) kinds.line++;
      else if (o.isPoints) kinds.points++;
      else if (o.isSprite) kinds.sprite++;
      else if (o.isInstancedMesh) kinds.instanced++;
      else kinds.mesh++;
      let vis = o.visible;
      let p = o.parent;
      while (vis && p) { vis = p.visible; p = p.parent; }
      if (vis) {
        visibleMeshes++;
        const m = o.material;
        if (m && !Array.isArray(m) && m.transparent) transparentVisible++;
      }
      const m = o.material;
      (Array.isArray(m) ? m : [m]).forEach((x) => x && materials.add(x.uuid));
    }
  });

  return {
    programs: gl.info.programs ? gl.info.programs.length : -1,
    textures: gl.info.memory.textures,
    geometries: gl.info.memory.geometries,
    lights,
    shadowCasters,
    shadowMapEnabled: gl.shadowMap.enabled,
    shadowMapType: gl.shadowMap.type,
    meshes,
    visibleMeshes,
    staticSubtrees,
    transparentVisible,
    kinds,
    materials: materials.size,
    pixelRatio: gl.getPixelRatio(),
    drawingBuffer: [gl.domElement.width, gl.domElement.height],
  };
})()`;

try {
  const page = await waitForBrowser();
  const { ws, ready, send } = connect(page.webSocketDebuggerUrl);
  await ready;
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await send('Page.navigate', { url: URL_UNDER_TEST });
  // SwiftShader needs a long time to compile this many shader variants
  await sleep(22000);

  const evaluate = async (expr) => {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails));
    return res.result.value;
  };

  const positions = [
    ['hero (station 0)', 0],
    ['first work chapter', 1],
    ['ota fleet chapter', 3],
    ['room chapter', 6],
  ];

  console.log(`
measuring ${URL_UNDER_TEST}  @ 1600x900
`);
  let first = true;
  for (const [label, station] of positions) {
    // drive the scene directly rather than by scrolling: scroll position maps
    // to a station through measured DOM bands, and we want a known station
    await evaluate(`(() => {
      const s = window.__sceneState;
      if (s) { s.station = ${station}; s.activeProject = ${Math.max(0, station - 1)}; s.build = 1; s.power = 1; s.snap = true; }
      return true;
    })()`);
    await sleep(2000);

    if (first) {
      first = false;
      const info = await evaluate(PROBE);
      if (info?.error) {
        console.log(`  ${info.error}`);
        break;
      }
      const l = info.lights;
      const lit = l.point + l.spot + l.directional;
      console.log(`  drawing buffer   ${info.drawingBuffer[0]}x${info.drawingBuffer[1]} @ dpr ${info.pixelRatio}`);
      const k = info.kinds;
      console.log(`  renderables      ${info.visibleMeshes} visible of ${info.meshes}`);
      console.log(`                   mesh ${k.mesh}, instanced ${k.instanced}, line ${k.line}, points ${k.points}, sprite ${k.sprite}`);
      console.log(`  transparent      ${info.transparentVisible} visible  (drawn in their own sorted pass)`);
      console.log(`  static subtrees  ${info.staticSubtrees}  (skipped in the per-frame matrix walk)`);
      console.log(`  materials        ${info.materials}   shader programs ${info.programs}`);
      console.log(`  textures         ${info.textures}   geometries ${info.geometries}`);
      console.log(
        `  LIGHTS           ${lit} per-fragment  (point ${l.point}, spot ${l.spot}, dir ${l.directional})` +
          `  + hemi ${l.hemisphere}, ambient ${l.ambient}`,
      );
      console.log(`  SHADOW CASTERS   ${info.shadowCasters}   (each is a full extra scene pass per frame)`);
      console.log(`  shadowMap        enabled=${info.shadowMapEnabled} type=${info.shadowMapType}
`);
    }

    await evaluate(START);
    await sleep(14000); // several SwiftShader frames
    const f = await evaluate(STOP);
    console.log(
      `  ${label.padEnd(22)} ${f.calls.toFixed(0).padStart(4)} calls/frame` +
        ` = ${f.sceneCalls.toFixed(0).padStart(4)} scene + ${(f.calls - f.sceneCalls).toFixed(0).padStart(3)} post` +
        `   (${f.sceneRendersPerFrame.toFixed(1)} scene renders/frame,` +
        ` ${f.triangles.toFixed(0)} tris, over ${f.frames} frames)`,
    );
  }

  /* Split the heaviest station into its passes. The shadow map re-renders
     every shadow-casting object in its frustum, and that is invisible in a
     single total — knowing whether 700 calls is 700 objects or 350 objects
     drawn twice is the difference between "merge the geometry" and "shrink the
     shadow frustum". */
  await evaluate(`(() => {
    const s = window.__sceneState;
    if (s) { s.station = 0; s.activeProject = 0; s.snap = true; }
    return true;
  })()`);
  await sleep(2500);
  await evaluate(SPY);
  await sleep(14000);
  const spy = await evaluate('window.__spyStop()');
  console.log('');
  console.log(`  --- hero shot, who draws what (${spy.total.toFixed(0)} calls/frame) ---`);
  for (const [chain, n] of spy.rows) {
    console.log(`  ${n.toFixed(1).padStart(6)}  ${chain}`);
  }

  console.log('');
  console.log('  --- hero shot, by pass ---');
  await evaluate(`(() => {
    const s = window.__sceneState;
    if (s) { s.station = 0; s.activeProject = 0; s.snap = true; }
    window.__benchGl.shadowMap.enabled = false;
    return true;
  })()`);
  await sleep(2500);
  await evaluate(START);
  await sleep(14000);
  const noShadow = await evaluate(STOP);
  await evaluate(`(() => { window.__benchGl.shadowMap.enabled = true; return true; })()`);
  console.log(`  without the shadow pass   draw calls/frame ${noShadow.calls.toFixed(0)}`);

  console.log('');
  ws.close();
} finally {
  child.kill();
  await sleep(400);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}
