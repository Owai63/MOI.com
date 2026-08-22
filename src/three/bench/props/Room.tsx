/* ============================================================================
   Room — the work area out on the floor
   ----------------------------------------------------------------------------
   The architecture moved to RoomShell when the camera started walking around
   the room; what is left here is the WORK AREA — the taped square on the
   floor, the fixture over it, and the lighting that responds to a chapter
   arriving. That split matters: the shell is always there and never changes,
   this reacts.

   The light over this area used to be dark until its chapter arrived, which
   sold the camera turn as going somewhere. That is no longer the right trade.
   The reader can now see this end of the room from most of the walk, and an
   area that is pitch black until you are told to look at it reads as a set
   being struck rather than as a lab. So it now sits at a working level and
   LIFTS for its chapter, which is the same beat played at a level that
   survives being looked at from across the room.
   ========================================================================== */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { benchMaterials } from '../materials';
import { BENCH, ROOM } from '../layout';
import { DEVICES } from '../devices/registry';
import { sceneState } from '../../sceneState';

export function Room({
  /** indices of the chapters staged out here. */
  roomChapters,
  detail = 'high',
}: {
  roomChapters: number[];
  detail?: 'high' | 'low';
}) {
  const m = benchMaterials();
  const lamp = useRef<THREE.SpotLight>(null);
  const strip = useRef<THREE.MeshStandardMaterial>(null);

  /* The lamp's aim point, as a real object in the scene.

     A spotLight's `target` is a plain Object3D, and Three reads its
     `matrixWorld` when it uploads the light. An unparented target is never
     walked by the renderer's world-matrix update, so its matrix stays the
     identity and the light quietly aims at the world origin — which is the
     bench, at the other end of the room. This scene has been lighting the
     back of the bench and calling it the room light; from a low camera the
     difference never showed, and from a high one the fixture over the bench
     blows out. Attaching the target is the whole fix. */
  const aim = useMemo(() => new THREE.Object3D(), []);

  /** Where each room chapter actually stands. They are not all on the room's
   *  centre mark — see the range's lane in devices/registry.tsx — and a lamp
   *  aimed at the mark leaves the far end of a laid track in the dark. */
  const anchors = useMemo(
    () =>
      roomChapters.map((i) => {
        const p = DEVICES[i]?.stage.position ?? [0, 0, 0];
        return new THREE.Vector3(ROOM.stage[0] + p[0], BENCH.floorY, ROOM.stage[2] + p[2]);
      }),
    [roomChapters],
  );

  useFrame((_, delta) => {
    const d = Math.min(delta, 1 / 30);
    // up only while the room chapter is the one being read
    const active = roomChapters.indexOf(sceneState.activeProject);
    const on = active >= 0 ? 1 : 0;

    // follow whichever room chapter is on screen, and hold on the last one
    // while the light is fading down
    const want = anchors[active >= 0 ? active : 0];
    if (want) {
      if (sceneState.snap) aim.position.copy(want);
      else {
        aim.position.x = THREE.MathUtils.damp(aim.position.x, want.x, 2.4, d);
        aim.position.y = want.y;
        aim.position.z = THREE.MathUtils.damp(aim.position.z, want.z, 2.4, d);
      }
    }
    if (lamp.current) {
      /* Still large next to the bench key, and has to be: this lamp hangs
         ~2.6m from the floor it lights where the batten hangs 0.7m, and with
         decay={2} that is a factor of fourteen in irradiance. It used to be
         145, which was compensating for a target that was never attached and
         so aimed the cone at the bench instead; with the aim fixed the same
         floor gets there on rather less, and a 1.7m target standing under it
         no longer clips to white. */
      lamp.current.intensity = THREE.MathUtils.damp(lamp.current.intensity, 30 + on * 58, 1.8, d);
    }
    if (strip.current) {
      strip.current.emissiveIntensity = THREE.MathUtils.damp(
        strip.current.emissiveIntensity,
        0.55 + on * 0.85,
        1.8,
        d,
      );
    }
  });

  const floorY = BENCH.floorY;

  return (
    <group>
      {/* the batten over the work square */}
      <group position={[ROOM.light[0], ROOM.light[1], ROOM.light[2]]}>
        <mesh material={m.polymer}>
          <boxGeometry args={[1.5, 0.05, 0.09]} />
        </mesh>
        <mesh position={[0, -0.028, 0]}>
          <boxGeometry args={[1.44, 0.008, 0.07]} />
          <meshStandardMaterial
            ref={strip}
            color="#0e1114"
            emissive={new THREE.Color('#dceeff')}
            emissiveIntensity={0.55}
            toneMapped={false}
            roughness={0.4}
          />
        </mesh>
      </group>
      <primitive object={aim} />
      <spotLight
        ref={lamp}
        position={[ROOM.light[0], ROOM.light[1] - 0.05, ROOM.light[2]]}
        target={aim}
        angle={0.85}
        penumbra={1}
        distance={7}
        decay={2}
        intensity={30}
        color="#e2f0ff"
      />
      {/* The cool fill from the bench side that used to sit here is gone. It
          existed because a dark-framed chair against a dark wall was a
          silhouette — which was true when this end of the room was unlit
          except during its own chapter. The ceiling run is on all the time
          now and does the same job from a position the reader can see, so the
          fill was a second per-fragment light in every frame of the whole
          page buying something the room already had. */}

      {/* taped work square on the floor — where equipment gets set up */}
      {detail === 'high' && (
        <group position={[ROOM.stage[0], floorY + 0.002, ROOM.stage[2]]}>
          {([[0, -1], [0, 1]] as const).map(([, s], i) => (
            <mesh key={i} position={[0, 0, s * 0.95]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.2, 0.035]} />
              <meshStandardMaterial color="#7a6520" roughness={0.92} />
            </mesh>
          ))}
          {([-1, 1] as const).map((s) => (
            <mesh key={s} position={[s * 1.1, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.035, 1.93]} />
              <meshStandardMaterial color="#7a6520" roughness={0.92} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
