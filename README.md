# ENGINEERED REALITY — Portfolio v6

Cinematic, high-end portfolio for **Muhammad Owais Iqbal Malik** — Embedded
Systems & IoT Engineer. Concept: **"I build systems that leave the lab."**

Near-black studio environment, restrained cyan/amber signals, large editorial
typography, and a **procedural WebGL workbench** — a dark electronics bench
carrying the instruments, screens and hardware the work was actually built on.

The bench is one continuous room the page moves the camera through, and each
work chapter is staged where that project actually happened — on the mat, on a
screen, or out on the floor behind the bench. Opening a case study lifts the
device onto an inspection stage and takes it apart as you scroll.

## Stack

React 18 · Vite 5 · TypeScript · React Three Fiber + drei (Three.js) · GSAP
ScrollTrigger · Lenis · Framer Motion (light UI only) · React Router · SCSS
Modules + a CSS-custom-property design system.

## Commands

```bash
npm install        # install dependencies
npm run dev        # development server (http://localhost:5173)
npm run build      # production build → dist/   (runs tsc then vite build)
npm run preview    # preview the production build
npm run typecheck  # tsc -b --noEmit

npm run fallback   # re-render the static hero still from the live scene (dev server must be running)
npm run og         # re-render the Open Graph share image
npm run photos     # OPT-IN: downscale pics/ into public/assets/photos/ — see "Reference photographs"

npm run translate        # fill any missing English→Arabic strings (needs GEMINI_API_KEY)
npm run translate:check   # CI gate: exit 1 if any English string has no translation
npm run server            # Node/Express server: serves dist/ + the /api/chat proxy
```

**Development:** `npm run dev` · **Production build:** `npm run build`

## Structure

```
index.html                 Vite entry (meta, OG, fonts)
src/
  main.tsx  App.tsx         bootstrap + router (lazy case studies)
  data/content.ts           SINGLE SOURCE OF TRUTH — all copy/facts, no invented claims
  styles/                   tokens + global design system
  lib/                      quality tiering, media queries, reveal, Lenis, scroll choreography
  three/
    BenchStage.tsx          capability gate: live scene, or the static still
    SceneFallback.tsx       still image for no-WebGL / low-tier / reduced-motion
    sceneState.ts           mutable state shared between scroll and the render loop
    bench/
      BenchCanvas.tsx       renderer, lighting rigs, camera rig, post-processing
      Workbench.tsx         scene graph; bench mode and inspect mode
      layout.ts             where every prop stands + derived screen poses
      cameraPath.ts         the camera stations the page is choreographed against
      assembly.ts           one displacement model for both assemble and explode
      textures.ts           every surface map, drawn on a 2D canvas at startup
      materials.ts          shared bench materials + per-device material sets
      parts/                PCB, populated components, wires, LEDs, radio, shells
      props/                desk, chair, light, dressing, monitors, laptop,
                            instruments, and the room behind the bench
      screens/              the console programs the bench screens run
      devices/              one model per chapter + the registry that stages them
  components/
    Nav, Loader, RouteFallback
    ui/                     Reveal, SectionHeading, Cta (magnetic), TagList
    sections/               Hero, Work, FeaturedStory, Capabilities, Experience,
                            Recognition, Credentials, Philosophy, Opportunities,
                            Contact, Footer, Interlude
    visuals/ProjectVisual   code-rendered SVG world per project
  routes/                   Home, CaseStudy, NotFound
public/assets/generated/    conceptual art + the rendered hero still
public/assets/photos/       reference photographs (absent by default — see below)
_backup_original_v5/        backup of the previous site
```

## Homepage order

Loader → Hero → **Selected Systems** (Work) → Featured Story → **Capabilities**
→ **Experience** → Recognition & Education (**About**) → Credentials →
Philosophy → Opportunities → **Contact** → Footer.
Nav: Work · Capabilities · Experience · About · Contact.

## Case studies

`/work/mymo2` · `/work/shooting-range` · `/work/device-management` ·
`/work/lifecycle-database` · `/work/violence-detection` (+ `/work/wheelchair`).

## Bilingual (English ⇄ Arabic)

English is the only side that is authored. Arabic is generated **once, at build
time**, into a flat map (`src/i18n/ar.json`) that ships inside the bundle — the
browser never translates anything at runtime, so there is no per-visitor cost
and no half-translated first frame.

```bash
npm run translate         # translates only what's new; existing strings are never re-sent
npm run translate:check   # fails if any English string is missing an Arabic counterpart
```

`src/i18n/surface.ts` defines "every English word on the site" (content, ui,
copy, image alt text). **Never hardcode visible English in a component** — it
would bypass the surface and stay English forever. Hand-approved wording lives
in `src/i18n/curated.ar.ts` and always wins over machine output.

See [`BILINGUAL_CHATBOT_SETUP.md`](./BILINGUAL_CHATBOT_SETUP.md) for the full guide.

## Deployment

The same codebase deploys to two places. `VITE_BASE` is the only difference —
it is why every `public/` path in TypeScript goes through `src/lib/asset.ts`
rather than a hardcoded leading slash.

| Target | Build | Serves | Chat assistant |
|---|---|---|---|
| **GitHub Pages** — [owai63.github.io/MyPortfolio](https://owai63.github.io/MyPortfolio/) | `VITE_BASE=/MyPortfolio/ npm run build` | static `dist/` | ✗ (static host, no backend) |
| **Node server** (droplet) | `npm run build` | `npm run server` → `dist/` + `/api/chat` | ✓ |

Pages deploys automatically from `main` via `.github/workflows/static.yml`.
The build needs no secrets, because translations are pre-generated and committed.
`GEMINI_API_KEY` is only required by the Node server, for the chat assistant.

## Content integrity

Core portfolio content comes from the previous site (`_backup_original_v5/`). The violence-detection case study is based on the owner's later technical report and genuine held-out RTX 4050 results. **No unsupported metric, technology, client, or product claim was invented.** Read **[`CONTENT_AUDIT.md`](./CONTENT_AUDIT.md)** before publishing; it records the remaining naming, credential, and date checks.

## Companion docs

- [`CONTENT_AUDIT.md`](./CONTENT_AUDIT.md) — discrepancies, unverified claims, privacy, moved content.
- [`PERFORMANCE_NOTES.md`](./PERFORMANCE_NOTES.md) — bundle, adaptive quality, render-loop hygiene.

## Accessibility & performance highlights

Semantic landmarks, logical headings, keyboard nav + visible focus, skip link,
`prefers-reduced-motion` throughout, complete no-WebGL/static fallback, code-split
3D, adaptive DPR/quality, off-screen render pause, no allocation in the render
loop, GSAP/ScrollTrigger cleanup, no layout shift. Details in
`PERFORMANCE_NOTES.md`.

## Secrets

No tokens are committed. `.env*`, `*.token`, and provider token files are
git-ignored. Do not paste any Hugging Face / Higgsfield token into source —
keep it in an ignored `.env` only.

## The workbench scene

Everything in the scene is generated in code — there are no model files and no
texture downloads. Solder mask, copper routing, silkscreen designators, the
printed rating label, wood grain and the cutting mat are all rasterised onto a
2D canvas once at startup; the geometry is assembled from primitives. That is
a few tens of kilobytes of JavaScript instead of several megabytes of GLB and
PNG, it stays sharp at any zoom, and — because every part is a named object
rather than a baked mesh — the exploded views come free.

### How each chapter is staged

`three/bench/devices/registry.tsx` is the single place that decides this. Every
chapter declares where it happens, and the camera path is generated from that —
so the moves mean something rather than being six variations on a push-in.

| Chapter | Staged | What it does |
| --- | --- | --- |
| MYMO2 tracker | mat | Unit assembles on the cutting mat and powers up — status LED on a firmware double-blink, antenna radiating. The monitor behind it draws the unit's own live track. |
| Shooting range | room | The camera turns away from the bench to a section of track laid on the lab floor. The controller case *is* the thing that moves: it rides a carriage with a training target bolted on beside it, driven by a pinion in the rack between the rails, while command packets arc out from the laptop on the bench behind the camera. Wheels, pinion and encoder all turn at the carriage's own measured speed and reverse with it. |
| Device management | laptop | Camera turns to the laptop, which is running a staged firmware rollout: units download, verify, a few fail CRC and retry, the batch completes. |
| Lifecycle database | laptop | A records table with milestones stamping in per unit as new serials are enrolled. |
| Detection | laptop | The model's own inference view — tracked regions, identities, confidence, latency. |
| Brain-controlled wheelchair | room | The camera turns roughly 180° away from the bench to the floor behind it, the room light comes up as the bench light drops, and the chair drives a demonstration run: electrodes fire on the EEG headset, a command packet crosses to the controller, the wheels turn. |

The console programs (`three/bench/screens/programs.ts`) are drawn on a 2D
canvas rather than in GLSL. A shader can fake the look of a console but not its
content, and it is the content — unit IDs ticking over, a rollout stalling and
retrying — that makes a screen read as software doing work. They are pure
functions of elapsed time, redrawn at 12fps and only while their chapter is on
screen.

### The models

Two devices are modelled from photographs of the real hardware:

* **MYMO2 / VTM300 tracker** — moulded ABS shell, the unit's actual printed
  markings, the Quectel carrier board, u.FL coax and film antenna, and the
  keyed vehicle harness.
* **Shooting-range target runner** — the ruggedised transit case (control
  board behind its polycarbonate guard, battery, fuse block, motor driver on
  its heatsink, loom and whip antenna) bolted to a bogie, with the brushed DC
  gearmotor and its rack pinion out in the open underneath, and the training
  target standing at the downrange end of the deck.

The wheelchair is modelled to the project rather than to a photograph, and its
EEG headset sits on a lab stand rather than on a mannequin — a headless figure
in a wheelchair is an unpleasant image, and the equipment on a stand says the
same thing about the work.

The three software chapters keep a deliberately generic bench rig (board on
standoffs, debug probe, breadboard) beside the laptop rather than an invented
product — see the note at the top of `three/bench/devices/DevRig.tsx`. Chapter
visuals are labelled *"Live 3D model · reconstruction"* for the same reason: the
models are built to the real hardware, but they are reconstructions, not
photographs.

### Reference photographs

`npm run photos` converts the originals in `pics/` into web-sized WebP under
`public/assets/photos/`, which the bench monitors will then display next to the
matching device.

**This is opt-in and nothing depends on it.** Those photographs are of real
production hardware and carry a unit serial number, a setup QR code and a
regulatory certification number, so publishing them is a disclosure decision
rather than a build step. Without them the monitors show the generated console
artwork and the site is complete.
