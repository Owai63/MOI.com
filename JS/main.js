/* ============================================================
   MOI.ENG Portfolio — Main JavaScript
   Author : Muhammad Owais Iqbal Malik
   Version: 4.0
   ============================================================ */

const GH_USERNAME = 'owai63';

/* ══════════════════════════════════════════
   BOOT SEQUENCE  (longer / more lines)
══════════════════════════════════════════ */
const bootLines = [
  { t: 'MOI.ENG PORTFOLIO OS v4.0 — INITIALIZING …',             d:   0 },
  { t: 'CPU: ARM Cortex-M4 @ 168 MHz ................. <span class="ok">[READY]</span>',  d: 220 },
  { t: 'Loading embedded firmware modules ........... <span class="ok">[OK]</span>',      d: 440 },
  { t: 'Mounting hardware abstraction layer .......... <span class="ok">[OK]</span>',      d: 650 },
  { t: 'Bootstrapping BLE / GPS / LTE-M stack ........ <span class="ok">[OK]</span>',     d: 860 },
  { t: 'Initialising nRF9160 SiP module .............. <span class="ok">[OK]</span>',     d: 1060 },
  { t: 'Calibrating ATSAME70 peripherals ............. <span class="ok">[OK]</span>',     d: 1250 },
  { t: 'Connecting to AWS cloud backend .............. <span class="ok">[OK]</span>',     d: 1440 },
  { t: 'Validating cryptographic signatures .......... <span class="ok">[OK]</span>',     d: 1620 },
  { t: 'Enabling FOTA OTA update channel ............. <span class="ok">[OK]</span>',     d: 1800 },
  { t: 'Mounting RTOS task scheduler ................. <span class="ok">[OK]</span>',     d: 1970 },
  { t: 'Syncing GPS almanac data ..................... <span class="warn">[WAIT]</span>',  d: 2140 },
  { t: 'GPS almanac sync ............................ <span class="ok">[OK]</span>',       d: 2360 },
  { t: 'Running self-diagnostics ..................... <span class="ok">[PASS]</span>',    d: 2540 },
  { t: '',                                                         d: 2680 },
  { t: '<span class="ok">ALL SYSTEMS NOMINAL.</span> Welcome, Engineer.',               d: 2740 },
];

const blWrap = document.getElementById('boot-lines');
bootLines.forEach(({ t, d }) => {
  setTimeout(() => {
    const div = document.createElement('div');
    div.className = 'bl';
    div.innerHTML = t;
    blWrap.appendChild(div);
    blWrap.scrollTop = blWrap.scrollHeight;
  }, d);
});

// Dismiss boot screen after all lines have appeared + short pause
setTimeout(() => {
  document.getElementById('boot').classList.add('out');
  setTimeout(() => (document.getElementById('boot').style.display = 'none'), 950);
}, 3300);


/* ══════════════════════════════════════════
   CUSTOM CURSOR
══════════════════════════════════════════ */
const cd = document.getElementById('cd');
const cr = document.getElementById('cr');
const cx = document.getElementById('cx');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

(function animateCursor() {
  if (cd) { cd.style.left = mx + 'px'; cd.style.top = my + 'px'; }
  rx += (mx - rx) * 0.14;
  ry += (my - ry) * 0.14;
  if (cr) { cr.style.left = rx + 'px'; cr.style.top = ry + 'px'; }
  if (cx) { cx.style.left = mx + 'px'; cx.style.top = my + 'px'; }
  requestAnimationFrame(animateCursor);
})();

function bindCursor() {
  if (!cd || window.matchMedia('(hover:none),(pointer:coarse)').matches) return;
  document.querySelectorAll('a,button,[onclick],.tli-hdr,.pc-flip,.cf,.aw-c,.hstat,.sk-pill,.ttag').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cd.style.transform = 'translate(-50%,-50%) scale(2.5)';
      cr.style.width = '50px'; cr.style.height = '50px';
      cr.style.opacity = '.2'; cr.style.background = 'rgba(0,255,224,.04)';
    });
    el.addEventListener('mouseleave', () => {
      cd.style.transform = 'translate(-50%,-50%) scale(1)';
      cr.style.width = '28px'; cr.style.height = '28px';
      cr.style.opacity = '.4'; cr.style.background = 'transparent';
    });
  });
}


/* ══════════════════════════════════════════
   MOUSE TRAIL CANVAS
══════════════════════════════════════════ */
(function initTrail() {
  const canvas = document.getElementById('trail-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  const pts = [];
  document.addEventListener('mousemove', e => {
    pts.push({
      x: e.clientX, y: e.clientY, a: 1,
      r: Math.random() * 3 + 1.5,
      c: Math.random() < .15 ? '255,62,108' : Math.random() < .2 ? '127,255,200' : '0,255,224'
    });
  });

  function drawTrail() {
    ctx.clearRect(0, 0, W, H);
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      p.a -= 0.028;
      if (p.a <= 0) { pts.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.a, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},${p.a * .6})`;
      ctx.fill();
    }
    requestAnimationFrame(drawTrail);
  }
  drawTrail();
})();


/* ══════════════════════════════════════════
   CLICK BURST + RIPPLE
══════════════════════════════════════════ */
document.addEventListener('click', e => {
  // burst particles
  const N = 12;
  for (let i = 0; i < N; i++) {
    const el   = document.createElement('div');
    const ang  = (i / N) * Math.PI * 2;
    const dist = 40 + Math.random() * 40;
    const colors = ['var(--a)', 'var(--a2)', 'var(--gr)', 'var(--pur)'];
    const col  = colors[Math.floor(Math.random() * colors.length)];
    Object.assign(el.style, {
      position: 'fixed', left: e.clientX + 'px', top: e.clientY + 'px',
      width: '4px', height: '4px', borderRadius: '50%',
      background: col, boxShadow: `0 0 8px ${col}`,
      pointerEvents: 'none', zIndex: 9993,
      transition: 'all 0.5s cubic-bezier(.2,0,.8,1)',
      transform: 'translate(-50%,-50%)'
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transform = `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(0)`;
      el.style.opacity = '0';
    }));
    setTimeout(() => el.remove(), 520);
  }

  // ripple on interactive elements
  const target = e.target.closest('a,button,.mbtn,.tli-hdr');
  if (target) {
    const r   = target.getBoundingClientRect();
    const rip = document.createElement('span');
    rip.className = 'ripple';
    const size = Math.max(r.width, r.height) * 2;
    Object.assign(rip.style, {
      width:  size + 'px', height: size + 'px',
      left:   (e.clientX - r.left - size / 2) + 'px',
      top:    (e.clientY - r.top  - size / 2) + 'px'
    });
    target.style.position = 'relative';
    target.appendChild(rip);
    setTimeout(() => rip.remove(), 650);
  }
});


/* ══════════════════════════════════════════
   CIRCUIT BOARD CANVAS (background)
══════════════════════════════════════════ */
(function initCircuit() {
  const canvas = document.getElementById('cc');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [], paths = [], electrons = [];

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', () => { resize(); build(); });

  function build() {
    nodes = []; paths = []; electrons = [];
    const gx = Math.ceil(W / 75), gy = Math.ceil(H / 75);
    for (let i = 0; i <= gx; i++) for (let j = 0; j <= gy; j++) {
      if (Math.random() < .42)
        nodes.push({ x: i * 75 + Math.random() * 14 - 7, y: j * 75 + Math.random() * 14 - 7 });
    }
    nodes.forEach((n, i) => nodes.forEach((m, j) => {
      if (i >= j) return;
      const dx = Math.abs(n.x - m.x), dy = Math.abs(n.y - m.y);
      if (Math.random() < .14 && dx < 165 && dy < 165 && (dx < 25 || dy < 25))
        paths.push({ a: n, b: m, al: Math.random() * .3 + .08 });
    }));
    paths.forEach(p => {
      if (Math.random() < .35)
        electrons.push({
          p, t: Math.random(),
          sp:  Math.random() * .0028 + .0009,
          dir: Math.random() < .5 ? 1 : -1,
          c:   Math.random() < .15 ? '255,62,108' : Math.random() < .2 ? '0,255,136' : '0,255,224'
        });
    });
  }
  build();

  function draw() {
    ctx.clearRect(0, 0, W, H);
    paths.forEach(p => {
      ctx.beginPath(); ctx.moveTo(p.a.x, p.a.y); ctx.lineTo(p.b.x, p.b.y);
      ctx.strokeStyle = `rgba(0,255,200,${p.al * .35})`; ctx.lineWidth = .7; ctx.stroke();
    });
    nodes.forEach(n => {
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,255,200,.3)'; ctx.fill();
    });
    electrons.forEach(e => {
      e.t += e.sp * e.dir;
      if (e.t > 1) e.t = 0; if (e.t < 0) e.t = 1;
      const x = e.p.a.x + (e.p.b.x - e.p.a.x) * e.t;
      const y = e.p.a.y + (e.p.b.y - e.p.a.y) * e.t;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 5);
      g.addColorStop(0, `rgba(${e.c},.95)`); g.addColorStop(1, `rgba(${e.c},0)`);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();


/* ══════════════════════════════════════════
   FLOATING PARTICLES (hero section)
══════════════════════════════════════════ */
(function spawnParticles() {
  const wrap = document.getElementById('fpw');
  if (!wrap) return;
  const colors = ['rgba(0,255,224,.35)', 'rgba(0,255,136,.25)', 'rgba(127,255,255,.2)', 'rgba(255,62,108,.15)'];
  for (let i = 0; i < 28; i++) {
    const d   = document.createElement('div');
    d.className = 'fp';
    const size = Math.random() * 3 + 1;
    const col  = colors[Math.floor(Math.random() * colors.length)];
    const tx   = (Math.random() - 0.5) * 120;
    Object.assign(d.style, {
      width: size + 'px', height: size + 'px',
      background: col, boxShadow: `0 0 ${size * 3}px ${col}`,
      left: Math.random() * 100 + '%', bottom: '-10px',
      '--fx': tx + 'px',
      '--fdur': (Math.random() * 14 + 8) + 's',
      '--fdel': '-' + (Math.random() * 12) + 's'
    });
    wrap.appendChild(d);
  }
})();


/* ══════════════════════════════════════════
   SCROLL PROGRESS BAR
══════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  const spb = document.getElementById('spb');
  if (spb) spb.style.width = pct + '%';
  updateActiveNav();
}, { passive: true });


/* ══════════════════════════════════════════
   ACTIVE NAV HIGHLIGHT
══════════════════════════════════════════ */
function updateActiveNav() {
  const secs = ['experience','skills','projects','github','education','awards','certifications','opento','contact'];
  let cur = '';
  secs.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= 80) cur = id;
  });
  document.querySelectorAll('.nlinks a').forEach(a => {
    a.classList.toggle('active', a.dataset.sec === cur);
  });
}


/* ══════════════════════════════════════════
   PARALLAX BLOBS (mouse-driven)
══════════════════════════════════════════ */
document.addEventListener('mousemove', e => {
  const cxW = window.innerWidth / 2, cyW = window.innerHeight / 2;
  const dx = (e.clientX - cxW) / cxW, dy = (e.clientY - cyW) / cyW;
  const l1 = document.getElementById('hl1');
  const l2 = document.getElementById('hl2');
  const l3 = document.getElementById('hl3');
  if (l1) l1.style.transform = `translate(${dx *  30}px,${dy *  20}px)`;
  if (l2) l2.style.transform = `translate(${dx * -22}px,${dy * -16}px)`;
  if (l3) l3.style.transform = `translate(${dx *  18}px,${dy *  24}px)`;
  // orb subtle 3-D tilt
  const orb = document.getElementById('orb');
  if (orb) orb.style.transform = `perspective(800px) rotateX(${dy * 6}deg) rotateY(${dx * 6}deg)`;
});


/* ══════════════════════════════════════════
   HERO STAT SPOTLIGHT (mouse glow)
══════════════════════════════════════════ */
document.querySelectorAll('.hstat').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100) + '%');
    card.style.setProperty('--my', ((e.clientY - r.top)  / r.height * 100) + '%');
  });
});


/* ══════════════════════════════════════════
   PROJECT CARD 3-D TILT + SPOTLIGHT
══════════════════════════════════════════ */



/* ══════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════ */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
      // light up section divider line
      const sl = e.target.closest('section')?.querySelector('.sl');
      if (sl) setTimeout(() => sl.classList.add('lit'), 200);
    }
  });
}, { threshold: .07 });
document.querySelectorAll('.rv,.rv-l,.rv-s').forEach(el => io.observe(el));


/* ══════════════════════════════════════════
   SKILL PILL STAGGER ENTRANCE
══════════════════════════════════════════ */
const pillIo = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.sk-pill').forEach((p, i) => {
        setTimeout(() => p.classList.add('in'), i * 35);
      });
      e.target.classList.add('lit');
      pillIo.unobserve(e.target);
    }
  });
}, { threshold: .15 });
document.querySelectorAll('.sk-grp').forEach(g => pillIo.observe(g));


/* ══════════════════════════════════════════
   TEXT SCRAMBLE (section headings)
══════════════════════════════════════════ */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$<>[]{}';

function scramble(el, original, dur = 700) {
  let frame = 0, total = Math.ceil(dur / 50);
  const id = setInterval(() => {
    const progress = frame / total;
    let out = '';
    for (let i = 0; i < original.length; i++) {
      if (original[i] === ' ') { out += ' '; continue; }
      if (Math.random() < progress) {
        out += `<span style="color:var(--a)">${original[i]}</span>`;
      } else {
        out += `<span style="color:rgba(0,255,224,.3)">${CHARS[Math.floor(Math.random() * CHARS.length)]}</span>`;
      }
    }
    el.innerHTML = out;
    if (++frame > total) { clearInterval(id); el.innerHTML = original; }
  }, 50);
}

const shIo = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target.querySelector('.st');
      if (el && el.dataset.text) scramble(el, el.dataset.text);
      shIo.unobserve(e.target);
    }
  });
}, { threshold: .3 });
document.querySelectorAll('section').forEach(s => shIo.observe(s));


/* ══════════════════════════════════════════
   ANIMATED COUNTERS (hero stats)
══════════════════════════════════════════ */
function animCount(el, target, dec, suf) {
  const dur = 1600; let start = null;
  function tick(ts) {
    if (!start) start = ts;
    const prog = Math.min((ts - start) / dur, 1);
    const ease = 1 - Math.pow(1 - prog, 3);
    const v    = ease * target;
    el.textContent = dec ? (v / 100).toFixed(2) : Math.round(v) + (prog >= 1 ? suf : '');
    if (prog < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const cio = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('[data-target]').forEach(el => {
        const t   = +el.dataset.target;
        const dec = 'dec' in el.dataset;
        const suf = el.dataset.suf || '';
        animCount(el, dec ? 359 : t, dec, suf);
      });
      cio.unobserve(e.target);
    }
  });
}, { threshold: .3 });
const hs = document.querySelector('.hstats');
if (hs) cio.observe(hs);


/* ══════════════════════════════════════════
   TYPEWRITER (hero subtitle)
══════════════════════════════════════════ */
const roles = [
  'Firmware Engineer', 'IoT Architect', 'Embedded Developer',
  'Cloud Integrator',  'Systems Engineer', 'nRF9160 Specialist',
  'Systems Administrator', 'IoT Solutions Engineer'
];
let ri = 0, ci = 0, deleting = false;
const typEl = document.getElementById('htyp');

function typeIt() {
  if (!typEl) return;
  const cur = roles[ri];
  if (!deleting) {
    typEl.textContent = cur.slice(0, ci + 1); ci++;
    if (ci >= cur.length) { deleting = true; setTimeout(typeIt, 1900); return; }
    setTimeout(typeIt, 72);
  } else {
    typEl.textContent = cur.slice(0, ci - 1); ci--;
    if (ci <= 0) { deleting = false; ri = (ri + 1) % roles.length; setTimeout(typeIt, 380); return; }
    setTimeout(typeIt, 38);
  }
}
// start typewriter after boot screen clears
setTimeout(typeIt, 3600);


/* ══════════════════════════════════════════
   EXPERIENCE ACCORDION
══════════════════════════════════════════ */
function tlToggle(hdr) {
  const item = hdr.closest('.tli');
  const tg   = hdr.querySelector('.tli-tg');
  item.classList.toggle('open');
  tg.textContent = item.classList.contains('open') ? '[ collapse ]' : '[ expand ]';
}


/* ══════════════════════════════════════════
   MOBILE NAV
══════════════════════════════════════════ */
function toggleMenu() {
  document.getElementById('nbtn').classList.toggle('open');
  const d = document.getElementById('ndrawer');
  d.classList.toggle('open');
  document.body.style.overflow = d.classList.contains('open') ? 'hidden' : '';
}
function closeMenu() {
  document.getElementById('nbtn').classList.remove('open');
  document.getElementById('ndrawer').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('nbtn').addEventListener('click', toggleMenu);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

if (window.innerWidth <= 1023) document.getElementById('nbtn').style.display = 'flex';
window.addEventListener('resize', () => {
  document.getElementById('nbtn').style.display = window.innerWidth <= 1023 ? 'flex' : 'none';
  bindCursor();
});


/* ══════════════════════════════════════════
   MAGNETIC BUTTONS
══════════════════════════════════════════ */
document.querySelectorAll('.mbtn').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const r  = btn.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) * .22;
    const dy = (e.clientY - r.top  - r.height / 2) * .22;
    btn.style.transform = `translate(${dx}px,${dy}px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
});


/* ══════════════════════════════════════════
   RADAR CHART (skills section)
══════════════════════════════════════════ */
(function drawRadar() {
  const canvas = document.getElementById('radar');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 340, H = 340, cx = W / 2, cy = H / 2, R = 120;
  const labels = ['Firmware', 'IoT', 'Cloud', 'Hardware', 'ML/AI', 'Web Dev'];
  const vals   = [0.92, 0.88, 0.75, 0.85, 0.65, 0.55];
  const N = labels.length;
  let animPct = 0;

  function ang(i) { return (i / N) * Math.PI * 2 - Math.PI / 2; }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const pct = Math.min(animPct, 1);

    // grid rings
    for (let r = 1; r <= 5; r++) {
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const a = ang(i), rv = r / 5 * R;
        i === 0 ? ctx.moveTo(cx + Math.cos(a)*rv, cy + Math.sin(a)*rv)
                : ctx.lineTo(cx + Math.cos(a)*rv, cy + Math.sin(a)*rv);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(0,255,224,${r === 5 ? .12 : .06})`; ctx.lineWidth = 1; ctx.stroke();
    }
    // axes
    for (let i = 0; i < N; i++) {
      const a = ang(i);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a)*R, cy + Math.sin(a)*R);
      ctx.strokeStyle = 'rgba(0,255,224,.08)'; ctx.lineWidth = 1; ctx.stroke();
    }
    // data polygon
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = ang(i), v = vals[i] * R * pct;
      i === 0 ? ctx.moveTo(cx + Math.cos(a)*v, cy + Math.sin(a)*v)
              : ctx.lineTo(cx + Math.cos(a)*v, cy + Math.sin(a)*v);
    }
    ctx.closePath();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, 'rgba(0,255,224,.3)');
    grad.addColorStop(1, 'rgba(0,255,224,.03)');
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = 'rgba(0,255,224,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    // dots + glows
    for (let i = 0; i < N; i++) {
      const a = ang(i), v = vals[i] * R * pct;
      const x = cx + Math.cos(a)*v, y = cy + Math.sin(a)*v;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2);
      ctx.fillStyle = 'var(--a)'; ctx.fill();
      const glw = ctx.createRadialGradient(x, y, 0, x, y, 10);
      glw.addColorStop(0, 'rgba(0,255,224,.5)'); glw.addColorStop(1, 'rgba(0,255,224,0)');
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2); ctx.fillStyle = glw; ctx.fill();
    }
    // labels
    ctx.font = "bold 10px 'Share Tech Mono'"; ctx.fillStyle = 'rgba(0,255,224,.7)'; ctx.textAlign = 'center';
    for (let i = 0; i < N; i++) {
      const a = ang(i);
      ctx.fillText(labels[i].toUpperCase(), cx + Math.cos(a)*(R+22), cy + Math.sin(a)*(R+22) + 4);
    }
    if (pct < 1) { animPct += .025; requestAnimationFrame(draw); }
  }

  const rIo = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { animPct = 0; draw(); rIo.unobserve(e.target); }
    });
  }, { threshold: .3 });
  rIo.observe(canvas);
})();


/* ══════════════════════════════════════════
   AUDIO VISUALISER BARS (awards cards)
══════════════════════════════════════════ */
['aviz-g', 'aviz-s'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  for (let i = 0; i < 18; i++) {
    const b = document.createElement('div');
    b.className = 'aviz-bar';
    const h = Math.random() * 32 + 5;
    Object.assign(b.style, {
      '--avh': h + 'px',
      '--avd': (Math.random() * .5 + .25) + 's',
      '--avdl': '-' + (Math.random() * .4) + 's'
    });
    el.appendChild(b);
  }
});


/* ══════════════════════════════════════════
   GITHUB INTEGRATION
══════════════════════════════════════════ */
const LC = {
  'C':'#555599','C++':'#f34b7d','Python':'#3572A5','JavaScript':'#f1e05a',
  'TypeScript':'#2b7489','HTML':'#e34c26','CSS':'#563d7c','Shell':'#89e051',
  'Makefile':'#427819','Assembly':'#6E4C13','Verilog':'#b2b7f8','MATLAB':'#e16737',
  'Rust':'#dea584','Go':'#00ADD8','Arduino':'#bd79d1','Dockerfile':'#384d54',
  'CMake':'#DA3434','Jupyter Notebook':'#DA5B0B'
};
let allRepos = [];

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function ago(d) {
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30)  return days + 'd ago';
  const m = Math.floor(days / 30);
  return m < 12 ? m + 'mo ago' : Math.floor(m / 12) + 'y ago';
}

function renderRepos(repos) {
  const g = document.getElementById('gh-grid');
  if (!repos || !repos.length) {
    g.innerHTML = '<div class="gh-emp"><div style="font-size:30px;margin-bottom:10px;opacity:.4">📭</div>No repositories found.</div>';
    return;
  }
  g.innerHTML = repos.map(r => {
    const lang  = r.language || '';
    const col   = LC[lang] || 'var(--mu)';
    const desc  = r.description
      ? (r.description.length > 105 ? r.description.slice(0,105)+'…' : r.description)
      : '<em style="opacity:.3">No description</em>';
    const topics = (r.topics || []).slice(0, 3);
    return `<a class="ghc" href="${esc(r.html_url)}" target="_blank" rel="noopener">
      <div class="ghc-h">
        <div class="ghc-nm">${esc(r.name)}</div>
        ${r.fork ? '<span class="ghc-fb">Fork</span>' : ''}
      </div>
      <div class="ghc-ds">${desc}</div>
      ${topics.length ? `<div class="ttags" style="margin:0 0 10px">${topics.map(t=>`<span class="ttag">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="ghc-mt">
        ${lang ? `<div class="ghm"><span class="ghld" style="background:${col}"></span>${esc(lang)}</div>` : ''}
        ${r.stargazers_count > 0 ? `<div class="ghm">★ ${r.stargazers_count}</div>` : ''}
        ${r.forks_count      > 0 ? `<div class="ghm">⑂ ${r.forks_count}</div>`      : ''}
        <div class="ghm">↻ ${ago(r.updated_at)}</div>
      </div>
      <span class="ghcv">View on GitHub ↗</span>
    </a>`;
  }).join('');
  bindCursor();
}

function filterRepos(type, btn) {
  document.querySelectorAll('.ghf').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  let list = [...allRepos];
  if (type === 'fork')    list = list.filter(r => r.fork);
  if (type === 'source')  list = list.filter(r => !r.fork);
  if (type === 'starred') list = [...list].sort((a,b) => b.stargazers_count - a.stargazers_count).slice(0,12);
  renderRepos(list);
}

async function loadGH() {
  try {
    const [uR, rR] = await Promise.all([
      fetch(`https://api.github.com/users/${GH_USERNAME}`),
      fetch(`https://api.github.com/users/${GH_USERNAME}/repos?per_page=100&sort=updated`)
    ]);
    if (!uR.ok) throw new Error();
    const u = await uR.json(), repos = rR.ok ? await rR.json() : [];
    document.getElementById('gh-av').src             = u.avatar_url || '';
    document.getElementById('gh-nm').textContent     = u.name || u.login;
    document.getElementById('gh-bi').textContent     = u.bio  || ('@' + u.login);
    document.getElementById('gh-rp').textContent     = u.public_repos ?? '—';
    document.getElementById('gh-fl').textContent     = u.followers   ?? '—';
    document.getElementById('gh-fw').textContent     = u.following   ?? '—';
    document.getElementById('gh-op').href            = u.html_url;
    document.getElementById('gh-bar').style.display  = 'flex';
    document.getElementById('gh-fb').style.display   = repos.length ? 'flex' : 'none';
    allRepos = repos;
    renderRepos(repos);
  } catch {
    document.getElementById('gh-grid').innerHTML =
      '<div class="gh-emp"><div style="font-size:26px;margin-bottom:8px;opacity:.4">⚠</div>Could not load repositories.</div>';
  }
}
window.addEventListener('load', () => { loadGH(); bindCursor(); });


/* ══════════════════════════════════════════
   CERTIFICATION VERIFY
══════════════════════════════════════════ */
function openCred(url) { if (url) window.open(url, '_blank', 'noopener'); }


/* ══════════════════════════════════════════
   KONAMI CODE EASTER EGG  ↑↑↓↓←→←→BA
══════════════════════════════════════════ */
const konamiSeq = [38,38,40,40,37,39,37,39,66,65];
let kIdx = 0;
document.addEventListener('keydown', e => {
  if (e.keyCode === konamiSeq[kIdx]) {
    kIdx++;
    if (kIdx === konamiSeq.length) { easterEgg(); kIdx = 0; }
  } else { kIdx = 0; }
});

function easterEgg() {
  const msg = document.createElement('div');
  Object.assign(msg.style, {
    position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
    fontFamily:"'Share Tech Mono'", fontSize:'clamp(12px,2vw,18px)', color:'var(--a)',
    background:'rgba(2,4,9,.95)', border:'1px solid var(--a)', padding:'32px 48px',
    zIndex:9998, textAlign:'center', lineHeight:1.8,
    boxShadow:'0 0 60px rgba(0,255,224,.2)', letterSpacing:'.1em'
  });
  msg.innerHTML =
    '<div style="font-size:2em;margin-bottom:12px">⚡</div>'
    + '<div style="font-size:1.2em;font-weight:700;font-family:Orbitron">CHEAT CODE ACTIVATED</div>'
    + '<div style="margin-top:10px;color:var(--gr);font-size:.85em">MOI.ENG v3.0 // FIRMWARE UNLOCKED</div>'
    + '<div style="margin-top:6px;color:rgba(0,255,224,.4);font-size:.75em">click to close</div>';
  msg.onclick = () => msg.remove();
  document.body.appendChild(msg);

  for (let i = 0; i < 24; i++) setTimeout(() => {
    const d = document.createElement('div');
    Object.assign(d.style, {
      position:'fixed', left:Math.random()*100+'vw', top:Math.random()*100+'vh',
      fontSize:'clamp(12px,2vw,20px)', color:'var(--a)', pointerEvents:'none',
      zIndex:9997, fontFamily:"'Share Tech Mono'", opacity:1,
      transition:'all 1.5s', textShadow:'0 0 12px var(--a)'
    });
    d.textContent = ['01','10','0xFF','0xDE','FOTA','BLE','nRF','LTE'][Math.floor(Math.random()*8)];
    document.body.appendChild(d);
    setTimeout(() => { d.style.opacity = 0; d.style.transform = 'translateY(-60px)'; }, 50);
    setTimeout(() => d.remove(), 1600);
  }, i * 80);
}


/* ══════════════════════════════════════════
   CAROUSEL — Projects & Certifications
══════════════════════════════════════════ */
function initCarousel(trackId, prevId, nextId, dotsId, autoDelay) {
  const track  = document.getElementById(trackId);
  const prev   = document.getElementById(prevId);
  const next   = document.getElementById(nextId);
  const dotsWr = document.getElementById(dotsId);
  if (!track) return;

  // Build dots based on card count
  const cards  = Array.from(track.children);
  const total  = cards.length;
  let current  = 0;
  let autoTimer;

  // Create dot elements
  cards.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'car-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    d.addEventListener('click', () => { goTo(i); resetAuto(); });
    dotsWr.appendChild(d);
  });

  function getCardWidth() {
    if (!cards[0]) return 0;
    return cards[0].offsetWidth + parseInt(getComputedStyle(track).gap || '22', 10);
  }

  function updateDots() {
    dotsWr.querySelectorAll('.car-dot').forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function updateButtons() {
    if (prev) prev.disabled = current === 0;
    if (next) next.disabled = current >= total - 1;
  }

  function goTo(idx) {
    current = idx;
    if (current < 0) current = total - 1;
    if (current >= total) current = 0;
    track.scrollTo({ left: current * getCardWidth(), behavior: 'smooth' });
    updateDots();
    updateButtons();
  }

  if (prev) prev.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
  if (next) next.addEventListener('click', () => { goTo(current + 1); resetAuto(); });

  // Sync dots when user drags/swipes
  track.addEventListener('scroll', () => {
    const cw = getCardWidth();
    if (cw > 0) current = Math.round(track.scrollLeft / cw);
    updateDots();
    updateButtons();
  }, { passive: true });

  // Pause auto-scroll on hover
  track.addEventListener('mouseenter', () => clearInterval(autoTimer));
  track.addEventListener('mouseleave', () => startAuto());

  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      const next_idx = current >= total - 1 ? 0 : current + 1;
      goTo(next_idx);
    }, autoDelay);
  }

  function resetAuto() { clearInterval(autoTimer); startAuto(); }

  updateButtons();
  startAuto();
}

// Init both carousels after DOM is ready (delay so widths are calculated)
window.addEventListener('load', () => {
  setTimeout(() => {
    initCarousel('pc-track', 'pc-prev', 'pc-next', 'pc-dots', 3000);
    initCarousel('cf-track', 'cf-prev', 'cf-next', 'cf-dots', 3500);
  }, 200);
});

/* ══════════════════════════════════════════
   MOBILE TAP-TO-FLIP (touch devices)
══════════════════════════════════════════ */
(function initMobileFlip() {
  if (!window.matchMedia('(hover:none),(pointer:coarse)').matches) return;

  /* ── Project cards ── */
  document.querySelectorAll('.pc-flip').forEach(flip => {
    flip.addEventListener('click', () => {
      flip.classList.toggle('tapped');
    });
  });

  /* ── Cert cards ── */
  document.querySelectorAll('.cf').forEach(card => {
    // Extract URL from the existing inline onclick, then remove it
    const match = (card.getAttribute('onclick') || '').match(/openCred\('(.+?)'\)/);
    const url   = match ? match[1] : null;
    card.removeAttribute('onclick');

    card.addEventListener('click', e => {
      if (!card.classList.contains('tapped')) {
        // First tap → flip to show skills
        card.classList.add('tapped');
      } else {
        // Second tap anywhere → open credential URL
        if (url) window.open(url, '_blank', 'noopener');
      }
    });
  });
})();