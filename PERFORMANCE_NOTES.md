# PERFORMANCE NOTES

## Bundle / loading

- **Route + 3D code-splitting.** `Home` loads eagerly; `CaseStudy` and
  `NotFound` are `React.lazy` + `Suspense`. The entire Three.js/R3F scene
  (`MonolithCanvas`) is a **lazy chunk** — it is never fetched on devices that
  fall back, and never blocks first paint.
- **Manual chunks** (`vite.config.ts`): `three`, `r3f`, and `motion` split out.
  Production gzip: main app ≈ **45 kB**, `three` ≈ 176 kB and `r3f` ≈ 112 kB
  load **only** when the live scene mounts (high/medium tier, non-reduced-motion).
- Fonts: `preconnect` + a single `display=swap` Google Fonts request (three
  families). No FOIT.

## Adaptive 3D quality (`src/lib/quality.ts`)

Device tiering from WebGL support, `hardwareConcurrency`, `deviceMemory`,
coarse-pointer, viewport, and `save-data`:

| Tier | DPR cap | Shadows | Reflector res | Particles | Postproc |
|------|---------|---------|---------------|-----------|----------|
| high | 1–2 | on | 1024 | 240 | bloom + CA + vignette (`@react-three/postprocessing`) |
| medium | 1–1.5 | off | 512 | 120 | off (tone-map only) |
| low / no-WebGL / reduced-motion | — | — | — | — | **static fallback** |

- **No-WebGL & low-power → static CSS fallback** (`MonolithFallback`), zero GPU.
- `AdaptiveDpr` lowers resolution under load.
- **Render-on-demand-ish:** the canvas `frameloop` switches to `never` when the
  scene scrolls out of view (IntersectionObserver), so no frames render off-screen.

## Render loop hygiene (`src/three/Monolith.tsx`)

- **No allocation in `useFrame`** — reusable temp `Vector2`, module-scope
  `Color`s, deltas clamped.
- Motion via `THREE.MathUtils.damp` (frame-rate independent), never continuous
  spin. Pointer influence gated to when the hero is visible.
- Low geometry: **one shared** `RoundedBoxGeometry` reused by all 4 slab bodies
  and their fresnel rim shells (segment count drops on medium/low); geometry and
  shader materials disposed on unmount.
- Cinematic additions stay cheap: energy core is a single box with a custom
  shader (uniform-driven, no per-frame allocation), particles are one `Points`
  draw call with a custom point shader, ground rings are two `ringGeometry`
  meshes. Selective bloom keys off `toneMapped={false}` emissives / >1 shader
  output (`luminanceThreshold: 1`) — no extra render layers.
- Camera choreography (`CameraRig`) reads a page-progress value written by a
  single body-spanning ScrollTrigger; all camera moves are damped, no tweens in
  the render loop.

## Scroll (`src/lib/useLenis.ts`, `useMonolithScroll.ts`)

- Lenis driven by GSAP's single ticker (`lagSmoothing(0)`), `ScrollTrigger.update`
  on scroll — one rAF loop, no duplicate tickers.
- ScrollTriggers created inside a `gsap.context()` and **reverted on unmount**
  (`ctx.revert()`) — no leaked/duplicate triggers across route changes.
- Lenis + all scrubbing **disabled for `prefers-reduced-motion`** (native scroll,
  monolith held in a static gently-open pose).

## Layout stability & DOM

- Project visuals use `aspect-ratio` framed containers → **no CLS**.
- Reveal animations are transform/opacity only (compositor-friendly),
  `will-change` scoped, and disabled under reduced motion.
- Content surfaces use flat translucent backgrounds (**no `backdrop-filter`**
  over the animated canvas) to avoid per-frame blur cost; blur is limited to the
  small nav bar.

## When raster assets are added

- Ship WebP/AVIF, explicit `width`/`height`, `loading="lazy"` below the fold,
  `preload` only the one critical hero image, keep masters out of the bundle
  (see `.gitignore`).

## Verified

- `npm run typecheck` → clean.
- `npm run build` → success; only advisory is the expected large **lazy** three
  chunk. No errors, no Sass warnings.
