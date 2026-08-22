/* ============================================================================
   Static — a subtree that has finished moving, collapsed into a few draw calls
   ----------------------------------------------------------------------------
   The room is built the way it should be authored: a mesh per skirting board,
   per ceiling tube, per drawer front, per spanner on the pegboard. That reads
   well in the source and renders badly. Measured at the hero shot — the widest
   frame on the page, where nothing is culled — the scene was submitting about
   650 draw calls, and the overwhelming majority of them were single small
   static objects sharing one of a handful of materials.

   Draw calls are main-thread work. Main-thread work during a scroll is what a
   reader feels as lag, and it is felt regardless of how fast the GPU is.

   So this component does two things to everything under it, once, after mount:

   1. MERGES geometry by material. Every mesh sharing a material (and the same
      shadow flags) is baked into one buffer in the group's own space, and the
      originals are hidden. Fifty skirting-and-shelving meshes become one.

   2. Stops the per-frame matrix walk with `matrixWorldAutoUpdate = false`.
      Three.js recomputes a world matrix for every node in the graph every
      frame; for several hundred objects that will never move again, that is
      pure waste.

   Both are safe to fail. Anything that cannot be merged — a lone mesh, a
   material array, mismatched vertex attributes — is simply left alone and
   keeps drawing exactly as it did. The degraded case is today's behaviour, not
   a broken scene.

   WHAT MUST NOT GO IN HERE
   ------------------------
   Anything whose transform changes after mount. It will silently stop moving.
   Anything whose material is animated is fine — merging shares the material
   object, so a fade or an emissive ramp still works — but anything that gets
   its own per-mesh visibility toggled is not, because the merged copy has no
   way to hide just that part of itself.
   ========================================================================== */

import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface Bucket {
  material: THREE.Material;
  castShadow: boolean;
  receiveShadow: boolean;
  meshes: THREE.Mesh[];
}

/** A signature two geometries must share to be mergeable: the same attributes,
 *  in the same order, and the same indexed-ness. `mergeGeometries` rejects any
 *  mismatch by returning null, so grouping on this up front means the merge
 *  either happens or was never attempted — it never half-fails. */
function signature(geometry: THREE.BufferGeometry) {
  return `${Object.keys(geometry.attributes).sort().join(',')}|${geometry.index ? 'i' : 'n'}`;
}

/* Textures that, if present, mean two materials cannot be treated as the same
   surface however identical their numbers look. */
const MAPS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'emissiveMap',
  'aoMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
  'lightMap',
] as const;

/**
 * How to bucket a material.
 *
 * By identity, usually. But most of the small parts in this room are written
 * with an inline `<meshStandardMaterial color="..." />`, and React constructs a
 * NEW material object for every one of those elements — so forty vent slots
 * that are visually the same surface are forty distinct materials, each in a
 * bucket of one, each still its own draw call. Bucketing those by VALUE instead
 * is what turns them into one.
 *
 * The condition for doing that is deliberately narrow, because two materials
 * being interchangeable is a stronger claim than two materials being equal
 * right now. Anything animated in this scene is animated through a ref onto a
 * material object — a screen's map, the batten tube's emissive, a readout
 * brightening — and if such a material were value-merged, the mesh you can see
 * might end up drawn with a different, equal-looking object, and the animation
 * would silently stop.
 *
 * So value-merging is restricted to plain, opaque, untextured, non-emissive
 * standard materials: exactly the class nothing here animates. Everything else
 * falls back to identity, which is always safe.
 */
function materialKey(material: THREE.Material): string {
  const m = material as THREE.MeshStandardMaterial;
  const interchangeable =
    m.type === 'MeshStandardMaterial' &&
    !m.transparent &&
    m.opacity === 1 &&
    m.toneMapped &&
    m.side === THREE.FrontSide &&
    /* Emissive COLOUR only. `emissiveIntensity` defaults to 1 on every
       standard material whether or not it emits anything, so testing it too
       excludes essentially every plain surface in the scene — which is what it
       did on the first attempt here, and why the value-merge originally saved
       nothing at all. A black emissive emits nothing at any intensity, and
       nothing in this scene animates a material from black. */
    (!m.emissive || m.emissive.getHex() === 0x000000) &&
    MAPS.every((k) => !m[k]);

  if (!interchangeable) return material.uuid;

  return [
    'std',
    m.color.getHexString(),
    m.roughness,
    m.metalness,
    m.envMapIntensity,
    m.flatShading ? 1 : 0,
    m.vertexColors ? 1 : 0,
  ].join(':');
}

export function Static({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;

    // one authoritative update, so every child has a world matrix to bake from
    root.updateMatrixWorld(true);

    const toLocal = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const bake = new THREE.Matrix4();
    const buckets = new Map<string, Bucket>();

    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      // instanced meshes are already one call, and merging them would undo that
      if ((mesh as THREE.InstancedMesh).isInstancedMesh) return;
      if (Array.isArray(mesh.material) || !mesh.material) return;
      if (!mesh.visible) return;

      const key = [
        materialKey(mesh.material),
        signature(mesh.geometry),
        mesh.castShadow ? 1 : 0,
        mesh.receiveShadow ? 1 : 0,
      ].join('|');

      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          material: mesh.material,
          castShadow: mesh.castShadow,
          receiveShadow: mesh.receiveShadow,
          meshes: [],
        };
        buckets.set(key, bucket);
      }
      bucket.meshes.push(mesh);
    });

    const created: THREE.Mesh[] = [];
    const hidden: THREE.Mesh[] = [];

    for (const bucket of buckets.values()) {
      if (bucket.meshes.length < 2) continue;

      const baked = bucket.meshes.map((mesh) => {
        const geometry = mesh.geometry.clone();
        // into the group's space, so the merged mesh needs no transform of its own
        geometry.applyMatrix4(bake.multiplyMatrices(toLocal, mesh.matrixWorld));
        /* Merging keeps only the attributes every input has, and morph targets
           and groups make no sense once combined. Dropping them here keeps the
           merge from silently producing a geometry three cannot draw. */
        geometry.morphAttributes = {};
        geometry.clearGroups();
        return geometry;
      });

      const merged = mergeGeometries(baked, false);
      baked.forEach((geometry) => geometry.dispose());
      if (!merged) continue; // incompatible after all — leave the originals alone

      const mesh = new THREE.Mesh(merged, bucket.material);
      mesh.castShadow = bucket.castShadow;
      mesh.receiveShadow = bucket.receiveShadow;
      mesh.matrixAutoUpdate = false;
      mesh.name = 'static:merged';
      root.add(mesh);
      created.push(mesh);

      for (const original of bucket.meshes) {
        original.visible = false;
        hidden.push(original);
      }
    }

    root.updateMatrixWorld(true);
    root.matrixWorldAutoUpdate = false;

    return () => {
      root.matrixWorldAutoUpdate = true;
      for (const mesh of created) {
        root.remove(mesh);
        mesh.geometry.dispose();
      }
      // the materials are shared and owned elsewhere — only the copies go
      for (const original of hidden) original.visible = true;
    };
  }, []);

  return <group ref={group}>{children}</group>;
}
