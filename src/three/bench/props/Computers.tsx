/* ============================================================================
   Computers — the laptop and the two bench monitors
   ----------------------------------------------------------------------------
   The monitors carry the real reference photographs of the hardware (see
   scripts/prepare-photos.mjs). That is deliberate: the bench shows the actual
   device next to the actual photograph of it, which is a stronger claim than
   either alone, and it is the honest use of those images — a photo pinned up
   on the bench, not a rendering pretending to be one.

   Photographs are optional. If the prepared files are absent the screens fall
   back to the generated console art, so a fresh clone still renders correctly
   before `npm run photos` has been run.

   Both machines also run the *chapter programs* (see ../screens/programs.ts).
   Chapters whose subject is software are staged here rather than on the mat:
   the camera comes round to read the laptop, and the laptop is running the
   pipeline the chapter describes. Hardware chapters use the right-hand
   monitor the same way — the tracker's own track is being drawn behind it
   while the unit sits on the bench.
   ========================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { benchMaterials, screenMaterial } from '../materials';
import { codeScreenTexture, dashboardTexture } from '../textures';
import { asset } from '../../../lib/asset';
import { sceneState } from '../../sceneState';
import { DEVICES } from '../devices/registry';
import { PROGRAMS, type ProgramId, type ScreenProgram } from '../screens/programs';
import { useScreenProgram } from '../screens/useScreenProgram';

/** The chapter program bound to a given surface, or null when nothing on
 *  screen wants that surface. Read from the shared scene state each frame, so
 *  it needs no React re-render to switch. */
function activeProgramFor(target: 'laptop' | 'monitor'): ScreenProgram | null {
  const i = sceneState.activeProject;
  if (i < 0) return null;
  const screen = DEVICES[i]?.screen;
  if (!screen || screen.target !== target) return null;
  return PROGRAMS[screen.program];
}

/** Load a texture that may not exist. Deliberately not `useTexture`: a missing
 *  optional asset should degrade to the generated art, not suspend forever or
 *  throw past the boundary. */
function useOptionalTexture(url: string | null) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let dead = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      asset(url),
      (t) => {
        if (dead) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        setTex(t);
      },
      undefined,
      () => {
        /* absent — the caller keeps its fallback */
      },
    );
    return () => {
      dead = true;
    };
  }, [url]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

/* --- monitors ------------------------------------------------------------ */

/** Per-chapter reference photograph shown on the right-hand monitor. */
const REFERENCE_PHOTO: Record<string, string> = {
  mymo2: '/assets/photos/tracker-unit.webp',
  'shooting-range': '/assets/photos/range-open.webp',
};

export function Monitors({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const m = benchMaterials();

  const PANEL_W = 0.50;
  const PANEL_H = 0.29;
  const BEZEL = 0.008;

  const code = useMemo(() => codeScreenTexture(), []);
  const dash = useMemo(() => dashboardTexture(), []);

  const codeMat = useMemo(() => screenMaterial(code, '#cfe6ff'), [code]);
  const rightMat = useMemo(() => screenMaterial(dash, '#dff2ff'), [dash]);

  // both reference photographs, so switching chapters never waits on a load
  const trackerPhoto = useOptionalTexture(REFERENCE_PHOTO.mymo2);
  const rangePhoto = useOptionalTexture(REFERENCE_PHOTO['shooting-range']);

  const lastSurface = useRef<string | null>(null);
  const [program, setProgram] = useState<ScreenProgram | null>(null);
  const programTex = useScreenProgram(program, 1024, 592);

  useFrame((state, delta) => {
    const d = Math.min(delta, 1 / 30);

    // the editor pane scrolls; free, because it only moves the sampler offset
    code.offset.y = (-state.clock.elapsedTime * 0.011) % 1;

    /* What the right-hand monitor shows, in order of preference: the chapter's
       own console program, the reference photograph of the device on the
       bench, or the idle fleet dashboard between chapters. */
    const wanted = activeProgramFor('monitor');
    if (wanted?.id !== program?.id) setProgram(wanted);

    const active = sceneState.activeProject;
    const slug = active >= 0 ? DEVICES[active].slug : null;
    const photo =
      slug === 'mymo2' ? trackerPhoto : slug === 'shooting-range' ? rangePhoto : null;
    const surface = wanted ? programTex : (photo ?? dash);
    const key = wanted ? `p:${wanted.id}` : photo ? `photo:${slug}` : 'dash';
    if (key !== lastSurface.current) {
      lastSurface.current = key;
      rightMat.map = surface;
      rightMat.emissiveMap = surface;
      rightMat.needsUpdate = true;
    }

    // screens dim while the reader is deep in a chapter, so the device on the
    // mat stays the brightest thing in frame
    const focus = sceneState.power;
    const want = 0.85 - focus * 0.35;
    codeMat.emissiveIntensity = THREE.MathUtils.damp(codeMat.emissiveIntensity, want, 2, d);
    rightMat.emissiveIntensity = THREE.MathUtils.damp(rightMat.emissiveIntensity, want + 0.1, 2, d);
  });

  const panel = (x: number, yaw: number, mat: THREE.Material) => (
    <group position={[x, 0, 0]} rotation={[0, yaw, 0]}>
      {/* bezel + back shell */}
      <mesh position={[0, PANEL_H / 2 + 0.13, 0]} castShadow material={m.polymer}>
        <boxGeometry args={[PANEL_W + BEZEL * 2, PANEL_H + BEZEL * 2, 0.016]} />
      </mesh>
      {/* the panel itself */}
      <mesh position={[0, PANEL_H / 2 + 0.13, 0.0092]} material={mat}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
      </mesh>
      {/* stem + foot */}
      <mesh position={[0, 0.075, -0.01]} material={m.aluminium}>
        <boxGeometry args={[0.028, 0.15, 0.018]} />
      </mesh>
      <mesh position={[0, 0.006, 0.01]} castShadow material={m.aluminium}>
        <boxGeometry args={[0.19, 0.012, 0.11]} />
      </mesh>
    </group>
  );

  return (
    <group position={position} rotation={rotation as unknown as THREE.Euler}>
      {panel(-0.28, 0.22, codeMat)}
      {panel(0.28, -0.22, rightMat)}
    </group>
  );
}

/* --- laptop -------------------------------------------------------------- */

export function Laptop({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  program: forced,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Pin the screen to one program instead of following the chapter under
   *  the reader. The range case study has no chapters — the machine on that
   *  page is the only subject, and its console is always running. */
  program?: ProgramId;
}) {
  const m = benchMaterials();
  const W = 0.32;
  const D = 0.222;
  const LID_A = -1.86; // open angle

  const code = useMemo(() => codeScreenTexture(), []);
  const screenTex = useMemo(() => {
    // an independent view of the same source, offset so the two screens are
    // not showing identical lines
    const t = code.clone();
    t.needsUpdate = true;
    t.offset.set(0, 0.37);
    return t;
  }, [code]);
  const screenMat = useMemo(() => screenMaterial(screenTex, '#d7e8ff'), [screenTex]);
  useEffect(() => () => screenTex.dispose(), [screenTex]);

  const [program, setProgram] = useState<ScreenProgram | null>(null);
  const programTex = useScreenProgram(program, 1024, 680);
  const lastSurface = useRef<string | null>(null);

  useFrame((state, delta) => {
    screenTex.offset.y = (0.37 - state.clock.elapsedTime * 0.008) % 1;

    const wanted = forced ? PROGRAMS[forced] : activeProgramFor('laptop');
    if (wanted?.id !== program?.id) setProgram(wanted);

    const key = wanted ? `p:${wanted.id}` : 'code';
    if (key !== lastSurface.current) {
      lastSurface.current = key;
      const surface = wanted ? programTex : screenTex;
      screenMat.map = surface;
      screenMat.emissiveMap = surface;
      screenMat.needsUpdate = true;
    }

    /* The editor dims while the reader is deep in a hardware chapter so the
       device on the mat stays the brightest thing in frame — but a chapter
       staged ON this screen has to do the opposite and come up. */
    const target = wanted
      ? 1.05 + sceneState.power * (forced ? 0.1 : 0.25)
      : 0.95 - sceneState.power * 0.3;
    screenMat.emissiveIntensity = THREE.MathUtils.damp(
      screenMat.emissiveIntensity,
      target,
      2,
      Math.min(delta, 1 / 30),
    );
  });

  return (
    <group position={position} rotation={rotation as unknown as THREE.Euler}>
      {/* base */}
      <mesh position={[0, 0.006, 0]} castShadow receiveShadow material={m.aluminium}>
        <boxGeometry args={[W, 0.012, D]} />
      </mesh>
      {/* keyboard well */}
      <mesh position={[0, 0.0125, 0.012]} material={m.polymer}>
        <boxGeometry args={[W * 0.86, 0.001, D * 0.56]} />
      </mesh>
      {/* key field: one dark slab with a grid of separations reads correctly
          at bench distance and costs one mesh instead of eighty */}
      <mesh position={[0, 0.0132, 0.012]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 0.84, D * 0.54]} />
        <meshStandardMaterial color="#0a0b0d" roughness={0.85} />
      </mesh>
      {/* trackpad */}
      <mesh position={[0, 0.0128, D * 0.36]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.085, 0.055]} />
        <meshStandardMaterial color="#16181c" roughness={0.42} metalness={0.3} />
      </mesh>

      {/* lid, hinged at the back edge */}
      <group position={[0, 0.012, -D / 2]} rotation={[LID_A, 0, 0]}>
        <mesh position={[0, 0.005, D / 2]} castShadow material={m.aluminium}>
          <boxGeometry args={[W, 0.008, D * 0.96]} />
        </mesh>
        {/* The panel is on the lid's inner face. In lid-local space that is
            -y: once the lid swings up and back, -y is what faces the person
            sitting at the bench. Putting it on +y shows them the aluminium. */}
        <mesh position={[0, 0.0006, D / 2]} rotation={[Math.PI / 2, 0, 0]} material={screenMat}>
          <planeGeometry args={[W * 0.92, D * 0.88]} />
        </mesh>
      </group>
    </group>
  );
}
