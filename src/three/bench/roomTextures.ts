/* ============================================================================
   roomTextures — the architectural surfaces
   ----------------------------------------------------------------------------
   Kept apart from textures.ts, which is about hardware: solder mask, copper,
   silkscreen, rating labels. This is the building.

   The whole set exists because of the lighting change. At the old level the
   room was a silhouette and a flat colour was indistinguishable from a
   surface; lit properly, a wall painted one uniform value reads as a card, and
   a floor painted one uniform value reads as a hole. What sells a real
   interior at this light level is almost entirely low-frequency variation —
   patchy paint, a scuffed floor, dirt collecting in the joints — which is
   cheap to draw and impossible to fake with a colour.

   Every map here is also given a ROUGHNESS companion rather than only an
   albedo. That matters more than the colour does: a floor that is uniformly
   glossy mirrors the ceiling lights in a perfect grid and instantly reads as
   CGI, and breaking up the roughness is what turns that grid into the smeared,
   uneven reflection a real sealed floor gives back.
   ========================================================================== */

import * as THREE from 'three';

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

function cached(key: string, make: () => THREE.Texture): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = make();
  cache.set(key, tex);
  return tex;
}

/** Free every cached texture — called when the whole scene unmounts. */
export function disposeRoomTextures() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}

function surface(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d')! };
}

function finish(
  canvas: HTMLCanvasElement,
  { srgb = true, aniso = 8, repeat = 1 }: { srgb?: boolean; aniso?: number; repeat?: number } = {},
) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = aniso;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.needsUpdate = true;
  return tex;
}

/** Soft low-frequency blotching — the single most useful mark on any of these
 *  surfaces, and the reason none of them read as a flat fill. */
function blotch(
  ctx: CanvasRenderingContext2D,
  rnd: () => number,
  count: number,
  w: number,
  h: number,
  min: number,
  max: number,
  colour: (a: number) => string,
) {
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = min + rnd() * (max - min);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.02 + rnd() * 0.07;
    g.addColorStop(0, colour(a));
    g.addColorStop(1, colour(0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/* --- floor --------------------------------------------------------------- */

/** Sealed concrete: one seamless tile covering 4m, repeated over the floor.
 *  Trowel swirl, aggregate speckle, and a saw-cut joint down two edges. */
export function floorTextures() {
  const map = cached('floor-map', () => {
    const { canvas, ctx } = surface(1024, 1024);
    const S = 1024;
    const rnd = prng(2201);

    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(0, 0, S, S);

    // trowel swirl: long, faint arcs in both directions
    for (let i = 0; i < 260; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 40 + rnd() * 260;
      const a0 = rnd() * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x, y, r, a0, a0 + 0.4 + rnd() * 1.1);
      ctx.strokeStyle = rnd() < 0.5 ? `rgba(255,255,255,${rnd() * 0.035})` : `rgba(0,0,0,${rnd() * 0.05})`;
      ctx.lineWidth = 2 + rnd() * 10;
      ctx.stroke();
    }

    blotch(ctx, rnd, 90, S, S, 60, 260, (a) => `rgba(18,22,28,${a})`);
    blotch(ctx, rnd, 50, S, S, 40, 180, (a) => `rgba(126,136,150,${a * 0.6})`);

    // exposed aggregate
    for (let i = 0; i < 5200; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 0.5 + rnd() * 1.7;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = rnd() < 0.4 ? `rgba(0,0,0,${0.1 + rnd() * 0.25})` : `rgba(190,196,206,${rnd() * 0.16})`;
      ctx.fill();
    }

    /* Saw-cut control joints on two edges, so the repeat lays a 4m grid of
       them across the floor rather than a visible tile seam. Dirt collects in
       a joint, which is why they are drawn as a dark line with a lighter
       shoulder rather than as a groove. */
    ctx.strokeStyle = 'rgba(10,12,16,0.62)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(S, 2);
    ctx.moveTo(2, 0);
    ctx.lineTo(2, S);
    ctx.stroke();

    return finish(canvas, { repeat: 1 });
  });

  const roughness = cached('floor-rough', () => {
    const { canvas, ctx } = surface(512, 512);
    const S = 512;
    const rnd = prng(2202);

    // mid grey: a sealed floor, glossy but far from a mirror
    ctx.fillStyle = '#6e6e6e';
    ctx.fillRect(0, 0, S, S);

    /* Traffic wear. Where people walk, the seal is scuffed and the floor goes
       matte; everywhere else it stays polished. This is what stops the ceiling
       fixtures reflecting as three clean rectangles. */
    blotch(ctx, rnd, 70, S, S, 30, 150, (a) => `rgba(255,255,255,${a * 3})`);
    blotch(ctx, rnd, 40, S, S, 25, 110, (a) => `rgba(0,0,0,${a * 2.2})`);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.12})`;
      ctx.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1);
    }
    // the joints are rough, not polished
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(S, 2);
    ctx.moveTo(2, 0);
    ctx.lineTo(2, S);
    ctx.stroke();

    return finish(canvas, { srgb: false, repeat: 1 });
  });

  return { map, roughness };
}

/* --- walls --------------------------------------------------------------- */

/** Painted blockwork. The block courses are what give the wall a scale — a
 *  smooth wall behind a bench could be a metre away or ten. */
export function wallTextures() {
  const map = cached('wall-map', () => {
    const { canvas, ctx } = surface(1024, 512);
    const W = 1024;
    const H = 512;
    const rnd = prng(3301);

    ctx.fillStyle = '#575e68';
    ctx.fillRect(0, 0, W, H);

    // four courses of blockwork, offset by half a block per course
    const rows = 4;
    const rowH = H / rows;
    const blockW = W / 4;
    ctx.lineWidth = 3;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      // paint variation per block, so no two are the same value
      for (let c = -1; c < 5; c++) {
        const x = c * blockW + (r % 2 ? blockW / 2 : 0);
        ctx.fillStyle = `rgba(255,255,255,${(rnd() - 0.5) * 0.05})`;
        ctx.fillRect(x, y, blockW, rowH);
      }
      // mortar
      ctx.strokeStyle = 'rgba(30,34,40,0.5)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      for (let c = -1; c < 5; c++) {
        const x = c * blockW + (r % 2 ? blockW / 2 : 0);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowH);
        ctx.stroke();
      }
    }

    // patchy paint and grime gathering low down
    blotch(ctx, rnd, 70, W, H, 40, 190, (a) => `rgba(24,28,34,${a})`);
    blotch(ctx, rnd, 40, W, H, 30, 140, (a) => `rgba(210,218,228,${a * 0.7})`);
    const grime = ctx.createLinearGradient(0, H * 0.7, 0, H);
    grime.addColorStop(0, 'rgba(16,19,24,0)');
    grime.addColorStop(1, 'rgba(16,19,24,0.42)');
    ctx.fillStyle = grime;
    ctx.fillRect(0, H * 0.7, W, H * 0.3);

    return finish(canvas, { repeat: 1 });
  });

  const roughness = cached('wall-rough', () => {
    const { canvas, ctx } = surface(512, 256);
    const rnd = prng(3302);
    // eggshell paint: rough, but not chalk
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, 512, 256);
    blotch(ctx, rnd, 50, 512, 256, 20, 90, (a) => `rgba(0,0,0,${a * 2.4})`);
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.1})`;
      ctx.fillRect(rnd() * 512, rnd() * 256, 1.4, 1.4);
    }
    return finish(canvas, { srgb: false, repeat: 1 });
  });

  return { map, roughness };
}

/* --- pegboard ------------------------------------------------------------ */

/** Perforated hardboard over the bench. The holes are drawn rather than
 *  modelled: at 25mm pitch a real board over 2.4m is nine hundred holes, and
 *  every one of them would be four triangles of nothing. */
export function pegboardTextures() {
  const PITCH = 32; // px per hole
  const map = cached('peg-map', () => {
    const { canvas, ctx } = surface(512, 512);
    const S = 512;
    const rnd = prng(4401);

    ctx.fillStyle = '#3c3227';
    ctx.fillRect(0, 0, S, S);
    // hardboard is fibrous, not smooth
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = rnd() < 0.5 ? `rgba(255,235,205,${rnd() * 0.05})` : `rgba(20,14,8,${rnd() * 0.07})`;
      ctx.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 5, 1);
    }
    blotch(ctx, rnd, 30, S, S, 40, 160, (a) => `rgba(16,11,6,${a * 1.6})`);

    for (let y = PITCH / 2; y < S; y += PITCH) {
      for (let x = PITCH / 2; x < S; x += PITCH) {
        // the hole: dark, with a lit lower lip where the light gets in
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#0b0906';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y + 1.2, 4.4, 0.25 * Math.PI, 0.75 * Math.PI);
        ctx.strokeStyle = 'rgba(196,168,128,0.34)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
    return finish(canvas, { repeat: 1 });
  });

  const roughness = cached('peg-rough', () => {
    const { canvas, ctx } = surface(256, 256);
    ctx.fillStyle = '#d2d2d2';
    ctx.fillRect(0, 0, 256, 256);
    const half = PITCH / 2;
    for (let y = half / 2; y < 256; y += half) {
      for (let x = half / 2; x < 256; x += half) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#8a8a8a';
        ctx.fill();
      }
    }
    return finish(canvas, { srgb: false, repeat: 1 });
  });

  return { map, roughness };
}

/* --- ceiling ------------------------------------------------------------- */

/** Suspended tile grid. Almost never in shot square-on, but it is what the
 *  glossy floor and the aluminium reflect, and a ceiling of flat colour makes
 *  every one of those reflections look painted on. */
export function ceilingTexture() {
  return cached('ceiling-map', () => {
    const { canvas, ctx } = surface(512, 512);
    const S = 512;
    const rnd = prng(5501);

    ctx.fillStyle = '#8d939c';
    ctx.fillRect(0, 0, S, S);
    // mineral fibre stipple
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.09})`;
      ctx.beginPath();
      ctx.arc(rnd() * S, rnd() * S, 0.6 + rnd() * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    blotch(ctx, rnd, 24, S, S, 50, 170, (a) => `rgba(120,104,72,${a * 1.4})`);

    // the T-bar grid: four tiles across the repeat
    ctx.strokeStyle = 'rgba(214,220,228,0.55)';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 2; i++) {
      const p = (i * S) / 2;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, S);
      ctx.moveTo(0, p);
      ctx.lineTo(S, p);
      ctx.stroke();
    }
    // the shadow line each bar drops onto the tile beside it
    ctx.strokeStyle = 'rgba(20,24,30,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 2; i++) {
      const p = (i * S) / 2 + 3;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, S);
      ctx.moveTo(0, p);
      ctx.lineTo(S, p);
      ctx.stroke();
    }
    return finish(canvas, { repeat: 1 });
  });
}
