/* ============================================================================
   Room — the floor area behind the bench
   ----------------------------------------------------------------------------
   Only one chapter looks this way, so the room is deliberately spare: a back
   wall with a doorway, a length of floor with a taped work square on it, and
   a couple of things that say "lab" without asking to be looked at. The
   subject is whatever is standing on the floor, not the set.

   The light over this area is dark until the chapter arrives, then comes up.
   That is what sells the camera turn as *going somewhere* rather than as the
   bench having a second wall.
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
  const fill = useRef<THREE.PointLight>(null);
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
      lamp.current.intensity = THREE.MathUtils.damp(lamp.current.intensity, on * 70, 1.8, d);
    }
    if (fill.current) {
      fill.current.intensity = THREE.MathUtils.damp(fill.current.intensity, on * 22, 1.8, d);
    }
    if (strip.current) {
      strip.current.emissiveIntensity = THREE.MathUtils.damp(
        strip.current.emissiveIntensity,
        0.12 + on * 0.7,
        1.8,
        d,
      );
    }
  });

  const wallZ = ROOM.wallZ;
  const floorY = BENCH.floorY;

  return (
    <group>
      {/* back wall */}
      <mesh position={[0, floorY + 1.6, wallZ]} receiveShadow>
        <planeGeometry args={[12, 3.2]} />
        <meshStandardMaterial color="#0d1015" roughness={0.96} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {/* skirting */}
      <mesh position={[0, floorY + 0.06, wallZ - 0.012]}>
        <boxGeometry args={[12, 0.12, 0.024]} />
        <meshStandardMaterial color="#15191f" roughness={0.9} />
      </mesh>

      {/* doorway: a recess with light spilling from the corridor beyond */}
      <group position={[-1.85, floorY, wallZ - 0.02]}>
        <mesh position={[0, 1.02, 0]}>
          <planeGeometry args={[0.92, 2.04]} />
          <meshStandardMaterial
            color="#0a0d11"
            emissive={new THREE.Color('#2a3a4a')}
            emissiveIntensity={0.5}
            roughness={0.9}
          />
        </mesh>
        {/* frame */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.48, 1.02, 0.02]} material={m.chassis}>
            <boxGeometry args={[0.05, 2.08, 0.05]} />
          </mesh>
        ))}
        <mesh position={[0, 2.06, 0.02]} material={m.chassis}>
          <boxGeometry args={[1.0, 0.05, 0.05]} />
        </mesh>
      </group>

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
            emissiveIntensity={0.15}
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
        intensity={0}
        color="#e2f0ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0008}
        shadow-camera-near={0.5}
        shadow-camera-far={8}
      />
      {/* Cool fill from the bench side. Without it a dark-framed chair against
          a dark wall is a silhouette, and the point of turning round is to
          look at the thing, not at its outline. */}
      <pointLight
        ref={fill}
        position={[ROOM.stage[0] - 1.1, floorY + 1.15, ROOM.stage[2] - 1.5]}
        intensity={0}
        distance={7}
        decay={2}
        color="#9dc6ff"
      />

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

      {/* A rolling tool cabinet against the wall, for depth. Kept on the
          left-hand side: the range lane runs down the right, and a black
          cabinet directly behind a target is a hole, not a background. */}
      {detail === 'high' && (
        <group position={[-1.0, floorY, wallZ - 0.34]}>
          <mesh position={[0, 0.44, 0]} castShadow receiveShadow material={m.chassis}>
            <boxGeometry args={[0.72, 0.88, 0.46]} />
          </mesh>
          {[0.22, 0.44, 0.66].map((y) => (
            <mesh key={y} position={[0, y, 0.235]} material={m.polymer}>
              <boxGeometry args={[0.64, 0.03, 0.012]} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
