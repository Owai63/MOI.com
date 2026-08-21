/* ============================================================================
   render-fallback — rasterise the workbench into the static hero image
   ----------------------------------------------------------------------------
   Usage:  npm run dev   (in another terminal)
           npm run fallback

   Visitors on low-power devices, without WebGL, or with prefers-reduced-motion
   set never run the 3D scene — they get a still image instead (see
   three/SceneFallback.tsx). That image should be the same room, so this drives
   the real scene, hides the DOM over it, and captures the hero framing.

   Like render-og.mjs it talks to a locally installed Chrome over the DevTools
   protocol rather than adding a headless-browser dependency. It renders with
   SwiftShader, which is slower but produces the same image as a GPU would.
   ========================================================================== */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(here, '../public/assets/generated/hero');
const OUT = join(OUT_DIR, 'bench-fallback.webp');
const URL_BASE = process.env.SITE_URL || 'http://localhost:5173';
const PORT = 9335;
const WIDTH = 1800;
const HEIGHT = 1100;
/** How long to let the scene settle. SwiftShader is slow and the camera,
 *  materials and screens all damp into place. */
const SETTLE = Number(process.env.SETTLE || 25000);

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
mkdirSync(OUT_DIR, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'fallback-'));
const child = spawn(
  browser,
  [
    '--headless=new',
    '--hide-scrollbars',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
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
  throw new Error('Browser did not expose a DevTools page target in time.');
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
      const myId = ++id;
      pending.set(myId, { resolve: ok, reject });
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  return { ws, ready, send };
}

try {
  const page = await waitForBrowser();
  const { ws, ready, send } = connect(page.webSocketDebuggerUrl);
  await ready;
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: URL_BASE + '/' });
  await sleep(SETTLE);

  // Strip the page down to the canvas: this is scenery, not a screenshot of
  // the site, and baked-in copy would go stale the moment the text changes.
  const r = await send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return 'NO_CANVAS';
      /* Walk from the canvas up to <body>, hiding every sibling on the way.
         The app mounts into #root, so hiding only body's direct children
         hides nothing: the one child there contains the canvas. */
      let node = canvas;
      while (node && node.parentElement) {
        for (const sib of node.parentElement.children) {
          if (sib !== node && sib.tagName !== 'SCRIPT') sib.style.display = 'none';
        }
        node = node.parentElement;
        if (node === document.body) break;
      }
      document.body.style.background = '#05070a';
      return 'ok';
    })()`,
    returnByValue: true,
  });
  if (r.result.value === 'NO_CANVAS') {
    throw new Error('The page rendered no canvas — is the dev server running, and did WebGL start?');
  }
  await sleep(2500);

  const shot = await send('Page.captureScreenshot', {
    format: 'webp',
    quality: 88,
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 },
  });
  writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log(`Wrote ${OUT} (${WIDTH}x${HEIGHT})`);
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
