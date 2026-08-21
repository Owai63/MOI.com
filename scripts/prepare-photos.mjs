/* ============================================================================
   prepare-photos — downscale the bench reference photographs for the web
   ----------------------------------------------------------------------------
   Usage:  npm run photos

   Reads the originals in pics/ and writes web-sized WebP into
   public/assets/photos/. Like scripts/render-og.mjs this drives a locally
   installed Chrome over the DevTools protocol rather than adding sharp or
   Playwright as a dependency — the browser already has a very good image
   decoder and WebP encoder.

   THESE FILES ARE NOT SHIPPED BY DEFAULT, AND NOTHING BREAKS WITHOUT THEM.
   The originals are photographs of real production hardware and carry a unit
   serial number, a setup QR code and a regulatory certification number, so
   publishing them is a disclosure decision for the site's owner to make
   deliberately, not a build step that happens by itself. The 3D models on the
   bench are reconstructions and stand on their own; the bench monitors will
   simply keep showing the generated console artwork if these are absent (see
   three/bench/props/Computers.tsx).

   Run this only if you intend the photographs to be public.
   ========================================================================== */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, '../pics');
const OUT = resolve(here, '../public/assets/photos');
const PORT = 9334;
const MAX_WIDTH = 1280;
const QUALITY = 0.82;

/** source file → published name. Only these are converted. */
const PHOTOS = [
  ['tracker 1.jpeg', 'tracker-board'],
  ['tracker 3.jpeg', 'tracker-label'],
  ['tracker 6.jpeg', 'tracker-unit'],
  ['shootingrange1.jpeg', 'range-board'],
  ['shootingrange3.jpeg', 'range-open'],
  ['shootingrange4.jpeg', 'range-closed'],
];

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
  console.error('No Chrome or Edge found. Set CHROME_PATH to a Chromium-based browser.');
  process.exit(1);
}

if (!existsSync(SOURCE)) {
  console.error(`No source directory at ${SOURCE}`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'photos-'));
const child = spawn(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    // reading the originals off disk into a canvas taints it otherwise
    '--allow-file-access-from-files',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForBrowser() {
  for (let i = 0; i < 60; i++) {
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
  // a file:// page, so the images are same-origin under the flag above
  await send('Page.navigate', { url: pathToFileURL(join(SOURCE, '.')).href });
  await sleep(600);

  for (const [file, name] of PHOTOS) {
    const src = join(SOURCE, file);
    if (!existsSync(src)) {
      console.warn(`skip ${file} — not found`);
      continue;
    }
    const url = pathToFileURL(src).href;
    const expression = `new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, ${MAX_WIDTH} / img.naturalWidth);
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, c.width, c.height);
        res(JSON.stringify({ w: c.width, h: c.height, data: c.toDataURL('image/webp', ${QUALITY}) }));
      };
      img.onerror = () => rej(new Error('decode failed'));
      img.src = ${JSON.stringify(url)};
    })`;

    const r = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      console.error(`failed ${file}:`, r.exceptionDetails.exception?.description);
      continue;
    }
    const { w, h, data } = JSON.parse(r.result.value);
    const bytes = Buffer.from(data.split(',')[1], 'base64');
    const target = join(OUT, `${name}.webp`);
    writeFileSync(target, bytes);
    console.log(`${name}.webp  ${w}x${h}  ${(bytes.length / 1024).toFixed(0)} kB`);
  }

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
