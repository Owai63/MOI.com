/* ============================================================================
   Computers — the laptop and the two bench monitors
   ----------------------------------------------------------------------------
   These are the two things the camera gets closest to, and the two things that
   were built the most cheaply. The laptop was six boxes and two planes; the
   monitors were a box, a plane and a stick. That was a reasonable trade while
   every chapter was framed on a cutting mat a metre away. It stopped being one
   when three chapters started staging themselves ON the laptop screen, with
   the camera sitting down at it.

   What was added, and why each thing earns its cost:

   * a real key field (see ../parts/Keyboard.tsx) — the single largest
     improvement available, because a keyboard is the shape everybody has
     memorised
   * a separate GLASS layer over every panel. The old screens were a single
     emissive plane, which is a decal: the image on it never changed as the
     camera moved. Glass is lit and reflective where the panel under it is
     emissive and unlit, and that split is most of what makes a screen read as
     a screen
   * a glow plane in front of each panel, because post-processing bloom can
     only spread light that is already on screen and never puts any between the
     panel and the camera
   * chamfered shells, real bezels, hinges, ports, feet and cables — the
     details you do not notice individually and cannot fake the absence of

   The monitors also carry the real reference photographs of the hardware (see
   scripts/prepare-photos.mjs). That is deliberate: the bench shows the actual
   device next to the actual photograph of it, which is a stronger claim than
   either alone, and it is the honest use of those images — a photo pinned up
   on the bench, not a rendering pretending to be one. Photographs are
   optional; if the prepared files are absent the screens fall back to the
   generated console art, so a fresh clone still renders correctly before
   `npm run photos` has been run.

   Both machines also run the *chapter programs* (see ../screens/programs.ts).
   ========================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { benchMaterials, screenMaterial, glassMaterial, screenGlowMaterial } from '../materials';
import { codeScreenTexture, dashboardTexture } from '../textures';
import { asset } from '../../../lib/asset';
import { sceneState } from '../../sceneState';
import { DEVICES } from '../devices/registry';
import { PROGRAMS, type ProgramId, type ScreenProgram } from '../screens/programs';
import { useScreenProgram } from '../screens/useScreenProgram';
import { Keyboard } from '../parts/Keyboard';
import { LAPTOP, MONITORS } from '../layout';

type Detail = 'high' | 'low';

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
        t.anisotropy = 8;
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

/* --- shared panel furniture ---------------------------------------------- */

/**
 * The three layers that make a lit panel: the image, the glass over it, and
 * the glow it throws forward.
 *
 * `forward` is the panel's own +z. Everything is offset along it by fractions
 * of a millimetre — small enough to be one surface, large enough that no depth
 * buffer has to guess.
 */
function PanelSurface({
  width,
  height,
  material,
  tint,
  detail,
  glow = 0.4,
}: {
  width: number;
  height: number;
  material: THREE.Material;
  tint: string;
  detail: Detail;
  glow?: number;
}) {
  const glass = useMemo(
    () => (detail === 'high' ? glassMaterial({ roughness: 0.3, opacity: 0.05, env: 0.75 }) : null),
    [detail],
  );
  const halo = useMemo(
    () => (detail === 'high' ? screenGlowMaterial(tint, glow) : null),
    [detail, tint, glow],
  );

  return (
    <group>
      <mesh material={material}>
        <planeGeometry args={[width, height]} />
      </mesh>
      {glass && (
        <mesh position={[0, 0, 0.0004]} material={glass}>
          <planeGeometry args={[width, height]} />
        </mesh>
      )}
      {halo && (
        /* Well clear of the glass, and much larger than the panel: this is the
           light in the air in front of the screen, so it has to spill past the
           bezel or it just looks like a brighter screen. */
        <mesh position={[0, 0, 0.012]} material={halo}>
          <planeGeometry args={[width * 2.1, height * 2.4]} />
        </mesh>
      )}
    </group>
  );
}

/** A rectangular bezel drawn as four bars rather than one slab with a hole.
 *  A slab has to be *behind* the panel, which puts a visible step around the
 *  screen; four bars sit level with it, which is what a modern bezel is. */
function Bezel({
  width,
  height,
  frame,
  chin,
  thickness,
  material,
}: {
  width: number;
  height: number;
  /** bezel width on the top and sides. */
  frame: number;
  /** bezel width along the bottom, which is always deeper. */
  chin: number;
  thickness: number;
  material: THREE.Material;
}) {
  const outerW = width + frame * 2;
  const outerH = height + frame + chin;
  // the frame is centred on the panel, so the extra chin shifts it down
  const shift = (frame - chin) / 2;
  return (
    <group position={[0, shift, 0]}>
      <mesh position={[0, height / 2 - shift + frame / 2, 0]} material={material}>
        <boxGeometry args={[outerW, frame, thickness]} />
      </mesh>
      <mesh position={[0, -height / 2 - shift - chin / 2, 0]} material={material}>
        <boxGeometry args={[outerW, chin, thickness]} />
      </mesh>
      {/* The side bars run the full outer height, so they are centred on the
          frame — which the group already sits at. Offsetting them by `shift`
          as well would push them down by the chin twice over and leave a notch
          at each top corner. */}
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[(s * (width + frame)) / 2, 0, 0]} material={material}>
          <boxGeometry args={[frame, outerH, thickness]} />
        </mesh>
      ))}
    </group>
  );
}

/** A cable, as a tube along a curve. One mesh, and the single cheapest thing
 *  that stops a piece of equipment looking like it was rendered rather than
 *  plugged in. */
function Cable({
  points,
  radius = 0.0035,
  material,
}: {
  points: [number, number, number][];
  radius?: number;
  material: THREE.Material;
}) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    return new THREE.TubeGeometry(curve, Math.max(8, points.length * 6), radius, 6, false);
  }, [points, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} castShadow />;
}

/* --- monitors ------------------------------------------------------------ */

/** Per-chapter reference photograph shown on the right-hand monitor. */
const REFERENCE_PHOTO: Record<string, string> = {
  mymo2: '/assets/photos/tracker-unit.webp',
  'shooting-range': '/assets/photos/range-open.webp',
};

const PANEL_W = MONITORS.panelW;
const PANEL_H = MONITORS.panelH;
/** Height of the panel's bottom edge above the benchtop. */
const PANEL_BASE = 0.13;

export function Monitors({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  detail = 'high',
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  detail?: Detail;
}) {
  const m = benchMaterials();

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
    const want = 1.15 - focus * 0.35;
    codeMat.emissiveIntensity = THREE.MathUtils.damp(codeMat.emissiveIntensity, want, 2, d);
    rightMat.emissiveIntensity = THREE.MathUtils.damp(rightMat.emissiveIntensity, want + 0.1, 2, d);
  });

  const panel = (x: number, yaw: number, mat: THREE.Material, tint: string) => (
    <group position={[x, 0, 0]} rotation={[0, yaw, 0]}>
      {/* --- the head ---------------------------------------------------- */}
      <group position={[0, PANEL_H / 2 + PANEL_BASE, 0]}>
        {/* Rear shell. Chamfered, and only 11mm at the rim — the thickness of
            a monitor lives in the hump behind the middle of it, not at the
            edge, and getting that wrong is what made the old ones read as
            cardboard. */}
        <RoundedBox
          args={[PANEL_W + 0.014, PANEL_H + 0.02, 0.011]}
          radius={0.0035}
          smoothness={3}
          position={[0, 0, -0.0055]}
          castShadow
          receiveShadow
          material={m.polymer}
        />
        {/* the electronics hump, low and central */}
        <RoundedBox
          args={[0.2, 0.13, 0.03]}
          radius={0.006}
          smoothness={3}
          position={[0, -0.03, -0.024]}
          castShadow
          material={m.chassis}
        />
        {/* ventilation across the top of the rear shell */}
        {detail === 'high' &&
          Array.from({ length: 9 }).map((_, i) => (
            <mesh key={i} position={[-0.16 + i * 0.04, PANEL_H / 2 - 0.016, -0.0112]}>
              <boxGeometry args={[0.026, 0.0035, 0.001]} />
              <meshStandardMaterial color="#06070a" roughness={0.95} />
            </mesh>
          ))}

        {/* bezel, then the three panel layers inside it */}
        <Bezel
          width={PANEL_W}
          height={PANEL_H}
          frame={0.005}
          chin={0.016}
          thickness={0.012}
          material={m.polymer}
        />
        <group position={[0, 0, 0.0062]}>
          <PanelSurface
            width={PANEL_W}
            height={PANEL_H}
            material={mat}
            tint={tint}
            detail={detail}
            glow={0.34}
          />
        </group>

        {/* power indicator on the chin, and the OSD rocker beside it */}
        <mesh position={[PANEL_W / 2 - 0.02, -PANEL_H / 2 - 0.009, 0.0068]}>
          <sphereGeometry args={[0.0016, 8, 6]} />
          <meshStandardMaterial
            color="#0a0a0a"
            emissive={new THREE.Color('#6fe0a0')}
            emissiveIntensity={2.6}
            toneMapped={false}
          />
        </mesh>
        {detail === 'high' && (
          <mesh position={[PANEL_W / 2 - 0.06, -PANEL_H / 2 - 0.009, 0.0066]} material={m.chassis}>
            <boxGeometry args={[0.022, 0.005, 0.003]} />
          </mesh>
        )}
      </group>

      {/* --- the stand ---------------------------------------------------- */}
      {/* A neck that leans back from the foot to the hump, rather than a
          vertical stick. The lean is what puts the head's weight over the
          base, and reading that as plausible is half of why a stand looks
          like a stand. */}
      <mesh position={[0, 0.082, -0.022]} rotation={[0.16, 0, 0]} castShadow material={m.aluminium}>
        <boxGeometry args={[0.05, 0.16, 0.016]} />
      </mesh>
      {/* the pivot where the neck meets the head */}
      <mesh position={[0, 0.152, -0.03]} rotation={[0, 0, Math.PI / 2]} material={m.chassis}>
        <cylinderGeometry args={[0.014, 0.014, 0.052, 14]} />
      </mesh>
      {/* Weighted foot: an oval slab, not a rectangle. */}
      <mesh position={[0, 0.007, -0.005]} scale={[1, 1, 1.15]} castShadow receiveShadow material={m.aluminium}>
        <cylinderGeometry args={[0.1, 0.105, 0.014, 28]} />
      </mesh>
      {detail === 'high' && (
        <mesh position={[0, 0.0005, -0.005]} scale={[1, 1, 1.15]}>
          <cylinderGeometry args={[0.098, 0.098, 0.002, 24]} />
          <meshStandardMaterial color="#0a0b0d" roughness={0.95} />
        </mesh>
      )}

      {/* --- the cable ------------------------------------------------------ */}
      {detail === 'high' && (
        <Cable
          material={m.rubber}
          points={[
            [0.02, PANEL_H / 2 + PANEL_BASE - 0.09, -0.038],
            [0.03, 0.11, -0.07],
            [0.02, 0.03, -0.1],
            [-0.03, 0.004, -0.14],
            [-0.14, 0.004, -0.16],
          ]}
        />
      )}
    </group>
  );

  return (
    <group position={position} rotation={rotation as unknown as THREE.Euler}>
      {panel(MONITORS.left.x, MONITORS.left.yaw, codeMat, '#7fb0ff')}
      {panel(MONITORS.right.x, MONITORS.right.yaw, rightMat, '#8fc4ff')}
    </group>
  );
}

/* --- laptop -------------------------------------------------------------- */

const W = LAPTOP.width;
const D = LAPTOP.depth;
const LID_A = LAPTOP.lidAngle;
/** Deck thickness. The lid hinges at y = 0.012 in layout.ts, which is what
 *  laptopScreenPose and therefore the camera reads, so the deck has to come
 *  out at that height however it is built. */
const DECK_T = 0.012;
/** Display, as a fraction of the lid. */
const SCREEN_W = W * 0.945;
const SCREEN_H = D * 0.9;

export function Laptop({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  program: forced,
  detail = 'high',
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Pin the screen to one program instead of following the chapter under
   *  the reader. The range case study has no chapters — the machine on that
   *  page is the only subject, and its console is always running. */
  program?: ProgramId;
  detail?: Detail;
}) {
  const m = benchMaterials();

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
  const programTex = useScreenProgram(program, 1024, 678);
  const lastSurface = useRef<string | null>(null);
  const backlight = useRef(0.5);

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
    /* Up from 1.05. The room came up by more than a stop in this pass and the
       screen did not, which is most of why it started reading as dim: a panel
       is only bright relative to what is around it, and everything around this
       one got brighter. */
    const target = wanted
      ? 1.55 + sceneState.power * (forced ? 0.1 : 0.3)
      : 1.15 - sceneState.power * 0.35;
    screenMat.emissiveIntensity = THREE.MathUtils.damp(
      screenMat.emissiveIntensity,
      target,
      2,
      Math.min(delta, 1 / 30),
    );
    /* The keyboard backlight follows the screen: a machine whose display has
       come up for a chapter has its keys lit too, and one that has dimmed
       between chapters does not. Written to a ref rather than passed as a
       prop, so it can change without re-rendering the laptop. */
    backlight.current = 0.34 + screenMat.emissiveIntensity * 0.34;
  });

  return (
    <group position={position} rotation={rotation as unknown as THREE.Euler}>
      {/* --- the deck ------------------------------------------------------ */}
      {/* Unibody, chamfered all round. The radius is 3mm on a 12mm slab, which
          is what turns the edge from a drawn line into a highlight. */}
      <RoundedBox
        args={[W, DECK_T, D]}
        radius={0.003}
        smoothness={3}
        position={[0, DECK_T / 2, 0]}
        castShadow
        receiveShadow
        material={m.aluminium}
      />
      {/* feet */}
      {([-1, 1] as const).map((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * (W / 2 - 0.03), 0.0008, sz * (D / 2 - 0.026)]}
            material={m.rubber}
          >
            <cylinderGeometry args={[0.006, 0.0065, 0.0018, 10]} />
          </mesh>
        )),
      )}

      {/* The key field, recessed into the deck and laid out the way a 14-inch
          machine really is: 105mm of keyboard against the hinge, then a
          100mm palm rest with the trackpad centred in it. */}
      <group position={[0, DECK_T + 0.0004, -0.0435]}>
        <Keyboard width={W * 0.845} depth={0.105} level={backlight} />
      </group>

      {/* Trackpad: glass in a milled recess. Two planes a third of a
          millimetre apart, the lower one very slightly larger — which is all a
          machined seam is, and it reads at 600mm where a modelled groove would
          just be four more triangles of shadow. */}
      <group position={[0, DECK_T, 0.058]}>
        <mesh position={[0, 0.00008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.106, 0.072]} />
          <meshStandardMaterial color="#050608" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.0004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.104, 0.07]} />
          <meshStandardMaterial color="#1b1e23" roughness={0.24} metalness={0.44} />
        </mesh>
      </group>

      {/* speaker grilles either side of the keyboard */}
      {detail === 'high' &&
        ([-1, 1] as const).map((s) => (
          <mesh
            key={s}
            position={[s * 0.1485, DECK_T + 0.0002, -0.0435]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.018, 0.105]} />
            <meshStandardMaterial color="#0d0f12" roughness={0.85} metalness={0.2} />
          </mesh>
        ))}

      {/* ports along both edges */}
      {detail === 'high' && (
        <>
          {[-0.05, -0.005, 0.04].map((z) => (
            <mesh key={`l${z}`} position={[-W / 2 - 0.0005, DECK_T * 0.55, z]}>
              <boxGeometry args={[0.002, 0.005, 0.0125]} />
              <meshStandardMaterial color="#050607" roughness={0.9} />
            </mesh>
          ))}
          {[-0.045, 0.005].map((z) => (
            <mesh key={`r${z}`} position={[W / 2 + 0.0005, DECK_T * 0.55, z]}>
              <boxGeometry args={[0.002, 0.005, 0.0125]} />
              <meshStandardMaterial color="#050607" roughness={0.9} />
            </mesh>
          ))}
        </>
      )}

      {/* --- the hinge ------------------------------------------------------ */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={s}
          position={[s * (W / 2 - 0.055), DECK_T, -D / 2 + 0.004]}
          rotation={[0, 0, Math.PI / 2]}
          material={m.chassis}
        >
          <cylinderGeometry args={[0.0042, 0.0042, 0.05, 12]} />
        </mesh>
      ))}

      {/* --- the lid --------------------------------------------------------
          Hinged at the back edge of the deck. This transform chain is mirrored
          exactly in layout.ts, which is where the camera reads the panel's pose
          from — change one and the camera stops looking at the screen. */}
      <group position={[0, DECK_T, -D / 2]} rotation={[LID_A, 0, 0]}>
        {/* the aluminium shell */}
        <RoundedBox
          args={[W, 0.0062, D * 0.97]}
          radius={0.0025}
          smoothness={3}
          position={[0, 0.0035, D / 2]}
          castShadow
          receiveShadow
          material={m.aluminium}
        />

        {/* The panel is on the lid's INNER face. In lid-local space that is
            -y: once the lid swings up and back, -y is what faces the person
            sitting at the bench. Putting it on +y shows them the aluminium. */}
        <group position={[0, 0.0006, D / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <Bezel
            width={SCREEN_W}
            height={SCREEN_H}
            frame={0.0042}
            chin={0.0075}
            thickness={0.0022}
            material={m.polymer}
          />
          <group position={[0, 0, 0.0013]}>
            <mesh material={screenMat}>
              <planeGeometry args={[SCREEN_W, SCREEN_H]} />
            </mesh>
            {detail === 'high' && <LaptopGlass />}
          </group>
          {/* the camera in the top bezel */}
          <mesh position={[0, SCREEN_H / 2 + 0.002, 0.0014]}>
            <circleGeometry args={[0.0011, 10]} />
            <meshStandardMaterial color="#04050a" roughness={0.15} metalness={0.6} />
          </mesh>
        </group>
      </group>

      {/* --- the mains lead, trailing off the back of the bench ------------- */}
      {detail === 'high' && (
        <Cable
          material={m.rubber}
          radius={0.0028}
          points={[
            [-W / 2 - 0.002, DECK_T * 0.5, -0.005],
            [-W / 2 - 0.05, 0.004, -0.03],
            [-W / 2 - 0.11, 0.003, -0.09],
            [-W / 2 - 0.1, 0.003, -0.19],
            [-W / 2 - 0.02, 0.003, -0.27],
          ]}
        />
      )}
    </group>
  );
}

/** Split out so the glass material is only ever constructed on the high tier —
 *  a physical material with clearcoat compiles a noticeably larger shader, and
 *  the tier that skips it should not pay to build it either. */
function LaptopGlass() {
  /* The most matte glass in the scene, and deliberately so. This panel is the
     subject of three chapters and the camera sits 600mm from it: anything the
     coating throws back is competing directly with the thing the reader is
     being asked to read. A real matte laptop screen returns very little, and
     what it does return is a soft smear rather than an image. */
  const glass = useMemo(
    () => glassMaterial({ roughness: 0.42, opacity: 0.035, env: 0.4, coat: 0.4, coatRoughness: 0.34 }),
    [],
  );
  const halo = useMemo(() => screenGlowMaterial('#9ec8ff', 0.26), []);
  return (
    <>
      <mesh position={[0, 0, 0.0004]} material={glass}>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
      </mesh>
      <mesh position={[0, 0, 0.014]} material={halo}>
        <planeGeometry args={[SCREEN_W * 2.2, SCREEN_H * 2.5]} />
      </mesh>
    </>
  );
}
