/* ============================================================================
   scripts/translate.mts — the ONE English→Arabic pass
   ----------------------------------------------------------------------------
   English is the only side of this site anyone authors. This script takes the
   complete English surface (src/i18n/surface.ts) and makes sure every string
   in it has an Arabic counterpart in src/i18n/ar.json. That file ships with
   the bundle, so the browser never translates anything at runtime.

   Each string is translated exactly ONCE, ever: strings already present in
   ar.json (or hand-approved in curated.ar.ts) are never sent to the model
   again. Add English copy, re-run, and only the new strings cost anything.

   USAGE
     npm run translate              # translate whatever is missing
     npm run translate:check        # translate nothing; exit 1 if any is missing
     npm run translate -- --force   # re-translate everything except curated.ar.ts
     npm run translate -- --prune   # also drop entries no longer on the site

   Requires GEMINI_API_KEY (server-side only — never shipped to the browser).
   ========================================================================== */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { englishSurfaceGroups } from '../src/i18n/surface.ts';
import { curatedAr } from '../src/i18n/curated.ar.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'src', 'i18n', 'ar.json');

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const API_KEY = process.env.GEMINI_API_KEY || '';
const CHECK = process.argv.includes('--check');
const FORCE = process.argv.includes('--force');
const PRUNE = process.argv.includes('--prune');
/* Strings per request. The binding constraint on Gemini's free tier is
   requests-per-day, not tokens, so batch generously — a full 700-string run
   should cost ~12 requests, not ~30. Override with TRANSLATE_BATCH. */
const BATCH = Number(process.env.TRANSLATE_BATCH || 60);

type ArMap = Record<string, string>;

function readExisting(): ArMap {
  try {
    return JSON.parse(readFileSync(OUT, 'utf8')) as ArMap;
  } catch {
    return {};
  }
}

function write(map: ArMap): void {
  const keys = Object.keys(map).sort((a, b) => a.localeCompare(b));
  const body = keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(map[k])}`);
  writeFileSync(OUT, `{\n${body.join(',\n')}\n}\n`, 'utf8');
}

const SYSTEM = `You are a professional English to Arabic translator for a software / embedded-engineering portfolio.
Translate each item into natural Modern Standard Arabic suitable for a professional CV/portfolio.
Rules:
- Translate EVERY item. Never return an item unchanged unless it is purely an acronym, a product name, or a number.
- Keep technical acronyms and product names in Latin script (BLE, LTE-M, NB-IoT, GPS, GNSS, AWS, GCP, STM32, nRF9160, QuecOpen, EC200U, ATSAME70, ESP32, LoRa, XBee, MQTT, HTTP, FOTA, OTA, MySQL, Nginx, Zephyr, PyTorch, OpenCV, CUDA, Jira, Git, GitHub, Linux, Ubuntu, WireGuard, TLS, REST, SIM, IMEI, RF, UART, SPI, EEG, CCTV), but translate the words around them.
- Keep numbers, metrics, dates and units exactly as given.
- Preserve leading and trailing spaces, arrows, bullet separators and punctuation.
- Preserve any {placeholder} token verbatim, but move it where Arabic grammar needs it.
- Short UI labels must stay short.
Return ONLY a JSON array of strings, same length and order as the input. No commentary.`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry the transient failures (rate limits, capacity, network) with backoff.
 *  A 4xx that is not 429 is a real error and fails immediately. */
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const delays = [2000, 5000, 12000, 30000, 60000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const status = Number(/Gemini (\d{3})/.exec(msg)?.[1] ?? 0);
      const transient = status === 429 || status >= 500 || status === 0;
      if (!transient || attempt >= delays.length) throw e;
      const wait = delays[attempt];
      console.log(`\n    ${label} failed (${status || 'network'}); retrying in ${wait / 1000}s…`);
      await sleep(wait);
    }
  }
}

async function translateBatch(texts: string[]): Promise<string[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    MODEL,
  )}:generateContent?key=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(texts) }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as any;
  const raw =
    data?.candidates?.[0]?.content?.parts
      ?.map((x: any) => x.text)
      .filter(Boolean)
      .join('') ?? '[]';
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr) || arr.length !== texts.length) {
    throw new Error(`Model returned ${arr?.length} items for ${texts.length} inputs.`);
  }
  return arr.map(String);
}

async function main() {
  const groups = englishSurfaceGroups();
  const surface = [...new Set(groups.flatMap((g) => g.strings))];
  const map = readExisting();

  // curated.ar.ts is the authority; it is never machine-translated.
  const curated = new Set(Object.keys(curatedAr));
  const isDone = (s: string) => curated.has(s) || Boolean(map[s]?.trim());

  const missing = surface.filter((s) => !curated.has(s) && (FORCE || !map[s]?.trim()));

  console.log(`English surface:     ${surface.length} strings`);
  for (const g of groups) console.log(`  · ${g.name}: ${g.strings.length}`);
  console.log(`Hand-approved:       ${curated.size}`);
  console.log(`Already translated:  ${surface.filter(isDone).length}`);
  console.log(`Needing translation: ${missing.length}${FORCE ? ' (--force)' : ''}`);

  if (CHECK) {
    if (missing.length === 0) {
      console.log('\n✓ Every English string on the site has an Arabic translation.');
      return;
    }
    console.error(`\n✗ ${missing.length} string(s) have no Arabic translation:`);
    for (const g of groups) {
      const gm = g.strings.filter((s) => missing.includes(s));
      if (!gm.length) continue;
      console.error(`\n  [${g.name}] ${gm.length}`);
      for (const s of gm.slice(0, 20)) console.error(`    · ${s.slice(0, 110)}`);
      if (gm.length > 20) console.error(`    … and ${gm.length - 20} more`);
    }
    console.error('\nRun `npm run translate` to fill them.');
    process.exit(1);
  }

  if (missing.length > 0) {
    if (!API_KEY) {
      console.error(
        '✗ GEMINI_API_KEY is not set (put it in .env, or pass it inline).',
      );
      process.exit(1);
    }
    for (let i = 0; i < missing.length; i += BATCH) {
      const slice = missing.slice(i, i + BATCH);
      const label = `batch ${i + 1}-${i + slice.length}`;
      process.stdout.write(`  Translating ${i + 1}-${i + slice.length} of ${missing.length}… `);
      const out = await withRetry(label, () => translateBatch(slice));
      slice.forEach((src, k) => {
        if (out[k]?.trim()) map[src] = out[k];
      });
      console.log('done');
      write(map); // checkpoint each batch — a crash never re-bills finished work
    }
  }

  if (PRUNE) {
    const live = new Set(surface);
    const dead = Object.keys(map).filter((k) => !live.has(k));
    for (const k of dead) delete map[k];
    if (dead.length) console.log(`Pruned ${dead.length} stale entry(ies).`);
  }

  write(map);

  const stillMissing = surface.filter((s) => !isDone(s));
  console.log(`✓ Wrote ${path.relative(process.cwd(), OUT)} (${Object.keys(map).length} entries)`);
  if (stillMissing.length) {
    console.warn(`⚠ ${stillMissing.length} string(s) still untranslated — re-run to retry.`);
    process.exit(1);
  }
  console.log('✓ Every English string on the site has an Arabic translation.');
}

main().catch((e) => {
  console.error('✗ Translation failed:', e?.message ?? e);
  process.exit(1);
});
