/* ============================================================================
   RoomShell — the building
   ----------------------------------------------------------------------------
   Until this pass the "room" was a 16 × 6 × 12 box with its normals flipped,
   sitting far enough out that it never caught any light. That was the correct
   amount of building for a scene where the camera never left one metre of
   benchtop and every wide shot fell off into black.

   It is the wrong amount of building for a camera that walks around. A
   walkthrough is only convincing if the walls are where a room's walls would
   be — close enough to bound the space, and carrying the ceiling, the fixtures
   over the floor, and the wall furniture above the bench that tells you which
   way you are facing. Losing your bearings is what a scene with no landmarks
   feels like, and landmarks are exactly what a featureless box has none of.

   So: six real surfaces at real dimensions (SHELL in layout.ts, which the
   camera clamp reads too), a ceiling grid with the fixtures that actually
   light the floor, a pegboard wall over the bench, and a doorway with a lit
   corridor beyond it. Nothing here animates, so it is all static geometry on
   shared materials.
   ========================================================================== */

import { useMemo } from 'react';
import * as THREE from 'three';
import { benchMaterials, roomMaterials } from '../materials';
import { BENCH, SHELL, CEILING_FIXTURES, ROOM } from '../layout';

const FLOOR = BENCH.floorY;

/** Wall/ceiling planes carry no shadow of their own but must receive one, or
 *  the pool the bench light throws on the wall behind the monitors has no
 *  edge to it. */
function Surface({
  position,
  rotation,
  size,
  material,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  material: THREE.Material;
}) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow material={material}>
      <planeGeometry args={size} />
    </mesh>
  );
}

/** One suspended fixture: a painted steel housing, an enamelled reflector, and
 *  the tube itself. The tube is the visible source; the illumination comes
 *  from the point lights in the canvas rig, positioned to agree with it. */
function CeilingFixture({ position }: { position: [number, number, number] }) {
  const r = roomMaterials();
  const m = benchMaterials();
  return (
    <group position={position}>
      {/* housing */}
      <mesh material={r.trim}>
        <boxGeometry args={[1.24, 0.075, 0.28]} />
      </mesh>
      {/* the reflector wings either side of the tubes */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, -0.028, s * 0.105]} rotation={[s * 0.5, 0, 0]} material={r.reflector}>
          <boxGeometry args={[1.2, 0.005, 0.09]} />
        </mesh>
      ))}
      {/* two tubes */}
      {[-0.05, 0.05].map((z) => (
        <mesh key={z} position={[0, -0.046, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.017, 0.017, 1.18, 10]} />
          <meshStandardMaterial
            color="#101418"
            emissive={new THREE.Color('#e6f1ff')}
            emissiveIntensity={1.35}
            toneMapped={false}
            roughness={0.35}
          />
        </mesh>
      ))}
      {/* drop rods back to the slab */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]} material={m.chassis}>
          <cylinderGeometry args={[0.004, 0.004, 0.4, 6]} />
        </mesh>
      ))}
    </group>
  );
}

/** What hangs on the pegboard over the bench. Silhouettes, deliberately: from
 *  anywhere the camera actually stands these are 20-30px tall, and what they
 *  have to do is break the board up and say "tools", not be identifiable. */
function PegboardTools() {
  const m = benchMaterials();
  const hooks = useMemo(
    () =>
      [
        // x, length, width — a rack of spanners and drivers, sizes descending
        [-1.02, 0.2, 0.022],
        [-0.94, 0.185, 0.02],
        [-0.86, 0.17, 0.018],
        [-0.78, 0.155, 0.017],
        [0.52, 0.24, 0.014],
        [0.58, 0.225, 0.014],
        [0.64, 0.21, 0.013],
        [0.7, 0.195, 0.013],
      ] as const,
    [],
  );

  return (
    <group>
      {hooks.map(([x, len, w]) => (
        <group key={x} position={[x, -0.02, 0.012]}>
          <mesh position={[0, -len / 2, 0]} material={m.aluminium}>
            <boxGeometry args={[w, len, 0.006]} />
          </mesh>
          {/* the hook it hangs on */}
          <mesh position={[0, 0.012, 0.004]} material={m.chassis}>
            <boxGeometry args={[0.004, 0.03, 0.004]} />
          </mesh>
        </group>
      ))}

      {/* a coil of hookup wire on a hook */}
      <mesh position={[-0.34, -0.14, 0.024]} rotation={[0, 0, 0]} material={m.rubber}>
        <torusGeometry args={[0.075, 0.008, 6, 24]} />
      </mesh>

      {/* two spools of solder */}
      {[0.02, 0.16].map((x) => (
        <mesh key={x} position={[x, -0.15, 0.03]} rotation={[Math.PI / 2, 0, 0]} material={m.polymer}>
          <cylinderGeometry args={[0.045, 0.045, 0.03, 18]} />
        </mesh>
      ))}

      {/* a printed schematic taped up, curling at one corner */}
      <mesh position={[1.05, -0.16, 0.008]} rotation={[0, 0, -0.03]}>
        <planeGeometry args={[0.3, 0.4]} />
        <meshStandardMaterial color="#c9cfd6" roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function RoomShell({ detail = 'high' }: { detail?: 'high' | 'low' }) {
  const r = roomMaterials();
  const m = benchMaterials();

  const width = SHELL.maxX - SHELL.minX;
  const depth = SHELL.backZ - SHELL.frontZ;
  const height = SHELL.ceilingY - FLOOR;
  const midX = (SHELL.minX + SHELL.maxX) / 2;
  const midZ = (SHELL.frontZ + SHELL.backZ) / 2;
  const midY = FLOOR + height / 2;

  return (
    <group>
      {/* --- floor and ceiling --------------------------------------------- */}
      <Surface
        position={[midX, FLOOR, midZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[width, depth]}
        material={r.floor}
      />
      <Surface
        position={[midX, SHELL.ceilingY, midZ]}
        rotation={[Math.PI / 2, 0, 0]}
        size={[width, depth]}
        material={r.ceiling}
      />

      {/* --- walls ---------------------------------------------------------- */}
      {/* front: the wall the bench backs onto */}
      <Surface
        position={[midX, midY, SHELL.frontZ]}
        rotation={[0, 0, 0]}
        size={[width, height]}
        material={r.wall}
      />
      {/* back: the one with the doorway */}
      <Surface
        position={[midX, midY, SHELL.backZ]}
        rotation={[0, Math.PI, 0]}
        size={[width, height]}
        material={r.wall}
      />
      {/* sides */}
      <Surface
        position={[SHELL.minX, midY, midZ]}
        rotation={[0, Math.PI / 2, 0]}
        size={[depth, height]}
        material={r.wall}
      />
      <Surface
        position={[SHELL.maxX, midY, midZ]}
        rotation={[0, -Math.PI / 2, 0]}
        size={[depth, height]}
        material={r.wall}
      />

      {/* --- skirting ------------------------------------------------------- */}
      {(
        [
          [[midX, FLOOR + 0.06, SHELL.frontZ + 0.012], [width, 0.12, 0.024]],
          [[midX, FLOOR + 0.06, SHELL.backZ - 0.012], [width, 0.12, 0.024]],
          [[SHELL.minX + 0.012, FLOOR + 0.06, midZ], [0.024, 0.12, depth]],
          [[SHELL.maxX - 0.012, FLOOR + 0.06, midZ], [0.024, 0.12, depth]],
        ] as const
      ).map(([pos, size], i) => (
        <mesh key={i} position={pos as unknown as [number, number, number]} material={r.trim}>
          <boxGeometry args={size as unknown as [number, number, number]} />
        </mesh>
      ))}

      {/* --- ceiling fixtures ------------------------------------------------ */}
      {CEILING_FIXTURES.map(([x, z]) => (
        <CeilingFixture key={`${x}:${z}`} position={[x, SHELL.fixtureY, z]} />
      ))}

      {/* --- the wall over the bench ----------------------------------------- */}
      {/* Pegboard, standing off the wall on its battens the way a real one
          does — the shadow in that 20mm gap is what stops it reading as a
          poster. */}
      <mesh position={[-0.1, 0.62, SHELL.frontZ + 0.022]} castShadow receiveShadow material={r.pegboard}>
        <boxGeometry args={[2.4, 0.92, 0.008]} />
      </mesh>
      <group position={[-0.1, 0.62, SHELL.frontZ + 0.03]}>
        <PegboardTools />
      </group>

      {/* a shelf above the pegboard, with document boxes on it */}
      <mesh position={[-0.1, 1.16, SHELL.frontZ + 0.14]} castShadow receiveShadow material={m.benchTop}>
        <boxGeometry args={[2.4, 0.026, 0.26]} />
      </mesh>
      {[-1.0, -0.78, -0.56, 0.62, 0.84].map((x, i) => (
        <mesh
          key={x}
          position={[x, 1.29, SHELL.frontZ + 0.15]}
          rotation={[0, 0, i === 2 ? 0.06 : 0]}
          castShadow
          material={i % 2 ? m.bin : m.polymer}
        >
          <boxGeometry args={[0.09, 0.24, 0.22]} />
        </mesh>
      ))}

      {/* Cable trunking running the length of the wall and dropping to the
          bench, because everything on the bench has to be plugged into
          something. */}
      <mesh position={[0, 0.16, SHELL.frontZ + 0.03]} material={r.trim}>
        <boxGeometry args={[width - 0.4, 0.07, 0.05]} />
      </mesh>
      {[-1.6, 0.5, 1.9].map((x) => (
        <group key={x}>
          <mesh position={[x, -0.16, SHELL.frontZ + 0.03]} material={r.trim}>
            <boxGeometry args={[0.06, 0.58, 0.045]} />
          </mesh>
          {/* twin sockets */}
          <mesh position={[x, 0.3, SHELL.frontZ + 0.035]} material={r.reflector}>
            <boxGeometry args={[0.15, 0.085, 0.03]} />
          </mesh>
        </group>
      ))}

      {/* --- the doorway in the back wall ------------------------------------ */}
      <group position={[-1.85, FLOOR, ROOM.wallZ - 0.02]}>
        {/* the opening: a lit corridor rather than a painted rectangle */}
        <mesh position={[0, 1.02, -0.06]}>
          <planeGeometry args={[0.92, 2.04]} />
          <meshStandardMaterial
            color="#0f151c"
            emissive={new THREE.Color('#39536e')}
            emissiveIntensity={0.85}
            roughness={0.9}
          />
        </mesh>
        {/* reveal, so the opening has depth */}
        {([-1, 1] as const).map((s) => (
          <mesh key={s} position={[s * 0.46, 1.02, -0.03]} rotation={[0, -s * (Math.PI / 2), 0]} material={r.wall}>
            <planeGeometry args={[0.08, 2.04]} />
          </mesh>
        ))}
        {/* frame */}
        {([-1, 1] as const).map((s) => (
          <mesh key={`f${s}`} position={[s * 0.485, 1.02, 0.01]} material={r.trim}>
            <boxGeometry args={[0.05, 2.1, 0.06]} />
          </mesh>
        ))}
        <mesh position={[0, 2.06, 0.01]} material={r.trim}>
          <boxGeometry args={[1.02, 0.05, 0.06]} />
        </mesh>
      </group>

      {detail === 'high' && (
        <>
          {/* A rolling tool cabinet against the back wall. Kept on the left:
              the range lane runs down the right, and a black cabinet directly
              behind a target is a hole, not a background. */}
          <group position={[-1.0, FLOOR, ROOM.wallZ - 0.34]}>
            <mesh position={[0, 0.44, 0]} castShadow receiveShadow material={m.chassis}>
              <boxGeometry args={[0.72, 0.88, 0.46]} />
            </mesh>
            {[0.22, 0.44, 0.66].map((y) => (
              <mesh key={y} position={[0, y, 0.235]} material={m.polymer}>
                <boxGeometry args={[0.64, 0.03, 0.012]} />
              </mesh>
            ))}
            {/* worktop and a stack of trays on it */}
            <mesh position={[0, 0.895, 0]} castShadow material={m.benchTop}>
              <boxGeometry args={[0.76, 0.022, 0.5]} />
            </mesh>
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[0.12, 0.925 + i * 0.045, -0.02]} castShadow material={m.bin}>
                <boxGeometry args={[0.34, 0.04, 0.26]} />
              </mesh>
            ))}
          </group>

          {/* A steel shelving bay on the right-hand wall, so the far side of
              the room is not an empty face. */}
          <group position={[SHELL.maxX - 0.32, FLOOR, 2.1]} rotation={[0, -Math.PI / 2, 0]}>
            {[0.02, 0.46, 0.9, 1.34, 1.78].map((y) => (
              <mesh key={y} position={[0, y, 0]} receiveShadow material={m.chassis}>
                <boxGeometry args={[1.6, 0.022, 0.5]} />
              </mesh>
            ))}
            {([-1, 1] as const).map((sx) =>
              ([-1, 1] as const).map((sz) => (
                <mesh
                  key={`${sx}${sz}`}
                  position={[sx * 0.78, 0.9, sz * 0.23]}
                  material={m.chassis}
                >
                  <boxGeometry args={[0.04, 1.8, 0.04]} />
                </mesh>
              )),
            )}
            {/* boxed stock */}
            {[
              [-0.5, 0.62],
              [-0.1, 0.62],
              [0.42, 1.06],
              [-0.44, 1.5],
            ].map(([x, y], i) => (
              <mesh key={i} position={[x, y, 0]} castShadow material={i % 2 ? m.bin : m.polymer}>
                <boxGeometry args={[0.34, 0.3, 0.34]} />
              </mesh>
            ))}
          </group>
        </>
      )}
    </group>
  );
}
