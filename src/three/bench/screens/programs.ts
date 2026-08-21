/* ============================================================================
   programs — what the bench screens are actually running
   ----------------------------------------------------------------------------
   The chapters without a physical object are software: an OTA pipeline, a
   lifecycle database, a detection model. Their subject is a console, so the
   camera turns to a screen and the screen runs the thing.

   These are drawn on a 2D canvas rather than in GLSL, deliberately. A shader
   can fake the *look* of a console but not its content, and it is exactly the
   content — device IDs ticking over, a rollout stalling and retrying, a
   confidence figure moving — that makes a screen read as software doing work
   rather than as an animated texture.

   Every program is a pure function of elapsed time. No frame-to-frame state
   means a chapter re-entered from any direction always shows a coherent
   console, and a program can be scrubbed or restarted without bookkeeping.
   ========================================================================== */

export interface ScreenProgram {
  id: string;
  /** Draw one frame. `t` is seconds since this program became active. */
  draw(ctx: CanvasRenderingContext2D, t: number, w: number, h: number): void;
}

/* --- shared helpers ------------------------------------------------------- */

const MONO = '"SF Mono", Menlo, Consolas, monospace';
const SANS = '"Helvetica Neue", Arial, sans-serif';

const INK = '#e6edf3';
const DIM = 'rgba(203,216,227,0.45)';
const FAINT = 'rgba(203,216,227,0.16)';
const CYAN = '#3fe0d0';
const AMBER = '#f6a250';
const RED = '#ff5a49';
const GREEN = '#63d98a';

/** deterministic 0..1 from an integer */
function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function ground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#070a0f';
  ctx.fillRect(0, 0, w, h);
}

/** Window chrome: title bar with a status dot and a right-aligned clock. */
function chrome(
  ctx: CanvasRenderingContext2D,
  w: number,
  title: string,
  right: string,
  accent: string,
) {
  const barH = Math.round(w * 0.042);
  ctx.fillStyle = '#0c131d';
  ctx.fillRect(0, 0, w, barH);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(barH * 0.62, barH / 2, barH * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.font = `600 ${Math.round(barH * 0.42)}px ${SANS}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(title, barH * 1.1, barH / 2 + 1);

  ctx.fillStyle = DIM;
  ctx.font = `500 ${Math.round(barH * 0.38)}px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(right, w - barH * 0.6, barH / 2 + 1);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, barH, w, 1);
  return barH;
}

function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frac: number,
  color: string,
) {
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
}

/** mm:ss from seconds, so the clock in the title bar actually advances */
function clock(t: number) {
  const s = Math.floor(t) % 60;
  const m = Math.floor(t / 60) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ============================================================================
   OTA rollout — device-management
   ----------------------------------------------------------------------------
   A staged firmware rollout across a fleet: units download, verify, and come
   back on the new version, a few fail integrity and retry, and the batch
   progresses. This is the pipeline the chapter describes, watched from the
   dashboard side.
   ==========================================================================*/

const OTA_COLS = 12;
const OTA_ROWS = 6;
const OTA_TILES = OTA_COLS * OTA_ROWS;

type OtaState = 'pending' | 'download' | 'verify' | 'failed' | 'done';

function otaState(i: number, t: number): { state: OtaState; progress: number } {
  const start = hash(i) * 16;
  const dl = 3 + hash(i + 900) * 4;
  const verify = 1.1;
  // one in nine units fails its integrity check the first time and retries
  const flaky = hash(i + 1700) < 0.11;
  const failAt = start + dl;
  const retryGap = 1.8;

  let local = t - start;
  if (local < 0) return { state: 'pending', progress: 0 };

  if (flaky) {
    if (local < dl) return { state: 'download', progress: local / dl };
    if (local < dl + 0.5) return { state: 'failed', progress: 1 };
    if (local < dl + 0.5 + retryGap) return { state: 'pending', progress: 0 };
    local -= dl + 0.5 + retryGap;
  }
  if (local < dl) return { state: 'download', progress: local / dl };
  if (local < dl + verify) return { state: 'verify', progress: (local - dl) / verify };
  return { state: 'done', progress: 1 };
  void failAt;
}

const OTA_COLORS: Record<OtaState, string> = {
  pending: 'rgba(203,216,227,0.13)',
  download: CYAN,
  verify: AMBER,
  failed: RED,
  done: GREEN,
};

/** A rollout takes about 26s to reach every unit. The program loops a little
 *  after that, so a reader who arrives late still sees it running rather than
 *  a wall of finished tiles. */
const OTA_CYCLE = 32;

export const otaProgram: ScreenProgram = {
  id: 'ota',
  draw(ctx, tRaw, w, h) {
    const t = tRaw % OTA_CYCLE;
    ground(ctx, w, h);
    const barH = chrome(ctx, w, 'Fleet · firmware rollout', clock(t), CYAN);

    const pad = w * 0.035;
    const top = barH + pad;

    // --- headline: target version and batch ---
    ctx.fillStyle = DIM;
    ctx.font = `500 ${Math.round(w * 0.0185)}px ${MONO}`;
    ctx.fillText('TARGET', pad, top + w * 0.014);
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.round(w * 0.038)}px ${SANS}`;
    ctx.fillText('v1.4.2', pad, top + w * 0.055);

    ctx.fillStyle = DIM;
    ctx.font = `500 ${Math.round(w * 0.0185)}px ${MONO}`;
    ctx.fillText('BATCH', pad + w * 0.16, top + w * 0.014);
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.round(w * 0.038)}px ${SANS}`;
    ctx.fillText('EU-03', pad + w * 0.16, top + w * 0.055);

    // --- tallies ---
    let done = 0;
    let failed = 0;
    let active = 0;
    for (let i = 0; i < OTA_TILES; i++) {
      const s = otaState(i, t).state;
      if (s === 'done') done++;
      else if (s === 'failed') failed++;
      else if (s !== 'pending') active++;
    }

    const stats: [string, string, string][] = [
      ['UPDATED', `${done}`, GREEN],
      ['IN FLIGHT', `${active}`, CYAN],
      ['RETRYING', `${failed}`, failed ? RED : DIM],
    ];
    stats.forEach(([label, value, color], i) => {
      const x = w - pad - (2 - i) * w * 0.135 - w * 0.09;
      ctx.fillStyle = DIM;
      ctx.font = `500 ${Math.round(w * 0.0165)}px ${MONO}`;
      ctx.fillText(label, x, top + w * 0.014);
      ctx.fillStyle = color;
      ctx.font = `700 ${Math.round(w * 0.038)}px ${SANS}`;
      ctx.fillText(value, x, top + w * 0.055);
    });

    // --- overall progress ---
    const py = top + w * 0.078;
    bar(ctx, pad, py, w - pad * 2, w * 0.008, done / OTA_TILES, CYAN);
    ctx.fillStyle = DIM;
    ctx.font = `500 ${Math.round(w * 0.016)}px ${MONO}`;
    ctx.fillText(
      `${Math.round((done / OTA_TILES) * 100)}%  ·  ${done}/${OTA_TILES} units`,
      pad,
      py + w * 0.028,
    );

    // --- the fleet grid ---
    const gridTop = py + w * 0.05;
    const gridH = h - gridTop - pad * 1.6;
    const cellW = (w - pad * 2) / OTA_COLS;
    const cellH = gridH / OTA_ROWS;
    const inset = cellW * 0.09;

    for (let i = 0; i < OTA_TILES; i++) {
      const col = i % OTA_COLS;
      const row = Math.floor(i / OTA_COLS);
      const x = pad + col * cellW + inset;
      const y = gridTop + row * cellH + inset;
      const cw = cellW - inset * 2;
      const ch = cellH - inset * 2;
      const { state, progress } = otaState(i, t);

      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = state === 'pending' ? FAINT : OTA_COLORS[state];
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);

      // unit id
      ctx.fillStyle = state === 'pending' ? FAINT : 'rgba(230,237,243,0.7)';
      ctx.font = `500 ${Math.round(cellW * 0.2)}px ${MONO}`;
      ctx.fillText(`MM-${String(101 + i).padStart(3, '0')}`, x + cw * 0.08, y + ch * 0.3);

      // state strip
      if (state === 'download') {
        bar(ctx, x + cw * 0.08, y + ch * 0.6, cw * 0.84, ch * 0.13, progress, CYAN);
      } else if (state === 'verify') {
        bar(ctx, x + cw * 0.08, y + ch * 0.6, cw * 0.84, ch * 0.13, 1, AMBER);
      } else if (state === 'done') {
        ctx.fillStyle = GREEN;
        ctx.font = `600 ${Math.round(cellW * 0.19)}px ${MONO}`;
        ctx.fillText('v1.4.2', x + cw * 0.08, y + ch * 0.72);
      } else if (state === 'failed') {
        ctx.fillStyle = RED;
        ctx.font = `600 ${Math.round(cellW * 0.19)}px ${MONO}`;
        ctx.fillText('CRC FAIL', x + cw * 0.08, y + ch * 0.72);
      } else {
        ctx.fillStyle = FAINT;
        ctx.font = `500 ${Math.round(cellW * 0.19)}px ${MONO}`;
        ctx.fillText('v1.3.9', x + cw * 0.08, y + ch * 0.72);
      }
    }
  },
};

/* ============================================================================
   Lifecycle records — lifecycle-database
   ----------------------------------------------------------------------------
   Units moving through build → test → ship → field, stamped one milestone at
   a time, with the table scrolling as new serials are enrolled.
   ==========================================================================*/

const STAGES = ['BUILT', 'TESTED', 'SHIPPED', 'ACTIVE'];

export const lifecycleProgram: ScreenProgram = {
  id: 'lifecycle',
  draw(ctx, t, w, h) {
    ground(ctx, w, h);
    const barH = chrome(ctx, w, 'Device lifecycle · records', clock(t), '#8f7bf0');

    const pad = w * 0.035;
    const top = barH + pad * 0.8;

    // query bar
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(pad, top, w - pad * 2, w * 0.036);
    ctx.fillStyle = DIM;
    ctx.font = `500 ${Math.round(w * 0.018)}px ${MONO}`;
    ctx.fillText(
      'select serial, stage, stamped_at from units where batch = "EU-03"',
      pad + w * 0.014,
      top + w * 0.024,
    );

    // column headers
    const tableTop = top + w * 0.062;
    const serialW = w * 0.20;
    const colW = (w - pad * 2 - serialW) / STAGES.length;
    ctx.fillStyle = DIM;
    ctx.font = `600 ${Math.round(w * 0.0165)}px ${MONO}`;
    ctx.fillText('SERIAL', pad, tableTop);
    STAGES.forEach((s, i) => {
      ctx.fillText(s, pad + serialW + i * colW, tableTop);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.fillRect(pad, tableTop + w * 0.012, w - pad * 2, 1);

    // rows: a new serial is enrolled every 1.6s and scrolls the table up
    const rowH = w * 0.042;
    const rows = Math.floor((h - tableTop - pad * 2) / rowH);
    const enrolled = t / 1.6;
    const scroll = (enrolled % 1) * rowH;

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, tableTop + w * 0.02, w - pad * 2, h - tableTop - w * 0.02 - pad * 0.4);
    ctx.clip();

    for (let r = 0; r < rows + 1; r++) {
      const index = Math.floor(enrolled) - r;
      if (index < 0) continue;
      const y = tableTop + w * 0.048 + r * rowH - scroll;
      const age = t - index * 1.6;

      ctx.fillStyle = r % 2 ? 'rgba(255,255,255,0.022)' : 'transparent';
      ctx.fillRect(pad, y - rowH * 0.62, w - pad * 2, rowH * 0.9);

      ctx.fillStyle = INK;
      ctx.font = `500 ${Math.round(w * 0.019)}px ${MONO}`;
      ctx.fillText(`MM-01-${String(2400 + index * 7).padStart(6, '0')}`, pad, y);

      // each stage stamps in turn once the record exists
      for (let s = 0; s < STAGES.length; s++) {
        const due = 0.5 + s * 1.15;
        const x = pad + serialW + s * colW;
        if (age > due) {
          const settle = Math.min(1, (age - due) / 0.3);
          ctx.globalAlpha = settle;
          ctx.fillStyle = s === STAGES.length - 1 ? GREEN : 'rgba(143,123,240,0.9)';
          ctx.beginPath();
          ctx.arc(x + w * 0.008, y - w * 0.006, w * 0.006, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = DIM;
          ctx.font = `500 ${Math.round(w * 0.0165)}px ${MONO}`;
          const stamp = new Date(1767200000000 + index * 86400000 + s * 5400000);
          ctx.fillText(
            `${String(stamp.getUTCHours()).padStart(2, '0')}:${String(stamp.getUTCMinutes()).padStart(2, '0')}`,
            x + w * 0.022,
            y,
          );
          ctx.globalAlpha = 1;
        } else {
          ctx.strokeStyle = FAINT;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x + w * 0.008, y - w * 0.006, w * 0.006, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // running total along the bottom
    ctx.fillStyle = 'rgba(7,10,15,0.9)';
    ctx.fillRect(0, h - w * 0.038, w, w * 0.038);
    ctx.fillStyle = DIM;
    ctx.font = `500 ${Math.round(w * 0.0175)}px ${MONO}`;
    ctx.fillText(`${Math.floor(enrolled) + 1} records  ·  4 stages  ·  live`, pad, h - w * 0.014);
  },
};

/* ============================================================================
   Detection review — violence-detection
   ----------------------------------------------------------------------------
   The model's own view: tracked regions, identities and confidence over a
   neutral indoor scene. Deliberately abstract figures and neutral labels —
   this shows the inference pipeline, not an incident.
   ==========================================================================*/

interface Track {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  conf: number;
}

function tracks(t: number, w: number, h: number, top: number): Track[] {
  const out: Track[] = [];
  for (let i = 0; i < 3; i++) {
    const speed = 0.055 + hash(i + 5) * 0.05;
    const phase = hash(i + 11) * 10;
    // walk back and forth across the room on slightly different lines
    const u = 0.5 + 0.42 * Math.sin((t + phase) * speed * Math.PI * 2);
    const lane = 0.42 + hash(i + 21) * 0.36;
    const bw = w * (0.05 + lane * 0.035);
    const bh = bw * 2.3;
    out.push({
      id: 41 + i * 7,
      x: w * (0.08 + u * 0.8),
      y: top + (h - top) * lane,
      w: bw,
      h: bh,
      conf: 0.72 + 0.26 * (0.5 + 0.5 * Math.sin((t + phase) * 1.3)),
    });
  }
  return out;
}

export const visionProgram: ScreenProgram = {
  id: 'vision',
  draw(ctx, t, w, h) {
    ground(ctx, w, h);
    const barH = chrome(ctx, w, 'Detection · inference review', clock(t), AMBER);

    const stripH = w * 0.055;
    const viewTop = barH;
    const viewH = h - barH - stripH;

    // --- the scene: a neutral indoor space in perspective ---
    ctx.fillStyle = '#0b1016';
    ctx.fillRect(0, viewTop, w, viewH);
    const horizon = viewTop + viewH * 0.30;
    ctx.fillStyle = '#0e141c';
    ctx.fillRect(0, horizon, w, viewH - (horizon - viewTop));

    ctx.strokeStyle = 'rgba(150,180,210,0.10)';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 9; i++) {
      ctx.beginPath();
      ctx.moveTo(w * (i / 6), viewTop + viewH);
      ctx.lineTo(w * 0.5 + (i - 3) * w * 0.028, horizon);
      ctx.stroke();
    }
    for (let i = 1; i < 6; i++) {
      const y = horizon + Math.pow(i / 6, 2.2) * (viewH - (horizon - viewTop));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // --- tracked subjects ---
    const list = tracks(t, w, h, horizon);
    for (const k of list) {
      // the figure: an abstract standing form, not a depiction
      ctx.fillStyle = 'rgba(180,200,220,0.30)';
      ctx.beginPath();
      ctx.ellipse(k.x, k.y - k.h * 0.38, k.w * 0.20, k.w * 0.20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(k.x - k.w * 0.18, k.y - k.h * 0.25, k.w * 0.36, k.h * 0.5);

      // bounding box
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 2;
      ctx.strokeRect(k.x - k.w / 2, k.y - k.h * 0.55, k.w, k.h * 0.8);

      // corner ticks, the giveaway of a real tracker overlay
      const tick = k.w * 0.22;
      ctx.strokeStyle = '#ffd9a0';
      ctx.lineWidth = 3;
      const bx = k.x - k.w / 2;
      const by = k.y - k.h * 0.55;
      ctx.beginPath();
      ctx.moveTo(bx, by + tick); ctx.lineTo(bx, by); ctx.lineTo(bx + tick, by);
      ctx.moveTo(bx + k.w - tick, by); ctx.lineTo(bx + k.w, by); ctx.lineTo(bx + k.w, by + tick);
      ctx.stroke();

      // label
      const label = `ID ${k.id}  ${(k.conf * 100).toFixed(0)}%`;
      ctx.font = `600 ${Math.round(w * 0.0165)}px ${MONO}`;
      const tw = ctx.measureText(label).width + w * 0.014;
      ctx.fillStyle = 'rgba(10,14,20,0.85)';
      ctx.fillRect(bx, by - w * 0.028, tw, w * 0.026);
      ctx.fillStyle = AMBER;
      ctx.fillText(label, bx + w * 0.007, by - w * 0.009);
    }

    // --- inference readout ---
    ctx.fillStyle = 'rgba(8,12,18,0.8)';
    ctx.fillRect(w - w * 0.24, viewTop + w * 0.02, w * 0.21, w * 0.10);
    ctx.fillStyle = DIM;
    ctx.font = `500 ${Math.round(w * 0.0155)}px ${MONO}`;
    ctx.fillText('MODEL', w - w * 0.228, viewTop + w * 0.045);
    ctx.fillStyle = INK;
    ctx.font = `600 ${Math.round(w * 0.017)}px ${MONO}`;
    ctx.fillText('cnn-lstm · 30fps', w - w * 0.228, viewTop + w * 0.068);
    ctx.fillStyle = DIM;
    ctx.font = `500 ${Math.round(w * 0.0155)}px ${MONO}`;
    ctx.fillText(`tracks ${list.length}   latency 34ms`, w - w * 0.228, viewTop + w * 0.09);

    // --- confidence timeline along the bottom ---
    ctx.fillStyle = '#080c12';
    ctx.fillRect(0, h - stripH, w, stripH);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.moveTo(0, h - stripH);
    ctx.lineTo(w, h - stripH);
    ctx.stroke();

    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let x = 0; x < w; x += 3) {
      const u = x / w;
      const v =
        0.5 +
        0.28 * Math.sin((t * 0.6 + u * 7) * Math.PI) +
        0.1 * Math.sin((t * 1.7 + u * 19) * Math.PI);
      const y = h - stripH * 0.15 - v * stripH * 0.7;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = DIM;
    ctx.font = `500 ${Math.round(w * 0.0155)}px ${MONO}`;
    ctx.fillText('CONFIDENCE', w * 0.012, h - stripH * 0.55);
  },
};

/* ============================================================================
   Live route — mymo2
   ----------------------------------------------------------------------------
   The fleet console watching the unit that is sitting on the bench: a track
   being laid down point by point, with a geofence and the fix quality.
   ==========================================================================*/

/** A closed-ish wandering path, generated once and revealed over time. */
function routePoints(w: number, h: number, top: number) {
  const pts: [number, number][] = [];
  let x = w * 0.16;
  let y = top + (h - top) * 0.78;
  for (let i = 0; i < 46; i++) {
    const a = hash(i * 3 + 1) * Math.PI * 2;
    const step = w * 0.035;
    // biased so the track generally travels right and up across the view
    x += Math.cos(a) * step * 0.6 + step * 0.55;
    y += Math.sin(a) * step * 0.85 - step * 0.22;
    x = Math.max(w * 0.08, Math.min(w * 0.92, x));
    y = Math.max(top + (h - top) * 0.12, Math.min(h * 0.94, y));
    pts.push([x, y]);
  }
  return pts;
}

export const routeProgram: ScreenProgram = {
  id: 'route',
  draw(ctx, t, w, h) {
    ground(ctx, w, h);
    const barH = chrome(ctx, w, 'MYMO2 · live track', clock(t), CYAN);

    // map ground
    ctx.fillStyle = '#080d14';
    ctx.fillRect(0, barH, w, h - barH);
    ctx.strokeStyle = 'rgba(120,160,200,0.08)';
    ctx.lineWidth = 1;
    const step = w / 26;
    for (let x = step; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, barH); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = barH + step; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const pts = routePoints(w, h, barH);
    const head = Math.min(pts.length - 1, (t * 2.6) % (pts.length + 14));

    // geofence around the origin
    ctx.strokeStyle = 'rgba(63,224,208,0.35)';
    ctx.setLineDash([w * 0.012, w * 0.01]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], w * 0.11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // travelled track
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const whole = Math.floor(head);
    for (let i = 0; i <= whole; i++) {
      i === 0 ? ctx.moveTo(pts[i][0], pts[i][1]) : ctx.lineTo(pts[i][0], pts[i][1]);
    }
    let hx = pts[0][0];
    let hy = pts[0][1];
    if (whole < pts.length - 1) {
      const f = head - whole;
      hx = pts[whole][0] + (pts[whole + 1][0] - pts[whole][0]) * f;
      hy = pts[whole][1] + (pts[whole + 1][1] - pts[whole][1]) * f;
      ctx.lineTo(hx, hy);
    } else {
      hx = pts[whole][0];
      hy = pts[whole][1];
    }
    ctx.stroke();

    // breadcrumbs
    ctx.fillStyle = 'rgba(63,224,208,0.5)';
    for (let i = 0; i <= whole; i += 4) {
      ctx.beginPath();
      ctx.arc(pts[i][0], pts[i][1], 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // the vehicle marker, with a pulse
    const pulse = (t % 1.4) / 1.4;
    ctx.strokeStyle = `rgba(63,224,208,${(1 - pulse) * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy, w * 0.012 + pulse * w * 0.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hx, hy, w * 0.009, 0, Math.PI * 2);
    ctx.fill();

    // telemetry strip
    const panelW = w * 0.24;
    ctx.fillStyle = 'rgba(8,12,18,0.86)';
    ctx.fillRect(w - panelW - w * 0.02, barH + w * 0.02, panelW, w * 0.15);
    const rows: [string, string][] = [
      ['SPEED', `${(38 + 26 * Math.abs(Math.sin(t * 0.4))).toFixed(0)} km/h`],
      ['FIX', '3D · 11 sats'],
      ['LINK', 'LTE · -71 dBm'],
      ['IGN', 'ON'],
    ];
    rows.forEach(([k, v], i) => {
      const y = barH + w * 0.05 + i * w * 0.031;
      ctx.fillStyle = DIM;
      ctx.font = `500 ${Math.round(w * 0.0155)}px ${MONO}`;
      ctx.fillText(k, w - panelW - w * 0.008, y);
      ctx.fillStyle = INK;
      ctx.font = `600 ${Math.round(w * 0.017)}px ${MONO}`;
      ctx.fillText(v, w - panelW + w * 0.07, y);
    });
  },
};

/* ============================================================================
   Range control — shooting-range
   ----------------------------------------------------------------------------
   The operator console: lanes, target positions, and the RF link the chapter
   is about. The physical animation for this chapter is the carrier on the
   rail; this is what is driving it.
   ==========================================================================*/

export const rangeProgram: ScreenProgram = {
  id: 'range',
  draw(ctx, t, w, h) {
    ground(ctx, w, h);
    const barH = chrome(ctx, w, 'Range control · lanes', clock(t), AMBER);

    const pad = w * 0.035;
    const lanes = 5;
    const laneH = (h - barH - pad * 2.4) / lanes;

    for (let i = 0; i < lanes; i++) {
      const y = barH + pad + i * laneH;
      const phase = t * (0.24 + i * 0.055) + i * 1.3;
      // carriers run out and back along their lane
      const u = 0.5 - 0.46 * Math.cos(phase);
      const trackX = pad + w * 0.13;
      const trackW = w - trackX - pad - w * 0.16;

      ctx.fillStyle = DIM;
      ctx.font = `600 ${Math.round(w * 0.018)}px ${MONO}`;
      ctx.fillText(`LANE ${i + 1}`, pad, y + laneH * 0.58);

      // the rail
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(trackX, y + laneH * 0.5 - 1.5, trackW, 3);
      // distance ticks
      ctx.fillStyle = FAINT;
      for (let d = 0; d <= 5; d++) {
        ctx.fillRect(trackX + (trackW * d) / 5, y + laneH * 0.5 - 7, 1, 14);
      }

      // the carrier
      const cx = trackX + u * trackW;
      ctx.fillStyle = i === 2 ? AMBER : CYAN;
      ctx.fillRect(cx - w * 0.008, y + laneH * 0.5 - laneH * 0.24, w * 0.016, laneH * 0.48);

      // readouts
      ctx.fillStyle = INK;
      ctx.font = `500 ${Math.round(w * 0.0165)}px ${MONO}`;
      ctx.fillText(`${(u * 50).toFixed(1)} m`, w - pad - w * 0.12, y + laneH * 0.45);
      ctx.fillStyle = Math.sin(phase * 6) > -0.3 ? GREEN : DIM;
      ctx.font = `500 ${Math.round(w * 0.0155)}px ${MONO}`;
      ctx.fillText('ACK', w - pad - w * 0.12, y + laneH * 0.75);
    }

    // link status
    ctx.fillStyle = 'rgba(7,10,15,0.9)';
    ctx.fillRect(0, h - w * 0.038, w, w * 0.038);
    ctx.fillStyle = DIM;
    ctx.font = `500 ${Math.round(w * 0.0175)}px ${MONO}`;
    ctx.fillText(
      `XBEE API · 5 nodes · retries ${Math.floor(t / 6) % 3}  ·  OTA idle`,
      w * 0.035,
      h - w * 0.014,
    );
  },
};

/* --- registry ------------------------------------------------------------ */

export const PROGRAMS = {
  ota: otaProgram,
  lifecycle: lifecycleProgram,
  vision: visionProgram,
  route: routeProgram,
  range: rangeProgram,
} as const;

export type ProgramId = keyof typeof PROGRAMS;
