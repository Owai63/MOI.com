/* ============================================================================
   Workbench — the scene graph
   ----------------------------------------------------------------------------
   Two modes share one component tree:

     bench    the full room. Furniture, instruments and screens are static;
              the six devices are all mounted but only the chapter in view is
              built, so at any moment one object is assembling, running, or
              folding away while the rest are invisible and cost nothing.

     inspect  a case study. The bench is gone and a single device stands alone
              on a turntable, scaled up to a readable size and separated by the
              page's scroll.

     range    the shooting-range case study, whose subject is a lane rather
              than an object. Nothing else in this tree is built for it — see
              range/RangeScene.tsx.

   Device mounting is staggered across idle callbacks after first paint.
   Building a board's artwork costs a few milliseconds of canvas work, and six
   of them at once is a visible hitch on the first frame — but the work section
   is several screens below the fold, so there is plenty of idle time to spend
   before any of it is needed.
   ========================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { sceneState } from '../sceneState';
import {
  DEVICES,
  deviceIndex,
  ROOM_CHAPTERS,
  type DeviceEntry,
  type StageKind,
} from './devices/registry';
import { RangeScene } from './range/RangeScene';
import { Desk, StageMat, Chair, BattenLight, Dressing } from './props/Furniture';
import { Monitors, Laptop } from './props/Computers';
import { Oscilloscope, PowerSupply } from './props/Instruments';
import { Room } from './props/Room';
import {
  BENCH,
  STAGE,
  ROOM,
  LAPTOP,
  LAPTOP_BENCH_SPOT,
  MONITORS,
  SCOPE,
  PSU,
  CHAIR_POSITION,
  BATTEN,
} from './layout';
import { benchMaterials } from './materials';

type Detail = 'high' | 'low';

/** Mount one more device per idle slot until they are all up. */
function useProgressiveMount(total: number, enabled: boolean) {
  const [mounted, setMounted] = useState(enabled ? 1 : total);

  useEffect(() => {
    if (!enabled || mounted >= total) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (h: number) => void;
    };
    if (w.requestIdleCallback) {
      const h = w.requestIdleCallback(() => setMounted((n) => n + 1), { timeout: 600 });
      return () => w.cancelIdleCallback?.(h);
    }
    const t = setTimeout(() => setMounted((n) => n + 1), 180);
    return () => clearTimeout(t);
  }, [mounted, total, enabled]);

  return mounted;
}

/* --- devices ------------------------------------------------------------- */

/** Where a chapter's subject physically stands. Devices are modelled with
 *  their origin on whatever they sit on, so this is just the surface. */
function stageOrigin(kind: StageKind): [number, number, number] {
  switch (kind) {
    case 'laptop':
      return LAPTOP_BENCH_SPOT;
    case 'room':
      return ROOM.stage;
    default:
      return STAGE;
  }
}

/** One device in its staged pose. `activeRef` is written by the parent each
 *  frame; the device's own assembly hook damps against it. */
function BenchDevice({
  entry,
  activeRef,
  detail,
}: {
  entry: DeviceEntry;
  activeRef: React.MutableRefObject<number>;
  detail: Detail;
}) {
  const { position, rotation, scale } = entry.stage;
  const origin = stageOrigin(entry.stageKind);
  return (
    <group
      name={`device:${entry.slug}`}
      position={[origin[0] + position[0], origin[1] + position[1], origin[2] + position[2]]}
      rotation={rotation as unknown as THREE.Euler}
      scale={scale}
    >
      {entry.render({ activeRef, detail })}
    </group>
  );
}

/** The inspected device: centred, scaled to a readable size, turning slowly. */
function InspectedDevice({ entry, detail }: { entry: DeviceEntry; detail: Detail }) {
  const spin = useRef<THREE.Group>(null);
  const always = useRef(1);

  useFrame((_, delta) => {
    if (!spin.current) return;
    // a slow turntable, plus a nudge from the pointer so the object feels
    // held rather than displayed
    sceneState.turntable += Math.min(delta, 1 / 30) * 0.16;
    spin.current.rotation.y =
      entry.inspect.rotation[1] + sceneState.turntable + sceneState.pointerX * 0.35;
    spin.current.rotation.x = THREE.MathUtils.damp(
      spin.current.rotation.x,
      entry.inspect.rotation[0] - sceneState.pointerY * 0.12,
      3,
      Math.min(delta, 1 / 30),
    );
  });

  return (
    <group position={[0, 0, 0]} scale={entry.inspect.scale}>
      <group ref={spin}>{entry.render({ activeRef: always, detail })}</group>
    </group>
  );
}

/* --- scene --------------------------------------------------------------- */

export function Workbench({
  mode,
  slug,
  detail,
}: {
  mode: 'bench' | 'inspect' | 'range';
  slug?: string;
  detail: Detail;
}) {
  const m = benchMaterials();
  const bench = mode === 'bench';

  /* dev-only: expose the graph, and a picker, so the scene can be inspected
     from automation. Headless WebGL renders this far too slowly to judge from
     a timed screenshot, so being able to ask "what is that dark shape at 0.7,
     0.6 of the frame" is the difference between measuring and guessing. */
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const raycaster = useThree((s) => s.raycaster);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as {
      __benchScene?: THREE.Scene;
      __pick?: (u: number, v: number) => string;
    };
    w.__benchScene = scene;
    w.__pick = (u, v) => {
      raycaster.setFromCamera(new THREE.Vector2(u * 2 - 1, -(v * 2 - 1)), camera);
      // the default line threshold is a whole world unit: without this the
      // command link swallows every pick in the room
      raycaster.params.Line.threshold = 0.002;
      const hit = raycaster.intersectObjects(scene.children, true).find((h) => {
        if ((h.object as THREE.Line).isLine) return false;
        let o: THREE.Object3D | null = h.object;
        while (o) {
          if (!o.visible) return false;
          o = o.parent;
        }
        return true;
      });
      if (!hit) return 'nothing';
      const chain: string[] = [];
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        chain.push(o.name || o.type);
        o = o.parent;
      }
      const mesh = hit.object as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      const geo = mesh.geometry as THREE.BufferGeometry & { parameters?: object };
      const at = hit.point;
      return [
        `${hit.distance.toFixed(2)}m`,
        chain.reverse().join('>'),
        `@${at.toArray().map((n) => n.toFixed(2)).join(',')}`,
        geo?.type,
        JSON.stringify(geo?.parameters ?? {}),
        mat ? `col#${mat.color?.getHexString()} em${(mat.emissiveIntensity ?? 0).toFixed(2)}` : 'nomat',
      ].join(' ');
    };
  }, [scene, camera, raycaster]);

  // one gate per device, written from the shared state every frame
  const gates = useMemo(
    () => DEVICES.map(() => ({ current: 0 })) as React.MutableRefObject<number>[],
    [],
  );

  useFrame(() => {
    if (!bench) return;
    const active = sceneState.activeProject;
    for (let i = 0; i < gates.length; i++) gates[i].current = active === i ? 1 : 0;
  });

  const mounted = useProgressiveMount(DEVICES.length, bench);

  const inspected = useMemo(() => {
    if (mode !== 'inspect' || !slug) return null;
    const i = deviceIndex(slug);
    return i >= 0 ? DEVICES[i] : null;
  }, [mode, slug]);

  if (mode === 'range') return <RangeScene detail={detail} />;

  if (!bench) {
    return (
      <group>
        {inspected && <InspectedDevice entry={inspected} detail={detail} />}
        {/* a suggestion of the bench surface under the object, so it is lit
            from below by something rather than floating in a void */}
        <mesh position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          {/* wide enough that its rim always sits past the fog, so the
              ground reads as a dark surface rather than a disc in space */}
          <circleGeometry args={[5, 48]} />
          <meshStandardMaterial color="#080a0e" roughness={0.66} metalness={0.3} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {/* --- room ---------------------------------------------------------- */}
      <mesh position={[0, BENCH.floorY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={m.floor}>
        <planeGeometry args={[14, 14]} />
      </mesh>
      {/* the room shell — never lit directly, it only stops the background
          reading as an infinite void behind the bench */}
      <mesh position={[0, 0.6, 0.6]} material={m.wall}>
        <boxGeometry args={[16, 6, 12]} />
      </mesh>

      {/* --- bench --------------------------------------------------------- */}
      <Desk />
      <StageMat />
      <Chair position={CHAIR_POSITION} />
      <BattenLight position={BATTEN.position} length={BATTEN.length} />

      {/* --- the floor area the camera turns around to face ----------------- */}
      <Room roomChapters={ROOM_CHAPTERS} detail={detail} />

      {/* --- instruments and screens --------------------------------------- */}
      <Oscilloscope position={SCOPE.position} rotation={[0, SCOPE.yaw, 0]} />
      <PowerSupply position={PSU.position} rotation={[0, PSU.yaw, 0]} />
      <Monitors position={MONITORS.position} rotation={[0, MONITORS.yaw, 0]} />
      <Laptop position={LAPTOP.position} rotation={[0, LAPTOP.yaw, 0]} />
      <Dressing detail={detail} />

      {/* --- devices ------------------------------------------------------- */}
      {DEVICES.slice(0, mounted).map((entry, i) => (
        <BenchDevice key={entry.slug} entry={entry} activeRef={gates[i]} detail={detail} />
      ))}
    </group>
  );
}
