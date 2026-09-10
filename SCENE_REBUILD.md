# Interactive project studios

All 13 case studies now have a dedicated 3D viewer. The homepage uses the same studio lighting and renders one active project at a time, replacing the always-mounted workshop.

## Scene coverage

| Project | Demonstration |
| --- | --- |
| MYMO2 | Existing photo-informed tracker, newly staged with explodable hardware |
| Shooting range | Rebuilt rail, carriage, target and RF controller; adjustable carriage position |
| Device management | Restaged console, server and field-device delivery model; layer separation |
| Lifecycle database | Restaged device records and lifecycle model; layer separation |
| Violence detection | Restaged camera and inference rig; pipeline separation |
| Wheelchair | Restaged detailed wheelchair conversion; explodable control and drive components |
| Pet tracker | New collar, enclosure, battery, radio board and GPS antenna |
| Cedrus website | New desktop/mobile presentation with selectable corporate pages |
| Hospital website | New desktop/mobile presentation with departments and form views |
| Gesture car | New wearable tilt controller and responding, wheeled robot |
| Traffic FSM | New junction with selectable green, amber and all-red phases |
| Bank system | New manager/client console and binary persistence presentation |
| Food ordering | New responsive menu, search and order presentation with database storage |

The original five detailed hardware models retain their engineering geometry. This change rebuilds their scene presentation rather than claiming to replace those models. New geometry and all screen interfaces are conceptual representations, not product screenshots or measured simulations.

## Controls and rendering

- Drag rotation, perspective/front/top presets, button-based zoom, auto-rotation, pause and reset.
- Project-specific range controls support keyboard interaction. Page scrolling stays available over the canvas.
- English/Arabic controls, low-power opt-in, reduced-motion handling and per-project fallback illustrations.
- Lazy scene loading, offscreen/hidden-tab suspension, capped adaptive resolution, one static reflection capture and no fullscreen postprocessing chain.
- Explicit material cleanup on project changes; the WebGL capability probe releases its context.

## Validation

Passed locally:

- TypeScript and production build with `VITE_BASE=/MyPortfolio/` using the repository's locked dependencies.
- `node --import tsx scripts/translate.mts --check`: all 907 collected strings have Arabic translations.
- `node --import tsx scripts/check-studios.mts`: 13/13 scene definitions, control endpoints, translations and fallback files.
- `git diff --check`.

The translation checker uses the direct tsx loader here because this execution environment prevents the tsx CLI's temporary IPC socket. CI can retain the existing npm command.

Browser visual review and real-device frame-rate measurements have not been performed. Before merging, review desktop/mobile framing at both ends of each control, drag/zoom/reset, pause/reduced-motion, Arabic layout, navigation between scenes, and a full homepage scroll. No fixed FPS guarantee is implied by the build checks. The old `check:camera` and `perf` scripts target the previous room choreography and do not validate this studio renderer.
