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
  brushedTexture,
  caseShellTexture,
  esdMatTexture,
  cuttingMatTexture,
  woodTexture,
} from './textures';

/* --- disposal ------------------------------------------------------------ */

const owned: THREE.Material[] = [];
function own<T extends THREE.Material>(m: T): T {
  owned.push(m);
  return m;
}

/** Dispose every material this module created. */
export function disposeMaterials() {
  for (const m of owned) m.dispose();
  owned.length = 0;
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

/* --- per-device material sets -------------------------------------------- */

/** A fresh set for one device instance. See the note at the top of the file:
 *  these must not be shared, because devices cross-fade. */
export function deviceMaterials() {
  const set = {
    /** moulded ABS device enclosure */
    abs: own(
      new THREE.MeshStandardMaterial({
        color: '#17181b',
        roughness: 0.62,
        metalness: 0.05,
      }),
    ),
    /** the rugged transit case — textured polypropylene */
    caseShell: own(
      new THREE.MeshStandardMaterial({
        map: caseShellTexture(),
        color: '#8f8568',
        roughness: 0.9,
        metalness: 0.02,
      }),
    ),
    /** machined aluminium brackets and motor bells */
    metal: own(
      new THREE.MeshStandardMaterial({
        map: brushedTexture(),
        color: '#8f979f',
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
        roughness: 0.22,
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
