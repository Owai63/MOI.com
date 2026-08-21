# ENGINEERED REALITY — Portfolio v6

Cinematic, high-end portfolio for **Muhammad Owais Iqbal Malik** — Embedded
Systems & IoT Engineer. Concept: **"I build systems that leave the lab."**

Near-black studio environment, restrained cyan/amber signals, large editorial
typography, and a procedural WebGL monolith that separates and reassembles as
the transition device through the page.

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
  three/                    monolith scene (Canvas, Monolith, studio rig, floor) + static fallback + stage selector
  components/
    Nav, Loader, RouteFallback
    ui/                     Reveal, SectionHeading, Cta (magnetic), TagList
    sections/               Hero, Work, FeaturedStory, Capabilities, Experience,
                            Recognition, Credentials, Philosophy, Opportunities,
                            Contact, Footer, Interlude
    visuals/ProjectVisual   code-rendered SVG world per project
  routes/                   Home, CaseStudy, NotFound
public/assets/generated/    conceptual art output (see docs below)
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
- [`ASSET_REQUIREMENTS.md`](./ASSET_REQUIREMENTS.md) — real photos/screenshots/diagrams/models to supply.
- [`IMAGE_GENERATION_PROMPTS.md`](./IMAGE_GENERATION_PROMPTS.md) — final prompts + dimensions.
- [`IMAGE_GENERATION_LOG.md`](./IMAGE_GENERATION_LOG.md) — generation records + the Higgsfield substitution note.
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
