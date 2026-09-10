import { microSurface, disposeSurfaceDetails } from './surfaceDetails';
import { useEffect, useMemo } from 'react';
/* ============================================================================
   materials — shared bench materials, and per-device material sets
   ----------------------------------------------------------------------------
   Two different lifetimes live here, and the distinction matters:

   * Bench furniture (desk, instruments, chair) never fades, so one shared
     material per surface is correct and keeps the draw calls cheap.

   * Devices DO fade — a chapter change cross-fades the outgoing device against
     the incoming one. Opacity is a property of the material, not the mesh, so
     a device that shared its plastic with the next device would drag it into
     the fade. `deviceMaterials()` therefore hands every device instance its
     own set. Textures stay shared (they are the expensive half); only the
     lightweight material wrappers are duplicated.
   ========================================================================== */

import * as THREE from 'three';
import {
  panelCoatTexture,
  screenGlowTexture,
  brushedTexture,
  caseShellTexture,
  esdMatTexture,
  cuttingMatTexture,
  woodTexture,
} from './textures';
import {
  floorTextures,
  wallTextures,
  pegboardTextures,
  ceilingTexture,
  disposeRoomTextures,
} from './roomTextures';

/* --- disposal ------------------------------------------------------------ */

const owned: THREE.Material[] = [];
function own<T extends THREE.Material>(m: T): T {
  owned.push(m);
  m.addEventListener('dispose', () => { const at = owned.indexOf(m); if (at >= 0) owned.splice(at, 1); });
  return m;
}

/* Textures this module CLONED rather than took from the shared cache.
   disposeTextures() only knows about what it cached; a clone made here to give
   one surface its own repeat is a separate object with its own GPU handle, and
   nothing else would ever free it. Three refcounts the shared image behind
   them, so disposing a clone is safe even while the original is still in
   use. */
const ownedTextures: THREE.Texture[] = [];

/** Dispose every material this module created. */
export function disposeMaterials() {
  for (const m of [...owned]) m.dispose();
  owned.length = 0;
  for (const t of ownedTextures) t.dispose();
  ownedTextures.length = 0;
  bench = null;
  room = null;
  disposeRoomTextures();
  disposeSurfaceDetails();
}

/* --- bench furniture (shared, never faded) -------------------------------- */

let bench: ReturnType<typeof buildBench> | null = null;

function buildBench() {
  const wood = woodTexture();
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;

  const esd = esdMatTexture();
  esd.wrapS = esd.wrapT = THREE.RepeatWrapping;
  esd.repeat.set(6, 1);

  return {
    /** unfinished pine benchtop */
    benchTop: own(
      new THREE.MeshStandardMaterial({
        map: wood,
        roughness: 0.72,
        metalness: 0,
        color: '#c9a877',
      }),
    ),
    /** steel bench frame and instrument chassis */
    chassis: own(
      new THREE.MeshStandardMaterial({
        color: '#191c21',
        roughness: 0.52,
        metalness: 0.65,
      }),
    ),
    /** painted instrument front panels — slightly lighter than the chassis */
    panel: own(
      new THREE.MeshStandardMaterial({
        color: '#24282e',
        roughness: 0.62,
        metalness: 0.35,
      }),
    ),
    /** brushed aluminium: brackets, laptop shell, monitor stems */
    aluminium: own(
      new THREE.MeshStandardMaterial({
        map: brushedTexture(),
        color: '#9aa1a8',
        roughness: 0.36,
        metalness: 0.92,
      }),
    ),
    /** dark matte polymer: keyboard deck, bezels, chair shell */
    polymer: own(
      new THREE.MeshStandardMaterial({
        color: '#101216',
        roughness: 0.78,
        metalness: 0.08,
      }),
    ),
    /** anti-static bench mat */
    esdMat: own(
      new THREE.MeshStandardMaterial({
        map: esd,
        roughness: 0.94,
        metalness: 0,
      }),
    ),
    /** self-healing cutting mat — the device stage */
    cuttingMat: own(
      new THREE.MeshStandardMaterial({
        map: cuttingMatTexture(),
        roughness: 0.88,
        metalness: 0,
      }),
    ),
    /** injection-moulded parts bins */
    bin: own(
      new THREE.MeshStandardMaterial({
        color: '#1b56b8',
        roughness: 0.55,
        metalness: 0.05,
      }),
    ),
    /** Woven seat fabric. Rough, faintly warm, and almost non-metallic: the
     *  chair is the largest soft object in the room and the only surface that
     *  should absorb light rather than throw it back. */
    seatFabric: own(
      new THREE.MeshStandardMaterial({
        color: '#1b1e24',
        roughness: 0.94,
        metalness: 0.02,
        envMapIntensity: 0.35,
      }),
    ),
    /** cable jackets and heat-shrink */
    rubber: own(
      new THREE.MeshStandardMaterial({
        color: '#0b0c0e',
        roughness: 0.88,
        metalness: 0.02,
      }),
    ),
    /** floor */
    floor: own(
      new THREE.MeshStandardMaterial({
        color: '#0a0c10',
        roughness: 0.58,
        metalness: 0.3,
      }),
    ),
    /** room walls, well beyond the light falloff */
    wall: own(
      new THREE.MeshStandardMaterial({
        color: '#0d1014',
        roughness: 0.95,
        metalness: 0,
        side: THREE.BackSide,
      }),
    ),
  };
}

export function benchMaterials() {
  if (!bench) bench = buildBench();
  return bench;
}

/* --- the room shell ------------------------------------------------------ */

let room: ReturnType<typeof buildRoom> | null = null;

/** The architecture. Split from the bench set because these are the only
 *  materials in the scene measured in metres per repeat rather than in
 *  millimetres per part, and because they are the ones that had to change when
 *  the light level came up: at the old level none of this was ever visible. */
function buildRoom() {
  const floor = floorTextures();
  const wall = wallTextures();
  const peg = pegboardTextures();
  const ceiling = ceilingTexture();

  /* One repeat per 4m of floor, 2m of wall. Set here rather than in
     roomTextures so a surface can be reused at a different scale without
     re-drawing the canvas. */
  const tile = (t: THREE.Texture, x: number, y: number) => {
    const clone = t.clone();
    clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
    clone.repeat.set(x, y);
    clone.needsUpdate = true;
    ownedTextures.push(clone);
    return clone;
  };

  return {
    /** sealed concrete. Glossy enough to carry the ceiling fixtures as a
     *  smeared reflection, which is most of what makes the floor read as a
     *  floor rather than as a grey plane. */
    floor: own(
      new THREE.MeshStandardMaterial({
        map: tile(floor.map, 3.5, 3.5),
        roughnessMap: tile(floor.roughness, 3.5, 3.5),
        color: '#8c95a2',
        roughness: 1,
        metalness: 0.08,
        envMapIntensity: 0.55,
      }),
    ),
    /** painted blockwork. */
    wall: own(
      new THREE.MeshStandardMaterial({
        map: tile(wall.map, 3, 1.5),
        roughnessMap: tile(wall.roughness, 3, 1.5),
        color: '#7a828d',
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0.3,
      }),
    ),
    /** suspended mineral-fibre ceiling. */
    ceiling: own(
      new THREE.MeshStandardMaterial({
        map: tile(ceiling, 6, 4),
        color: '#9aa2ac',
        roughness: 0.94,
        metalness: 0,
        envMapIntensity: 0.2,
      }),
    ),
    /** perforated hardboard over the bench. */
    pegboard: own(
      new THREE.MeshStandardMaterial({
        map: tile(peg.map, 6, 2),
        roughnessMap: tile(peg.roughness, 6, 2),
        color: '#a08a68',
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0.25,
      }),
    ),
    /** skirting, door frames, cable trunking — painted steel trim. */
    trim: own(
      new THREE.MeshStandardMaterial({
        color: '#2b3038',
        roughness: 0.62,
        metalness: 0.35,
      }),
    ),
    /** the enamelled reflector inside a ceiling fixture. */
    reflector: own(
      new THREE.MeshStandardMaterial({
        color: '#e8eef5',
        roughness: 0.34,
        metalness: 0.18,
      }),
    ),
  };
}

export function roomMaterials() {
  if (!room) room = buildRoom();
  return room;
}

export type BenchMaterials = ReturnType<typeof buildBench>;

/* --- emissive helpers ---------------------------------------------------- */

/** Indicator LED. `toneMapped: false` keeps it above 1.0 so bloom catches it,
 *  which is what makes a 2mm LED read as lit rather than as a coloured dot. */
export function ledMaterial(color: string, intensity = 1) {
  return own(
    new THREE.MeshStandardMaterial({
      color: '#0a0a0a',
      emissive: new THREE.Color(color),
      emissiveIntensity: intensity,
      toneMapped: false,
      roughness: 0.3,
      metalness: 0,
    }),
  );
}

/** Backlit panel: instrument displays, laptop and monitor screens. */
export function screenMaterial(map: THREE.Texture | null, tint = '#ffffff') {
  // Three warns on parameters explicitly passed as undefined, so the optional
  // maps are only attached when there is one.
  const params: THREE.MeshStandardMaterialParameters = {
    color: '#000000',
    emissive: new THREE.Color(tint),
    emissiveIntensity: 1.15,
    toneMapped: false,
    /* Matte, not glossy. A panel at 0.22 roughness catches the bench light as
       a single blown highlight straight across the middle of whatever it is
       displaying — which is fatal once the display is the subject of the
       chapter. Real matte-finish panels scatter it instead. */
    roughness: 0.46,
    metalness: 0,
  };
  if (map) {
    params.map = map;
    params.emissiveMap = map;
  }
  return own(new THREE.MeshStandardMaterial(params));
}

/** The sheet of glass over a panel — laptop lid, monitor, instrument window.
 *
 *  A separate layer rather than a glossier screen material, because the two
 *  behave differently and cannot be one surface: the panel underneath is
 *  emissive and unlit, and the glass over it is lit and reflective. Painting
 *  the reflection into the emissive layer is what made the old screens read as
 *  stickers — an image that stays identical however the camera moves is not a
 *  surface, it is a decal.
 *
 *  The roughness map is the anti-glare coating. It is doing more work here
 *  than the colour is: a perfectly smooth panel mirrors the bench light as one
 *  hard rectangle, and a real matte screen smears it into a soft, uneven
 *  patch that moves as you move.
 */
export function glassMaterial({
  roughness = 0.24,
  opacity = 0.06,
  tint = '#e6f0ff',
  env = 1.0,
  coat = 0.7,
  coatRoughness = 0.18,
}: {
  roughness?: number;
  opacity?: number;
  tint?: string;
  env?: number;
  coat?: number;
  coatRoughness?: number;
} = {}) {
  return own(
    new THREE.MeshPhysicalMaterial({
      color: tint,
      transparent: true,
      opacity,
      roughness,
      roughnessMap: panelCoatTexture(),
      metalness: 0,
      /* A near-mirror clearcoat is what a phone under glass does. A working
         laptop or a bench monitor has an anti-glare coating whose entire job
         is to stop that happening, and modelling one as the other is why the
         screens came back unreadable: the reflection was bright enough to
         compete with the image under it. Scattering the coat is the fix, and
         it is what the real coating physically does. */
      clearcoat: coat,
      clearcoatRoughness: coatRoughness,
      envMapIntensity: env,
      /* Never writes depth. It sits fractions of a millimetre in front of an
         emissive plane, and letting it into the depth buffer at that spacing
         is a coin-toss between the two on every frame. */
      depthWrite: false,
    }),
  );
}

/** The bloom a lit panel throws onto the air in front of it.
 *
 *  Additive and unlit, on a plane larger than the panel. Post-processing bloom
 *  cannot do this on its own: it only knows about pixels that are already
 *  bright, so it spreads the panel's own light outward but never puts any
 *  light between the panel and the camera. This is what gives a bright screen
 *  in a dim room its halo. */
export function screenGlowMaterial(tint = '#8fc4ff', opacity = 0.42) {
  return own(
    new THREE.MeshBasicMaterial({
      map: screenGlowTexture(),
      color: new THREE.Color(tint),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
}

/* --- per-device material sets -------------------------------------------- */

/** A fresh set for one device instance. See the note at the top of the file:
 *  these must not be shared, because devices cross-fade. */
export function deviceMaterials() {
  const set = {
    /** moulded ABS device enclosure */
    abs: own(
      new THREE.MeshStandardMaterial({
        color: '#1d2024',
        bumpMap: microSurface('polymer'),
        bumpScale: 0.000035,
        roughnessMap: microSurface('polymer'),
        roughness: 0.72,
        metalness: 0.05,
      }),
    ),
    /** the rugged transit case — textured polypropylene */
    caseShell: own(
      new THREE.MeshStandardMaterial({
        map: caseShellTexture(),
        bumpMap: microSurface('polymer'),
        bumpScale: 0.00008,
        color: '#8f8568',
        roughness: 0.9,
        metalness: 0.02,
      }),
    ),
    /** machined aluminium brackets and motor bells */
    metal: own(
      new THREE.MeshStandardMaterial({
        map: brushedTexture(),
        bumpMap: microSurface('metal'),
        bumpScale: 0.000016,
        roughnessMap: microSurface('metal'),
        color: '#a0a8b0',
        // A near-mirror finish on the brackets turned every rim light into a
        // blown highlight; machined aluminium is satin, not chrome.
        roughness: 0.48,
        metalness: 0.9,
      }),
    ),
    /** turned steel: shafts, fasteners */
    steel: own(
      new THREE.MeshStandardMaterial({
        color: '#c2c8ce',
        bumpMap: microSurface('metal'),
        bumpScale: 0.000006,
        roughness: 0.25,
        metalness: 1,
      }),
    ),
    /** black anodised / painted motor can */
    motorCan: own(
      new THREE.MeshStandardMaterial({
        color: '#0d0e10',
        roughness: 0.42,
        metalness: 0.7,
      }),
    ),
    /** connector shrouds, cable ties, bulk plastic parts */
    darkPlastic: own(
      new THREE.MeshStandardMaterial({
        color: '#141519',
        roughness: 0.7,
        metalness: 0.04,
      }),
    ),
    /** cable jacket */
    cable: own(
      new THREE.MeshStandardMaterial({
        color: '#0a0b0d',
        roughness: 0.85,
        metalness: 0.03,
      }),
    ),
    /** RF module can — the tinned lid on the cellular module */
    shield: own(
      new THREE.MeshStandardMaterial({
        color: '#b6bcc2',
        roughness: 0.4,
        metalness: 0.95,
      }),
    ),
    /** sealed lead-acid / lithium pack casing */
    battery: own(
      new THREE.MeshStandardMaterial({
        color: '#0e0f11',
        roughness: 0.55,
        metalness: 0.12,
      }),
    ),
    /** bare FR4 board edge */
    fr4: own(
      new THREE.MeshStandardMaterial({
        color: '#8d9160',
        roughness: 0.82,
        metalness: 0,
      }),
    ),
  };
  return set;
}

export type DeviceMaterials = ReturnType<typeof deviceMaterials>;

/* --- wire colours used across both devices ------------------------------- */

export const WIRE_COLORS = {
  red: '#b2231f',
  black: '#0a0a0c',
  blue: '#1b4fb8',
  yellow: '#c9a227',
  white: '#c9ced3',
} as const;

/** Material sets belong to the mounted device, not the history of visited scenes. */
export function useDeviceMaterials() {
  const materials = useMemo(deviceMaterials, []);
  useEffect(() => () => Object.values(materials).forEach(material => material.dispose()), [materials]);
  return materials;
}
