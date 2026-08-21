# IMAGE GENERATION PROMPTS

Final, ready-to-run prompts for the conceptual artwork. All share one art
direction so the site reads as **one system**.

**Global style suffix** (append to every prompt):
> near-black studio environment, cinematic industrial product lighting, deep
> negative space, restrained cyan (#3fe0d0) and amber (#f6a250) accent light
> only, high contrast, subtle film grain, ultra-sharp, photographic, premium
> automotive-advertising quality, 8k, no text, no watermark, no logo, no UI,
> no readable labels.

**Global negative prompt** (where supported):
> text, watermark, logo, brand name, ui, hud, dashboard numbers, gibberish
> letters, extra connectors, distorted electronics, cluttered, low quality,
> jpeg artifacts, oversaturated, neon overload, cyberpunk cliché, people being
> harmed, blood, gore, weapons as subject, cartoon, 3d render look, fisheye.

> ⚠️ Never composite a real logo into a generated image — supply real logos in
> code. Generated device shapes are **not** the real product; label as
> "Conceptual visualization of…". Do not upload private source, credentials, or
> customer data to any model.

---

## 1. Global social preview — `social/portfolio-og.webp` (1200×630)
> A single glossy black sculptural monolith of four stacked rectangular slabs,
> floating in a dark studio, thin illuminated cyan and amber seams between
> layers, soft reflection on a dark polished floor, large empty space on the
> left for a name to be added in code. [+ global suffix]

## 2. Hero static fallback — `hero/monolith-fallback.webp` (1600×1200)
> Central glossy black monolith, four separated brushed-metal and black-glass
> slabs slightly apart, thin cyan and one amber seam, premium rim lighting,
> soft floor reflection, vast dark negative space around it. [+ global suffix]

## 3. MYMO2 — `projects/mymo2/mymo2-route.webp` (1600×1000)
> Abstract night-time road-network seen from above, one glowing cyan route line
> tracing through dark streets, a single bright vehicle marker, faint amber
> event dots, a thin dashed geofence ring, no map labels. [+ global suffix]

## 4. MYMO2 — `projects/mymo2/mymo2-connectivity.webp` (1600×1000)
> A dark automotive scene suggesting device-to-cloud connectivity: a faint
> cellular signal arc rising from a car silhouette to a soft cloud of light,
> cyan data path, amber accents, heavy negative space. [+ global suffix]
> _Do not render a specific tracker device — keep it abstract (see CONTENT_AUDIT 1.1)._

## 5. Shooting range — `projects/shooting-range/range-hero.webp` (1600×1000)
> A dark precision indoor shooting range, a motorized target carrier on a
> horizontal rail moving toward a distant paper target, amber motion trail,
> small cyan system-state indicator lights, faint concentric RF signal rings,
> high-end industrial lighting. Focus on the automated equipment and rail.
> [+ global suffix] _No weapons as subject, no people, no harm._

## 6. Device management — `projects/device-management/device-network-bg.webp` (1920×1080, subtle bg)
> Very dark, minimal background texture of a central black glass control node
> with faint thin cyan lines radiating to small distant device nodes, mostly
> empty, low contrast, meant to sit behind text. [+ global suffix]

## 7. Lifecycle database — `projects/lifecycle-database/lifecycle-bg.webp` (1920×1080, subtle bg)
> Dark architectural space with faint translucent floating data layers/rings,
> thin cyan data paths, a few warm amber milestone points, very low contrast,
> deep negative space for text overlay. [+ global suffix]

## 8. Violence detection — `projects/violence-detection/cctv-concept.webp` (1600×1000)
> Low-resolution CCTV-style wide shot of a neutral public indoor space, several
> distant, small, non-graphic human figures standing/walking, dark monochrome
> tone, empty regions left for code-drawn detection boxes. [+ global suffix]
> _Neutral activity only — no attack, no injury, no blood, no exaggerated action._

## 9. Brain-controlled wheelchair — `projects/brain-controlled-wheelchair/wheelchair-hero.webp`
> A premium powered wheelchair in a dark studio, connected to an abstract cyan EEG brain-signal visualization, subtle amber hardware accents, assistive-technology focus, no person, no medical branding. [+ global suffix]

## 10. Textures (subtle) — `textures/`
- `brushed-metal.webp` (1024² or larger): > seamless dark brushed black metal, fine grain, low contrast. [+ suffix]
- `floor.webp` (1600×900 or larger): > dark polished reflective studio floor, soft gradient, subtle cyan and amber bounce. [+ suffix]

_Grid texture intentionally omitted._

---

### Selection & optimisation checklist (per asset)
1. Generate 3–4 candidates. 2. Reject distorted hardware / gibberish / clutter /
weak focal point. 3. Pick strongest composition + correct negative space.
4. Downscale to the size above. 5. Export **WebP** (q≈80) / AVIF; keep a master
outside the bundle. 6. Strip metadata. 7. Add accurate alt text +
"Conceptual visualization of…". 8. Log everything in `IMAGE_GENERATION_LOG.md`.
