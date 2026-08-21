# ASSET REQUIREMENTS

The rebuild ships **complete and self-contained** using code-rendered visuals
(WebGL monolith + per-project SVG worlds) — no raster image is required for the
site to work. This document lists the **real assets** that would elevate it from
"cinematic and honest" to "documentary and undeniable," and where each slots in.

Priorities: **P1** = highest impact, **P2** = strong, **P3** = nice-to-have.

## Real photography / renders needed

| Asset | For | Recommended | Format | Location in site | Priority |
|-------|-----|-------------|--------|------------------|----------|
| MYMO2 device photo (front/3-4 view, plain bg) | Proves the real product | ≥ 2000 px long edge | source → WebP/AVIF | `/work/mymo2` hero + Selected Systems | **P1** |
| MYMO2 dashboard screenshot (anonymised) | Real telemetry UI | 1600×1000 | WebP | `/work/mymo2` architecture | P2 |
| Shooting-range target carrier / rail photo | Real motion-control hardware | ≥ 2000 px | WebP | `/work/shooting-range` hero | **P1** |
| ATSAME70 / XBee bench setup photo | Firmware/RF credibility | ≥ 1600 px | WebP | shooting-range architecture | P2 |
| BLE configurator screenshot (PC & mobile) | Real device management UI | 1600×1000 | WebP | `/work/device-management` | P2 |
| Production database ER diagram (sanitised) | Real schema | SVG preferred | SVG | `/work/lifecycle-database` | P2 |
| Real brain-controlled wheelchair photo + Tkinter GUI screenshot | Documentary proof beyond the integrated conceptual artwork | ≥ 1600 px | WebP | `/work/wheelchair` | P2 |
| Anonymised violence-detection test frames / plots | Optional documentary support for the integrated measured case study | as available | WebP | `/work/violence-detection` | P2 |

## Documents / links

| Asset | Note | Priority |
|-------|------|----------|
| CV / résumé PDF | Add to `/public` and link from Contact | P2 |
| Certificate images or verified Coursera/Credly links | Confirm all live; resolve cert 3.1 in CONTENT_AUDIT | **P1** |
| Company logos (Palmlabs, Huawei, Hitec) | Only if you have usage rights; composite in code, never baked into generated art | P3 |

## Generated (conceptual) art — Higgsfield

These are **optional enhancements**, not documentary. Prompts + exact
dimensions live in `IMAGE_GENERATION_PROMPTS.md`; outputs and metadata are
logged in `IMAGE_GENERATION_LOG.md`. Target locations:

```
public/assets/generated/
  social/portfolio-og.webp                 1200×630   OG/social preview
  hero/monolith-fallback.webp              1600×1200  static hero fallback (low-power/no-WebGL)
  projects/mymo2/mymo2-route.webp          1600×1000  night route concept
  projects/mymo2/mymo2-connectivity.webp   1600×1000  device-to-cloud concept
  projects/shooting-range/range-hero.webp  1600×1000  range/motion concept
  projects/device-management/device-network-bg.webp  1920×1080 subtle bg
  projects/lifecycle-database/lifecycle-bg.webp      1920×1080 subtle bg
  projects/violence-detection/cctv-concept.webp      1586×992 conceptual only
  projects/brain-controlled-wheelchair/wheelchair-hero.webp 1586×992 conceptual only
  textures/brushed-metal.webp, floor.webp             subtle textures
```

## 3D models (optional)

The hero monolith is **procedural** (no model needed). A real MYMO2 GLB
(decimated, Draco-compressed, ≤ ~1–2 MB, `.glb`) could replace/augment a
project visual later — load via `@react-three/drei` `useGLTF` and dispose on
unmount. Place under `public/assets/models/`.

## Image handling rules (already wired for when assets arrive)

- Serve **WebP/AVIF**, keep a high-quality source master out of the shipped bundle.
- Always set explicit `width`/`height` (or `aspect-ratio`) to avoid layout shift.
- `loading="lazy"` below the fold; `preload` only the single critical hero asset.
- Alt text must describe content; conceptual art must say "Conceptual visualization of…".
