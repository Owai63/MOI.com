# Enhanced 3D scenes — revision 2

This revision restores the original immersive workshop and builds on it. The homepage keeps its furnished room, instruments, six authored camera stations, progressive device assemblies and scroll transitions. The shooting-range case study keeps the complete lane, operator console, rail, carriage, baffles, lighting and six-shot narrative. The simpler studio replacement from the first revision has been removed.

## Enhancements

- Analytic camera springs settle consistently across frame rates. Drag rotation and manual component separation are damped; zoom changes settle through the camera rig.
- The original high-quality depth of field, bloom, tone mapping and vignette remain. Autofocus now follows the camera target after the canvas mounts. Inspection lighting adds a warm reflected edge, and shadow bias is tuned for close-up detail.
- Existing enclosures and metals receive subtle surface variation. The full range gains textured, worn concrete and acoustic baffle surfaces.
- Case studies gain keyboard-accessible drag rotation, auto-rotation, pause, zoom and project-specific controls. `Follow scroll` releases manual overrides and resets the view controls.
- Rendering pauses behind opaque content and in hidden tabs. Adaptive resolution starts conservatively and adjusts without removing scene geometry. Repeated keys, pins, stitches and tread details use instancing.
- Per-device material cleanup limits accumulation during navigation. Projects use their existing illustrations when WebGL2, device capability or reduced-motion settings select a static view.

## All 13 project scenes

| Project | Scene and interaction |
| --- | --- |
| MYMO2 | Original photo-informed tracker, board, cellular module and harness; smooth component separation and manual inspection |
| Shooting range | Original complete range and camera sequence; adjustable carriage with tracking camera, textured floor and moving mechanism |
| Device management | Original console/server/field-device delivery assembly; inspectable system layers and pausable signal animation |
| Lifecycle database | Original stepped lifecycle tray and device records; inspectable stages and pausable demonstration |
| Violence detection | Original camera and inference rig; inspectable pipeline assembly and pausable signals |
| Wheelchair | Original detailed conversion with drive hardware and electronics; manual rotation and component separation |
| Pet tracker | New stitched collar and metal buckle; enclosure walls, gasket, battery wiring, PCB traces, radio shield, GPS patch and screws; open the assembly |
| Cedrus website | New dressed workstation with lamp, keyboard, notebook and phone; selectable corporate pages on both screens |
| Hospital website | New desktop/mobile workstation with distinct blue-and-white department, appointment and contact views |
| Gesture car | New wearable controller and four-wheel robot with motors, tyres, PCB, heatsink, RF antenna and wiring; tilt steers the car |
| Traffic FSM | New junction with markings, crossings, signal heads, kerbs, buildings and cars; phase selection changes lights and vehicle movement |
| Bank system | New workstation with manager/client text-console states and binary-file view; storage enclosure represents persistence |
| Food ordering | New responsive desktop/mobile menu, search and order views with storage enclosure representing MySQL records |

New objects and embedded interfaces are conceptual representations based on the project descriptions. They are not claimed to be product photographs, delivered-site screenshots, or measured engineering simulations. Embedded demo screens are in English; the surrounding portfolio and interaction controls retain English/Arabic support.

## Local testing

Use Node.js 22 or newer. Extract the ZIP, open a terminal in the directory containing `package.json`, and run:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The scene demos need no API keys. The existing chatbot backend is separate; see the original README if you also want to test it.

For a production build at the domain root:

```sh
npm run build
npm run preview
```

GitHub Pages uses `VITE_BASE=/MyPortfolio/` at build time, as in the existing workflow.

## Validation and limits

Validation commands used for this revision:

```sh
npm run typecheck
node scripts/check-camera.mjs
node --import tsx scripts/check-studios.mts
node --import tsx scripts/translate.mts --check
VITE_BASE=/MyPortfolio/ npm run build
git diff --check
```

The camera test checks all 13 scene registrations, the original station count, the complete room path, matching spring settlement at 30/60/144 Hz, dropped-frame stability, and manual-to-scroll handoff. The catalogue check covers control endpoints, Arabic control copy and fallback assets. Translation coverage includes all 911 collected strings.

Browser visual review and measurements on physical devices have not been performed. A successful build and mathematical motion checks do not establish a particular FPS. For local review, scroll the full homepage and range sequence, visit all 13 cases, try both ends of each control, and check drag/zoom/pause/reset, narrow-screen framing and Arabic layout. The original browser-based `framecheck` and `perf` scripts remain available for that review.
