/* ============================================================================
   textures — every surface map in the bench scene, drawn on a 2D canvas
   ----------------------------------------------------------------------------
   Nothing here is downloaded. Solder mask, copper routing, silkscreen, the
   self-adhesive rating label, wood grain, the cutting mat and the screen
   contents are all rasterised once at startup and cached by key.

   Why not image files: the boards in the reference photos carry hundreds of
   legible designators and a dense routing pattern. As bitmaps that is roughly
   a megabyte per board before it looks sharp on a retina panel; as drawing
   commands it is a few hundred bytes of code that stays crisp at any zoom and
   costs ~4ms once. Textures are keyed and shared, so two boards that differ
   only in seed still cost one canvas each, never one per mesh.
   ========================================================================== */

import * as THREE from 'three';
import { keySlots, type KeyRow } from './parts/keyboardLayout';

/* --- deterministic noise -------------------------------------------------- */

/** mulberry32 — small, fast, and stable across reloads so a board always
 *  routes itself the same way. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, THREE.Texture>();

/** Cache by key so repeated devices share one upload. */
function cached(key: string, make: () => THREE.Texture): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = make();
  cache.set(key, tex);
  return tex;
}

/** Free every cached texture — called when the whole scene unmounts. */
export function disposeTextures() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}

function surface(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function finish(
  canvas: HTMLCanvasElement,
  { srgb = true, aniso = 4 }: { srgb?: boolean; aniso?: number } = {},
) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

/* ============================================================================
   PCB
   ==========================================================================*/

export interface PcbSpec {
  /** cache key + routing seed. */
  id: string;
  seed: number;
  /** pixels; aspect should match the board's physical aspect. */
  w: number;
  h: number;
  /** solder mask. The FEMC board photographs as a mid leaf-green, the
   *  Quectel-carrier board a shade darker and bluer. */
  mask: string;
  /** density of small passives, 0..1. */
  density: number;
  /** big plated mounting holes at the corners (the range board has four). */
  mountingHoles: boolean;
  /** silkscreen block in the bottom margin: maker mark + a barcode reserve. */
  legend?: string[];
}

/* Copper under green mask reads as a slightly lighter, warmer green with a
   darker outline — not as metal. These are sampled off the photographs. */
const TRACE = 'rgba(255,255,255,0.055)';
const TRACE_EDGE = 'rgba(0,0,0,0.16)';
const SILK = '#e8efe6';
const TIN = '#b9bfc4';

/** Solder-mask colour map: routing, pads, silkscreen, designators. */
function drawPcbColor(spec: PcbSpec): HTMLCanvasElement {
  const { canvas, ctx } = surface(spec.w, spec.h);
  const rnd = prng(spec.seed);
  const W = spec.w;
  const H = spec.h;

  // --- solder mask, very slightly mottled so it is not a flat fill ---
  ctx.fillStyle = spec.mask;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.014})`;
    const r = 2 + rnd() * 26;
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- ground pour: faint hatched fill over most of the board ---
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = TRACE;
  ctx.lineWidth = 1.4;
  for (let y = -H; y < H * 2; y += 7) {
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.lineTo(W + 10, y - W);
    ctx.stroke();
  }
  ctx.restore();

  /* --- routing ------------------------------------------------------------
     Real autorouted boards move in axis-aligned runs joined by 45° elbows,
     fanning out from the dense area under the main IC. Random walks with
     that constraint are indistinguishable from the photographs at the sizes
     this ever renders at. */
  const cx = W * 0.5;
  const cy = H * 0.45;
  const routes = 130;
  for (let i = 0; i < routes; i++) {
    const startAngle = rnd() * Math.PI * 2;
    const spread = 30 + rnd() * (Math.min(W, H) * 0.18);
    let x = cx + Math.cos(startAngle) * spread;
    let y = cy + Math.sin(startAngle) * spread;
    const width = rnd() < 0.12 ? 5 : rnd() < 0.4 ? 3 : 2;

    const path = new Path2D();
    path.moveTo(x, y);
    const segs = 3 + Math.floor(rnd() * 5);
    let dir = Math.floor(rnd() * 4);
    for (let s = 0; s < segs; s++) {
      const len = 18 + rnd() * 110;
      // 45° elbow before each axis change reads as proper routing
      const diag = Math.min(len * 0.3, 22);
      const dx = dir === 0 ? 1 : dir === 2 ? -1 : 0;
      const dy = dir === 1 ? 1 : dir === 3 ? -1 : 0;
      const ex = x + dx * len;
      const ey = y + dy * len;
      path.lineTo(ex - dx * diag, ey - dy * diag);
      dir = (dir + (rnd() < 0.5 ? 1 : 3)) % 4;
      const nx = dir === 0 ? 1 : dir === 2 ? -1 : 0;
      const ny = dir === 1 ? 1 : dir === 3 ? -1 : 0;
      x = ex + nx * diag;
      y = ey + ny * diag;
      path.lineTo(x, y);
      if (x < 12 || x > W - 12 || y < 12 || y > H - 12) break;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = TRACE_EDGE;
    ctx.lineWidth = width + 1.6;
    ctx.stroke(path);
    ctx.strokeStyle = TRACE;
    ctx.lineWidth = width;
    ctx.stroke(path);
  }

  // --- vias: tiny tinned rings scattered along the routing ---
  for (let i = 0; i < 220; i++) {
    const x = 14 + rnd() * (W - 28);
    const y = 14 + rnd() * (H - 28);
    ctx.beginPath();
    ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = TIN;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
  }

  /* --- footprints ---------------------------------------------------------
     Each footprint is drawn as the photographs show it: tinned pads, a white
     silkscreen outline a little larger than the part, a pin-1 dot, and a
     designator set in the smallest legible type. */
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const designator = (x: number, y: number, text: string, size = 9) => {
    ctx.fillStyle = SILK;
    ctx.font = `600 ${size}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(text, x, y);
  };

  // two-terminal passives
  const passiveCount = Math.floor(spec.density * 190);
  const prefixes = ['R', 'C', 'C', 'R', 'L', 'D'];
  for (let i = 0; i < passiveCount; i++) {
    const x = 26 + rnd() * (W - 52);
    const y = 26 + rnd() * (H - 60);
    const vertical = rnd() < 0.5;
    const bw = vertical ? 9 : 17;
    const bh = vertical ? 17 : 9;
    // pads
    ctx.fillStyle = TIN;
    if (vertical) {
      ctx.fillRect(x - bw / 2, y - bh / 2, bw, 6);
      ctx.fillRect(x - bw / 2, y + bh / 2 - 6, bw, 6);
    } else {
      ctx.fillRect(x - bw / 2, y - bh / 2, 6, bh);
      ctx.fillRect(x + bw / 2 - 6, y - bh / 2, 6, bh);
    }
    // body
    ctx.fillStyle = rnd() < 0.45 ? '#1c1c20' : '#2b2118';
    ctx.fillRect(x - (vertical ? 4 : 6), y - (vertical ? 6 : 4), vertical ? 8 : 12, vertical ? 12 : 8);
    if (rnd() < 0.5) {
      designator(x + (vertical ? 12 : 0), y + (vertical ? 0 : 11), `${prefixes[Math.floor(rnd() * prefixes.length)]}${1 + Math.floor(rnd() * 199)}`, 8);
    }
  }

  // small SOIC/SOT logic and regulators
  for (let i = 0; i < Math.floor(spec.density * 26); i++) {
    const x = 40 + rnd() * (W - 80);
    const y = 40 + rnd() * (H - 100);
    const w = 22 + rnd() * 16;
    const h = 16 + rnd() * 10;
    const pins = 3 + Math.floor(rnd() * 5);
    ctx.fillStyle = TIN;
    for (let p = 0; p < pins; p++) {
      const py = y - h / 2 + ((p + 0.5) / pins) * h;
      ctx.fillRect(x - w / 2 - 5, py - 2, 6, 4);
      ctx.fillRect(x + w / 2 - 1, py - 2, 6, 4);
    }
    ctx.fillStyle = '#141418';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(x - w / 2 + 4, y - h / 2 + 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    designator(x, y + h / 2 + 7, `U${1 + Math.floor(rnd() * 60)}`, 8);
  }

  // --- plated mounting holes: bare drilled holes with a wide tinned ring ---
  if (spec.mountingHoles) {
    const inset = Math.min(W, H) * 0.055;
    const holes: [number, number][] = [
      [inset, inset],
      [W - inset, inset],
      [inset, H - inset],
      [W - inset, H - inset],
    ];
    for (const [x, y] of holes) {
      ctx.beginPath();
      ctx.arc(x, y, 17, 0, Math.PI * 2);
      ctx.fillStyle = TIN;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#07080a';
      ctx.fill();
    }
  }

  // scattered large tinned through-hole pads, as on the range board
  for (let i = 0; i < Math.floor(spec.density * 30); i++) {
    const x = 30 + rnd() * (W - 60);
    const y = 30 + rnd() * (H - 60);
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = TIN;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fill();
  }

  // --- bottom legend: maker mark and the reserved barcode rectangle ---
  if (spec.legend?.length) {
    const bx = W * 0.42;
    const by = H - 46;
    ctx.textAlign = 'left';
    ctx.fillStyle = SILK;
    ctx.font = '700 13px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(spec.legend[0], bx, by);
    ctx.font = '500 9px "Helvetica Neue", Arial, sans-serif';
    for (let i = 1; i < spec.legend.length; i++) {
      ctx.fillText(spec.legend[i], bx, by + 12 + (i - 1) * 11);
    }
    // reserved silkscreen box for the serial barcode
    ctx.strokeStyle = SILK;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(W * 0.74, H - 52, 74, 20);
    ctx.font = '600 9px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('BARCODE HERE', W * 0.745, H - 39);
    ctx.textAlign = 'center';
  }

  // board edge: the routed rim is bare fibreglass, lighter than the mask
  ctx.strokeStyle = 'rgba(190,200,150,0.5)';
  ctx.lineWidth = 5;
  ctx.strokeRect(2.5, 2.5, W - 5, H - 5);

  return canvas;
}

/** Roughness companion: mask is semi-gloss, silkscreen matte, metal polished.
 *  Redrawing the same shapes in greyscale is cheaper and sharper than trying
 *  to derive it from the colour canvas. */
function drawPcbRough(spec: PcbSpec): HTMLCanvasElement {
  const { canvas, ctx } = surface(spec.w >> 1, spec.h >> 1);
  const rnd = prng(spec.seed);
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#4a4a4a'; // mask: fairly glossy
  ctx.fillRect(0, 0, W, H);
  // silkscreen and part bodies are matte
  for (let i = 0; i < Math.floor(spec.density * 200); i++) {
    ctx.fillStyle = 'rgba(210,210,210,0.9)';
    ctx.fillRect(rnd() * W, rnd() * H, 6, 5);
  }
  // tinned metal is the smoothest thing on the board
  for (let i = 0; i < 180; i++) {
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#2a2a2a';
    ctx.fill();
  }
  return canvas;
}

export interface PcbMaps {
  map: THREE.Texture;
  roughnessMap: THREE.Texture;
}

export function pcbTextures(spec: PcbSpec): PcbMaps {
  return {
    map: cached(`pcb:${spec.id}`, () => finish(drawPcbColor(spec), { aniso: 8 })),
    roughnessMap: cached(`pcb-r:${spec.id}`, () =>
      finish(drawPcbRough(spec), { srgb: false }),
    ),
  };
}

/* ============================================================================
   Rating label — the printed back label on the tracker enclosure
   ==========================================================================*/

export interface LabelSpec {
  id: string;
  /** product mark, large. */
  product: string;
  brand: string;
  /** small specification lines. */
  lines: string[];
  /** serial line printed on the white sub-label. */
  serial: string;
  extra: string;
}

function drawLabel(spec: LabelSpec): HTMLCanvasElement {
  const { canvas, ctx } = surface(512, 768);
  const W = canvas.width;
  const H = canvas.height;

  // moulded black ABS ground with a soft sheen down one side
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#26262a');
  g.addColorStop(0.45, '#161619');
  g.addColorStop(1, '#0e0e10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // recessed panel the printing sits inside
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 60, W - 68, H - 120);

  ctx.save();
  ctx.translate(W / 2, H / 2);

  // --- brand block ---
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(236,240,244,0.86)';
  ctx.font = '700 40px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(spec.brand, 40, 150);
  ctx.font = '600 26px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(spec.product, 40, 190);

  // --- specification block, small print ---
  ctx.textAlign = 'left';
  ctx.font = '500 15px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = 'rgba(226,232,238,0.72)';
  spec.lines.forEach((line, i) => {
    ctx.fillText(line, -190, -40 + i * 22);
  });

  ctx.font = '500 13px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = 'rgba(214,222,230,0.6)';
  ctx.fillText(spec.extra, -190, 90);

  // --- white printed sub-label with serial + QR ---
  ctx.fillStyle = '#eceff1';
  ctx.fillRect(-40, -300, 220, 150);
  ctx.fillStyle = '#111';
  ctx.font = '600 13px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(spec.serial, -30, -282);

  // QR: a deterministic block pattern with the three finder squares
  const rnd = prng(97);
  const qx = -26;
  const qy = -268;
  const cell = 4.2;
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      const finder =
        (r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7);
      const on = finder
        ? r === 0 || r === 6 || c === 0 || c === 6 || (r > 1 && r < 5 && c > 1 && c < 5)
        : rnd() < 0.48;
      if (!on) continue;
      ctx.fillRect(qx + c * cell, qy + r * cell, cell, cell);
    }
  }
  ctx.restore();

  return canvas;
}

export function labelTexture(spec: LabelSpec) {
  return cached(`label:${spec.id}`, () => finish(drawLabel(spec), { aniso: 8 }));
}

/* ============================================================================
   Bench surfaces
   ==========================================================================*/

/** Pine benchtop: the reference bench is unfinished softwood with strong
 *  cathedral grain and a few dark knots. */
export function woodTexture() {
  return cached('wood', () => {
    const { canvas, ctx } = surface(1024, 512);
    const W = canvas.width;
    const H = canvas.height;
    const rnd = prng(5150);

    ctx.fillStyle = '#a8804f';
    ctx.fillRect(0, 0, W, H);

    // long grain: sine-warped lines running the length of the board
    for (let i = 0; i < 420; i++) {
      const y0 = rnd() * H;
      const amp = 2 + rnd() * 9;
      const freq = 0.004 + rnd() * 0.01;
      const phase = rnd() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      for (let x = 0; x <= W; x += 8) {
        ctx.lineTo(x, y0 + Math.sin(x * freq + phase) * amp);
      }
      const dark = rnd() < 0.35;
      ctx.strokeStyle = dark
        ? `rgba(72,44,22,${0.06 + rnd() * 0.16})`
        : `rgba(226,190,148,${0.04 + rnd() * 0.1})`;
      ctx.lineWidth = 0.7 + rnd() * 2.4;
      ctx.stroke();
    }

    // knots
    for (let k = 0; k < 5; k++) {
      const kx = rnd() * W;
      const ky = rnd() * H;
      for (let r = 26; r > 0; r -= 2.2) {
        ctx.beginPath();
        ctx.ellipse(kx, ky, r, r * 0.55, rnd() * 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(58,34,16,${0.1 + (26 - r) / 60})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }

    // plank seams
    ctx.strokeStyle = 'rgba(40,24,12,0.5)';
    ctx.lineWidth = 2.4;
    for (const y of [H * 0.34, H * 0.68]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    return finish(canvas, { aniso: 8 });
  });
}

/** Self-healing cutting mat: dark green with a cyan grid and edge numbering,
 *  the surface both boards are photographed on. */
export function cuttingMatTexture() {
  return cached('mat', () => {
    const { canvas, ctx } = surface(1024, 768);
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#16332a';
    ctx.fillRect(0, 0, W, H);
    const rnd = prng(24);
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.02})`;
      ctx.beginPath();
      ctx.arc(rnd() * W, rnd() * H, rnd() * 18, 0, Math.PI * 2);
      ctx.fill();
    }

    const step = W / 24;
    /* The grid is a printed rule, not a light source. At full strength under
       the bench lamp the mat out-reads the device standing on it. */
    ctx.strokeStyle = 'rgba(120,190,235,0.26)';
    ctx.lineWidth = 1.4;
    for (let x = step; x < W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = step; y < H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // diagonals and the numbered rule along the top edge
    ctx.strokeStyle = 'rgba(120,190,235,0.15)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, H);
    ctx.moveTo(W, 0);
    ctx.lineTo(0, H);
    ctx.stroke();

    ctx.fillStyle = 'rgba(150,205,240,0.4)';
    ctx.font = '600 22px "Helvetica Neue", Arial, sans-serif';
    for (let i = 1; i < 24; i++) {
      if (i % 2) continue;
      ctx.fillText(String(i), i * step + 4, 26);
    }
    return finish(canvas, { aniso: 8 });
  });
}

/** Anti-static mat strip that runs across the bench in the photographs. */
export function esdMatTexture() {
  return cached('esd', () => {
    const { canvas, ctx } = surface(512, 256);
    ctx.fillStyle = '#141619';
    ctx.fillRect(0, 0, 512, 256);
    const rnd = prng(808);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.03})`;
      ctx.fillRect(rnd() * 512, rnd() * 256, 1.6, 1.6);
    }
    return finish(canvas);
  });
}

/* ============================================================================
   Screens
   ==========================================================================*/

/** Editor-style screen: a column of syntax-coloured code. Scrolled at render
 *  time by animating texture.offset, so it never costs a redraw. */
export function codeScreenTexture() {
  return cached('code', () => {
    const { canvas, ctx } = surface(768, 1024);
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#080b10';
    ctx.fillRect(0, 0, W, H);

    const rnd = prng(31337);
    const colors = ['#4fd6c0', '#e6edf3', '#f0a35e', '#7aa2f7', '#5c6773'];
    const lh = 17;
    for (let y = 10; y < H; y += lh) {
      // gutter line number
      ctx.fillStyle = '#2a323d';
      ctx.font = '500 10px "SF Mono", Menlo, Consolas, monospace';
      ctx.fillText(String(Math.floor(y / lh) + 1).padStart(3, ' '), 8, y + 10);

      let x = 44 + (rnd() < 0.35 ? 18 : 0) + (rnd() < 0.18 ? 18 : 0);
      const tokens = 2 + Math.floor(rnd() * 6);
      for (let t = 0; t < tokens; t++) {
        const w = 14 + rnd() * 78;
        if (x + w > W - 20) break;
        ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
        ctx.globalAlpha = 0.42 + rnd() * 0.5;
        ctx.fillRect(x, y + 3, w, 7);
        x += w + 8;
      }
      ctx.globalAlpha = 1;
    }
    const tex = finish(canvas);
    tex.wrapT = THREE.RepeatWrapping;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    return tex;
  });
}

/** Fleet dashboard: a dark telemetry panel — the kind of console that sits
 *  open next to a device on test. Deliberately unreadable at bench distance;
 *  it reads as shape and colour, not as data. */
export function dashboardTexture() {
  return cached('dash', () => {
    const { canvas, ctx } = surface(1024, 640);
    const W = canvas.width;
    const H = canvas.height;
    const rnd = prng(4242);

    ctx.fillStyle = '#070a0f';
    ctx.fillRect(0, 0, W, H);

    // top bar
    ctx.fillStyle = '#0d1420';
    ctx.fillRect(0, 0, W, 46);
    ctx.fillStyle = '#3fe0d0';
    ctx.fillRect(24, 18, 10, 10);
    ctx.fillStyle = 'rgba(230,240,246,0.5)';
    ctx.fillRect(48, 19, 120, 8);

    // left rail
    ctx.fillStyle = '#0b1018';
    ctx.fillRect(0, 46, 150, H - 46);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i === 1 ? 'rgba(63,224,208,0.5)' : 'rgba(200,215,225,0.16)';
      ctx.fillRect(20, 84 + i * 34, 90, 8);
    }

    // map-ish route panel
    ctx.strokeStyle = 'rgba(63,224,208,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let px = 210;
    let py = 420;
    ctx.moveTo(px, py);
    for (let i = 0; i < 22; i++) {
      px += 14 + rnd() * 20;
      py -= (rnd() - 0.35) * 40;
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    // metric tiles
    for (let i = 0; i < 3; i++) {
      const x = 680;
      const y = 90 + i * 120;
      ctx.strokeStyle = 'rgba(140,160,175,0.2)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, 300, 96);
      ctx.fillStyle = 'rgba(210,225,235,0.32)';
      ctx.fillRect(x + 18, y + 20, 90, 7);
      ctx.fillStyle = i === 0 ? '#f6a250' : '#e6edf3';
      ctx.font = '700 38px "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(`${10 + Math.floor(rnd() * 89)}`, x + 18, y + 74);
    }

    // sparkline strip along the bottom
    ctx.strokeStyle = 'rgba(246,162,80,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 200; x < W - 30; x += 6) {
      const y = 560 + Math.sin(x * 0.05) * 16 + (rnd() - 0.5) * 10;
      x === 200 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    return finish(canvas);
  });
}

/* ============================================================================
   Small parts
   ==========================================================================*/

/** Brushed-aluminium look for machined brackets and motor end bells. */
export function brushedTexture() {
  return cached('brushed', () => {
    const { canvas, ctx } = surface(512, 512);
    const rnd = prng(77);
    ctx.fillStyle = '#8f959c';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5200; i++) {
      const y = rnd() * 512;
      ctx.strokeStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '20,24,28'},${rnd() * 0.09})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(rnd() * 512, y);
      ctx.lineTo(rnd() * 512, y + (rnd() - 0.5) * 3);
      ctx.stroke();
    }
    return finish(canvas, { aniso: 8 });
  });
}

/** Textured engineering-plastic surface for the transit case shells. */
export function caseShellTexture() {
  return cached('shell', () => {
    const { canvas, ctx } = surface(512, 512);
    const rnd = prng(1212);
    ctx.fillStyle = '#9c9174';
    ctx.fillRect(0, 0, 512, 512);
    // fine moulded stipple
    for (let i = 0; i < 26000; i++) {
      const v = rnd();
      ctx.fillStyle = `rgba(${v < 0.5 ? '255,252,240' : '86,78,58'},${rnd() * 0.14})`;
      ctx.fillRect(rnd() * 512, rnd() * 512, 1.5, 1.5);
    }
    return finish(canvas, { aniso: 8 });
  });
}

/** Printed label on a shielded RF module: part number laid along the can with
 *  a data-matrix square, exactly as the cellular module is marked. */
export function moduleLabelTexture(id: string, name: string, sub: string) {
  return cached(`mod:${id}`, () => {
    const { canvas, ctx } = surface(256, 256);
    const rnd = prng(19);

    // tinned steel can under the print
    ctx.fillStyle = '#a9b0b6';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '40,46,52'},${rnd() * 0.12})`;
      ctx.fillRect(rnd() * 256, rnd() * 256, 2, 1);
    }

    // laser-etched part number, running along the long axis
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(28,32,36,0.85)';
    ctx.font = '700 30px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(name, 0, 74);
    ctx.font = '600 16px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = 'rgba(30,34,38,0.6)';
    ctx.fillText(sub, 0, 98);
    ctx.restore();

    // data-matrix square
    const cell = 4;
    const ox = 34;
    const oy = 150;
    ctx.fillStyle = '#1b1f23';
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        if (r === 15 || c === 0 || (r % 2 === 0 && c === 15) || (c % 2 === 1 && r === 0)) {
          ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell);
        } else if (rnd() < 0.45) {
          ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell);
        }
      }
    }
    return finish(canvas, { aniso: 8 });
  });
}

/** Distance plate on a range wall: a stencilled number on a reflective
 *  backing, the way a lane is actually marked out. */
export function rangeMarkerTexture(label: string) {
  return cached(`range:${label}`, () => {
    const { canvas, ctx } = surface(256, 160);
    const rnd = prng(4242);
    ctx.fillStyle = '#11151a';
    ctx.fillRect(0, 0, 256, 160);
    // retroreflective face, slightly uneven
    ctx.fillStyle = '#c9d2d8';
    ctx.fillRect(10, 10, 236, 140);
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '90,100,110'},${rnd() * 0.16})`;
      ctx.fillRect(10 + rnd() * 236, 10 + rnd() * 140, 2, 2);
    }
    ctx.strokeStyle = '#1a1f25';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, 224, 128);

    ctx.fillStyle = '#12161b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 92px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(label, 118, 82);
    ctx.font = '700 34px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('m', 206, 100);
    return finish(canvas, { aniso: 8 });
  });
}

/** Seven-segment readout on a bench instrument. Drawn as real segments rather
 *  than as text, because the give-away on a fake instrument is digits that are
 *  the wrong shape — a seven-segment 4 has an open top, and a proportional
 *  font will not do that. */
export function sevenSegTexture(value: string, unit: string) {
  return cached(`seg:${value}:${unit}`, () => {
    const { canvas, ctx } = surface(256, 100);
    ctx.fillStyle = '#07080a';
    ctx.fillRect(0, 0, 256, 100);

    // segment map per glyph: a b c d e f g
    const GLYPH: Record<string, number[]> = {
      '0': [1, 1, 1, 1, 1, 1, 0],
      '1': [0, 1, 1, 0, 0, 0, 0],
      '2': [1, 1, 0, 1, 1, 0, 1],
      '3': [1, 1, 1, 1, 0, 0, 1],
      '4': [0, 1, 1, 0, 0, 1, 1],
      '5': [1, 0, 1, 1, 0, 1, 1],
      '6': [1, 0, 1, 1, 1, 1, 1],
      '7': [1, 1, 1, 0, 0, 0, 0],
      '8': [1, 1, 1, 1, 1, 1, 1],
      '9': [1, 1, 1, 1, 0, 1, 1],
    };

    const drawDigit = (ox: number, oy: number, ch: string, w: number, h: number) => {
      const on = GLYPH[ch] ?? [0, 0, 0, 0, 0, 0, 0];
      const t = h * 0.13; // segment thickness
      const seg = (i: number, x: number, y: number, sw: number, sh: number) => {
        ctx.fillStyle = on[i] ? '#ffffff' : 'rgba(255,255,255,0.055)';
        ctx.fillRect(ox + x, oy + y, sw, sh);
      };
      seg(0, t, 0, w - t * 2, t);              // a  top
      seg(1, w - t, t, t, h / 2 - t * 1.5);    // b  upper right
      seg(2, w - t, h / 2 + t * 0.5, t, h / 2 - t * 1.5); // c lower right
      seg(3, t, h - t, w - t * 2, t);          // d  bottom
      seg(4, 0, h / 2 + t * 0.5, t, h / 2 - t * 1.5);     // e lower left
      seg(5, 0, t, t, h / 2 - t * 1.5);        // f  upper left
      seg(6, t, h / 2 - t / 2, w - t * 2, t);  // g  middle
    };

    let x = 18;
    const dw = 38;
    const dh = 62;
    for (const ch of value) {
      if (ch === '.') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, 18 + dh - 8, 8, 8);
        x += 14;
        continue;
      }
      drawDigit(x, 18, ch, dw, dh);
      x += dw + 12;
    }

    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = '700 26px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(unit, 214, 70);

    return finish(canvas);
  });
}

/* ============================================================================
   Keyboard and screen furniture
   ==========================================================================*/

/** The legends, as one transparent plane laid over the instanced caps.
 *
 *  Drawn from the same slot table the caps are placed from (parts/
 *  keyboardLayout.ts), so a letter cannot end up on the wrong key. Glyphs are
 *  white on transparent because the material tints them: on a backlit board
 *  the legend is a hole cut in the cap with the backlight behind it, not ink,
 *  and colouring it here would fight the emissive.
 */
export function keyLegendTexture(rows: KeyRow[]) {
  return cached('keys', () => {
    const W = 1024;
    const H = 460;
    const { canvas, ctx } = surface(W, H);
    ctx.clearRect(0, 0, W, H);

    for (const slot of keySlots(rows)) {
      if (!slot.label) continue;
      const x = slot.cx * W;
      const y = slot.cy * H;
      /* Legend size follows the key it is on, capped so a wide key does not
         get a huge letter — the letter on a two-unit backspace is the same
         size as the one on a 1u key. */
      const size = Math.min(slot.h * H * 0.46, 26);
      ctx.font = `500 ${size}px ui-sans-serif, system-ui, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      /* Legends sit slightly high and left of the cap centre, as they do on a
         real cap — the bottom half is where the shifted glyph would go. */
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(slot.label, x, y - slot.h * H * 0.06);
    }

    /* Nearest-neighbour would crawl as the camera moves; the default trilinear
       filter is right here, and the anisotropy matters because this plane is
       almost always seen at a grazing angle. */
    const tex = finish(canvas, { aniso: 16 });
    return tex;
  });
}

/** The glow a lit panel throws onto the air AROUND it.
 *
 *  Additively blended, so this is a mask rather than a colour — and the mask
 *  is a ring, not a disc. The first version was a disc, which meant the
 *  brightest part of the glow sat directly over the middle of the screen and
 *  added a flat wash to everything the screen was trying to show. That is the
 *  wrong physics as well as the wrong picture: a screen does not glow onto
 *  itself. The light in the air is what you see beside and in front of the
 *  bezel, so the centre is punched out to well past the edge of the panel and
 *  the ring peaks outside it.
 *
 *  The plane this is mapped to is roughly 2.2x the panel, so the panel edge
 *  falls near r = 0.45 and the ramp starts outside that. */
export function screenGlowTexture() {
  return cached('screen-glow', () => {
    const S = 256;
    const { canvas, ctx } = surface(S, S);
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.48, 'rgba(255,255,255,0)');
    g.addColorStop(0.66, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return finish(canvas);
  });
}

/** The fine vertical stripe of an LCD subpixel grid, plus the faint diffuser
 *  mottle of an anti-glare coating.
 *
 *  Used as a roughness map on the glass layer rather than as a colour: painted
 *  into the albedo it would alias into moire the moment the panel is more than
 *  a foot away, but as a roughness break-up it only ever shows as the slightly
 *  uneven sheen a matte panel gives back, which is exactly the tell that
 *  separates a screen from a lit rectangle.
 */
export function panelCoatTexture() {
  return cached('panel-coat', () => {
    const W = 512;
    const H = 512;
    const { canvas, ctx } = surface(W, H);
    const rnd = prng(7711);

    ctx.fillStyle = '#b4b4b4';
    ctx.fillRect(0, 0, W, H);

    // anti-glare diffuser: fine, dense, low-contrast speckle
    for (let i = 0; i < 26000; i++) {
      const a = rnd() * 0.16;
      ctx.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      ctx.fillRect(rnd() * W, rnd() * H, 1.4, 1.4);
    }
    // the panel's own vertical structure, very faint
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let x = 0; x < W; x += 3) ctx.fillRect(x, 0, 1, H);

    const tex = finish(canvas, { srgb: false, aniso: 8 });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}
