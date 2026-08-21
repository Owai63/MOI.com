/* ============================================================================
   render-og — rasterise scripts/og.html into the Open Graph share image
   ----------------------------------------------------------------------------
   Usage:  npm run og

   Drives a locally installed Chrome or Edge over the DevTools protocol, so no
   extra dependency (Playwright/Puppeteer/sharp) is needed. Output overwrites
   public/assets/generated/social/portfolio-og.webp at exactly 1200x630, the
   size declared in index.html.
   ========================================================================== */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, 'og.html');
const output = resolve(here, '../public/assets/generated/social/portfolio-og.webp');
const PORT = 9333;
const WIDTH = 1200;
const HEIGHT = 630;

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
  console.error(
    'No Chrome or Edge found. Set CHROME_PATH to a Chromium-based browser executable.',
  );
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), 'og-render-'));
const child = spawn(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll until the DevTools endpoint answers, so we never race the launch. */
async function waitForBrowser() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: pathToFileURL(source).href });
  await sleep(3500); // webfonts + the background image

  const shot = await send('Page.captureScreenshot', {
    format: 'webp',
    quality: 92,
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 },
  });
  writeFileSync(output, Buffer.from(shot.data, 'base64'));
  console.log(`Wrote ${output} (${WIDTH}x${HEIGHT})`);
  ws.close();
} finally {
  child.kill();
  await sleep(400);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* profile cleanup is best-effort */
  }
}
