/* ============================================================================
   BenchCanvas — renderer, lighting, camera rig
   ----------------------------------------------------------------------------
   The room is dark and lit by exactly the things you can see lighting it: the
   batten over the bench, the two monitors, and the instrument panels. Nothing
   is lit by an invisible key, which is most of why the scene reads as a room
   rather than as a product shot.

   The render loop is parked whenever no part of the scene is exposed through
   the page. The canvas is `position: fixed`, so observing the canvas itself
   would always report "visible" and the bench would render for the entire
   height of the document with opaque content sitting on top of it. Instead we
   observe the elements the scene is meant to show through, tagged in the DOM
   with `data-scene-window`.
   ========================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows, AdaptiveDpr } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  ToneMapping,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { Workbench } from './Workbench';
import { sceneState } from '../sceneState';
import { sampleStation, inspectPose } from './cameraPath';
import { sampleShot, runnerX, FIRING_X, BACKSTOP_X } from './range/rangePath';
import { BENCH } from './props/Furniture';
import { isRoomChapter } from './devices/registry';
import { disposeMaterials } from './materials';
import { disposeTextures } from './textures';
import type { DeviceProfile } from '../../lib/quality';
import { DEVICES } from './devices/registry';

export type StageMode = 'bench' | 'inspect' | 'range';

/* --- camera -------------------------------------------------------------- */

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/* The aspect the camera distances in the device registry were framed against.
   Three's `fov` is vertical, so a portrait viewport shows dramatically less
   horizontally at the same standoff — on a phone the tracker went from filling
   a third of the frame to overflowing it. Below this ratio the camera is
   pulled back to keep the same object width on screen. */
const REFERENCE_ASPECT = 1.35;
const MAX_PULLBACK = 2.4;
/** Metres of extra standoff the range set will accept on a portrait viewport.
 *  A ratio is the right rule for an object on a bench and the wrong one for a
 *  room: 2.4× on a 13m lane shot walks the camera out through the back wall,
 *  and the subject of every shot here — a standing target, an open case — is
 *  taller than it is wide, so a portrait crop costs it very little. */
const RANGE_PULLBACK_M = 1.8;

function CameraRig({ mode }: { mode: StageMode }) {
  const target = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const smoothLook = useRef(new THREE.Vector3(0, 0.06, 0));
  const bias = useRef(0);
  const biasY = useRef(0);

  useFrame(({ camera, size }, delta) => {
    const d = Math.min(delta, 1 / 30);

    if (mode === 'inspect') {
      inspectPose(sceneState.explode, target.current, look.current);
    } else if (mode === 'range') {
      sampleShot(sceneState.rangeShot, sceneState.runnerAt, target.current, look.current);
    } else {
      sampleStation(sceneState.station, target.current, look.current);
    }

    // portrait pull-back, applied along the view vector so the framing angle
    // is untouched — only the standoff changes
    const aspect = size.width / Math.max(1, size.height);
    if (aspect < REFERENCE_ASPECT) {
      const ratio = Math.min(MAX_PULLBACK, REFERENCE_ASPECT / Math.max(0.35, aspect));
      forward.copy(target.current).sub(look.current);
      const standoff = forward.length();
      /* The metres-not-multiplier rule has to cover the room-staged chapters
         on the bench too, not just the case study's range set. Those are shot
         from 3.7m and 5.2m, and 2.4x on that walks the camera back through the
         bench and out of the building — which is exactly why the shooting
         range and the wheelchair chapters showed an empty frame on a phone
         while every bench-top chapter was fine. */
      const roomShot =
        mode === 'range' ||
        (mode === 'bench' && DEVICES[sceneState.activeProject]?.stageKind === 'room');
      const scale = roomShot
        ? Math.min(ratio, (standoff + RANGE_PULLBACK_M) / Math.max(0.01, standoff))
        : ratio;
      forward.multiplyScalar(scale);
      target.current.copy(look.current).add(forward);
    }

    /* Lateral frame shift. Translating BOTH the camera and its look-at along
       the view's right vector slides the whole frame sideways without turning
       the camera, which moves the subject to the opposite side of the
       viewport — the object ends up inside the chapter's visual column rather
       than behind its text. Damped, so the swap between an odd and an even
       chapter reads as the camera tracking across rather than cutting. */
    /* On a case study the device shares the viewport with the title block,
       so the inspection frame is biased toward the right rather than centred. */
    /* The range set is a full-bleed sequence, but its captions sit in the
       lower left of every shot, so the subject is nudged off that corner —
       a smaller shift than the inspection stage's, because several of these
       shots are looking straight down a lane and want to stay centred. */
    const wantBias =
      window.innerWidth < 900
        ? mode === 'bench'
          ? sceneState.frameBias
          : 0
        : mode === 'inspect'
          ? 0.5
          : mode === 'range'
            ? 0.26
            : sceneState.frameBias;
    bias.current = THREE.MathUtils.damp(bias.current, wantBias, 2.2, d);
    biasY.current = THREE.MathUtils.damp(
      biasY.current,
      mode === 'bench' ? sceneState.frameBiasY : 0,
      2.2,
      d,
    );

    if (Math.abs(bias.current) > 0.001 || Math.abs(biasY.current) > 0.001) {
      forward.copy(look.current).sub(target.current);
      const distance = forward.length();
      forward.normalize();
      right.crossVectors(forward, UP).normalize();
      up.crossVectors(right, forward).normalize();

      // a quarter of the visible width, which lands the subject near the
      // centre of a half-width column at this field of view
      const shiftX = -bias.current * distance * 0.26;
      /* Vertically: enough to clear the copy and sit inside the visual frame
         below it, but not so much that the device lands on the fold. 0.15 of
         the standoff puts the subject around three-quarters down the
         viewport at this field of view. */
      const shiftY = biasY.current * distance * 0.15;

      target.current.addScaledVector(right, shiftX).addScaledVector(up, shiftY);
      look.current.addScaledVector(right, shiftX).addScaledVector(up, shiftY);
    }

    /* Pointer parallax. Scaled down as the camera pushes into a chapter: at
       the wide hero shot a little drift is atmosphere, but the same angular
       offset 400mm from a circuit board is a lurch. */
    const closeness =
      mode === 'inspect'
        ? 0.35
        : mode === 'range'
          ? 0.22
          : 1 - THREE.MathUtils.clamp(Math.min(sceneState.station, 1), 0, 1) * 0.55;
    target.current.x += sceneState.pointerX * 0.05 * closeness;
    target.current.y += sceneState.pointerY * 0.03 * closeness;

    if (sceneState.snap) {
      camera.position.copy(target.current);
      smoothLook.current.copy(look.current);
    } else {
      /* A tracking shot has to be tighter on its mark than a room dolly does,
         or the carriage slides around inside the frame every time the reader
         changes scroll speed. */
      const rate = mode === 'range' ? 4.2 : 2.6;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, target.current.x, rate, d);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, target.current.y, rate, d);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, target.current.z, rate, d);
      smoothLook.current.x = THREE.MathUtils.damp(smoothLook.current.x, look.current.x, rate, d);
      smoothLook.current.y = THREE.MathUtils.damp(smoothLook.current.y, look.current.y, rate, d);
      smoothLook.current.z = THREE.MathUtils.damp(smoothLook.current.z, look.current.z, rate, d);
    }
    camera.lookAt(smoothLook.current);
  });

  return null;
}

/** Clears the one-shot snap flag once every rig has read it. Rendered last so
 *  its useFrame runs last. */
function SnapReset() {
  useFrame(() => {
    if (sceneState.snap) sceneState.snap = false;
  });
  return null;
}

/* --- lighting ------------------------------------------------------------ */

function BenchLighting({ quality, mode }: { quality: 'high' | 'medium' | 'low'; mode: StageMode }) {
  const key = useRef<THREE.SpotLight>(null);

  useFrame((_, delta) => {
    if (!key.current || mode !== 'bench') return;
    // the bench light lifts slightly as a device powers up, so the moment a
    // chapter arrives is carried by the lighting and not only by the LEDs
    // ...and drops away when the reader turns to face the room, so the two
    // spaces are never both lit at once
    const away = isRoomChapter(sceneState.activeProject) ? 1 : 0;
    key.current.intensity = THREE.MathUtils.damp(
      key.current.intensity,
      (15.5 + sceneState.power * 6) * (1 - away * 0.82),
      2,
      Math.min(delta, 1 / 30),
    );
  });

  /* Inspect mode gets its own rig rather than a brighter bench.

     The bench light hangs 720mm above the benchtop and is tuned for objects
     sitting on it. The inspected device is scaled up more than three times and
     floats much nearer that same point, so under inverse-square falloff the
     bench rig arrives several stops hot: every upward-facing surface — the
     printed label, the case lid — clips to white before bloom even sees it.
     What the case study wants is a studio three-point: a soft key off to one
     side, a cool fill opposite it, and a rim from behind so a black enclosure
     still holds an edge against the background. */
  if (mode === 'range') return <RangeLighting quality={quality} />;

  if (mode === 'inspect') {
    return (
      <>
        <color attach="background" args={['#05070a']} />
        <fog attach="fog" args={['#05070a', 1.8, 6]} />
        <ambientLight intensity={0.34} color="#93a8bd" />
        {/* Intensities look large next to the bench rig's, and have to be:
            with decay={2} irradiance falls as 1/d², and these lights stand
            roughly twice as far from their subject as the batten does from
            the benchtop. The bench key is 9 at ~0.72m — about 17 at the
            surface — and these are set to land in the same place. */}
        <spotLight
          position={[0.50, 0.90, 0.75]}
          angle={0.95}
          penumbra={1}
          distance={6}
          decay={2}
          intensity={26}
          color="#e6f2ff"
          castShadow={quality === 'high'}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0005}
          shadow-camera-near={0.1}
          shadow-camera-far={5}
        />
        <pointLight position={[-0.95, 0.40, 0.65]} intensity={3.2} distance={4} decay={2} color="#7fb8ff" />
        {/* rim from behind, so a black enclosure still holds an edge */}
        <pointLight position={[-0.35, 0.55, -1.15]} intensity={3.6} distance={4} decay={2} color="#9fe6ff" />
        <Environment resolution={quality === 'high' ? 128 : 64} frames={1}>
          <Lightformer form="rect" intensity={1.3} position={[0, 2, 0.6]} scale={[2.4, 1.2, 1]} color="#e8f4ff" />
          <Lightformer
            form="rect"
            intensity={0.7}
            position={[1.6, 0.5, 0.9]}
            scale={[1.4, 1.6, 1]}
            rotation={[0, -Math.PI / 4, 0]}
            color="#9fd8ff"
          />
        </Environment>
      </>
    );
  }

  return (
    <>
      <color attach="background" args={['#05070a']} />
      <fog attach="fog" args={['#05070a', 2.6, 9]} />
      <ambientLight intensity={0.16} color="#9fb4c8" />

      {/* the batten over the bench — a wide, soft, slightly cool pool */}
      <spotLight
        ref={key}
        position={[-0.32, 0.95, -0.16]}
        angle={1.05}
        penumbra={1}
        distance={4.5}
        decay={2}
        intensity={15.5}
        color="#dceeff"
        castShadow={quality === 'high'}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-camera-near={0.1}
        shadow-camera-far={3}
      />

      {/* spill from the two monitors */}
      <pointLight position={[0.46, 0.28, -0.24]} intensity={0.55} distance={1.6} decay={2} color="#8fc4ff" />
      {/* spill from the instrument panel at the other end */}
      <pointLight position={[-0.95, 0.16, -0.14]} intensity={0.35} distance={1.2} decay={2} color="#4fe8c8" />
      {/* a low warm bounce off the benchtop, so the underside of parts is not black */}
      <pointLight position={[0.1, 0.06, 0.5]} intensity={0.22} distance={1.8} decay={2} color="#ffc98a" />

      {/* Baked once — this is what the metals and the solder mask reflect.
          Never re-rendered, so it costs nothing per frame. */}
      <Environment resolution={quality === 'high' ? 128 : 64} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 2.2, 0.4]} scale={[3, 1.2, 1]} color="#e8f4ff" />
        <Lightformer
          form="rect"
          intensity={0.9}
          position={[1.6, 0.6, 1.2]}
          scale={[1.6, 2, 1]}
          rotation={[0, -Math.PI / 4, 0]}
          color="#9fd8ff"
        />
        <Lightformer
          form="rect"
          intensity={0.6}
          position={[-1.8, 0.5, 0.8]}
          scale={[1.4, 2, 1]}
          rotation={[0, Math.PI / 4, 0]}
          color="#ffcf9a"
        />
      </Environment>
    </>
  );
}

/** The range lane. Lit the way an indoor range is: a long run of overhead
 *  fixtures doing almost all of the work, plus one shadow-casting key that
 *  travels with the carriage — which is the only light that has to be
 *  expensive, because it is the only one anybody looks along. */
function RangeLighting({ quality }: { quality: 'high' | 'medium' | 'low' }) {
  const key = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const x = runnerX(sceneState.runnerAt);
    target.position.set(x, 0.3, 0);
    target.updateMatrixWorld();
    /* The key leads the carriage from the firing-point side rather than
       trailing it. A target lit only from above and behind is a silhouette,
       and the face of the thing is what the reader is following. */
    if (key.current) key.current.position.set(x - 1.15, 2.75, 0.85);
  });

  return (
    <>
      <color attach="background" args={['#05070a']} />
      {/* The far end of the lane goes into haze rather than into a hard edge.
          Set well out: a portrait viewport pulls this camera back to ~20m on
          the wide shot, and fog tuned for the landscape standoff swallowed the
          entire set on a phone. */}
      <fog attach="fog" args={['#070a0e', 11, 46]} />
      <ambientLight intensity={0.30} color="#9db2c6" />

      {/* The overhead run, as three pools rather than one per fixture. These
          are large numbers because they are 2.7m up with decay={2}: the floor
          under each one lands at roughly intensity/7. */}
      {[FIRING_X + 1.2, 0.6, BACKSTOP_X - 2.2].map((x, i) => (
        <pointLight
          key={x}
          position={[x, 2.72, 0]}
          intensity={i === 1 ? 62 : 52}
          distance={14}
          decay={2}
          color="#dbeaff"
        />
      ))}
      {/* the console's own glow at the firing point */}
      <pointLight position={[FIRING_X - 0.3, 1.25, -1.1]} intensity={3.2} distance={3.5} decay={2} color="#8fc4ff" />

      {/* the travelling key */}
      <primitive object={target} />
      <spotLight
        ref={key}
        target={target}
        angle={0.62}
        penumbra={1}
        distance={7}
        decay={2}
        intensity={56}
        color="#e6f2ff"
        castShadow={quality === 'high'}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-camera-near={0.4}
        shadow-camera-far={7}
      />

      <Environment resolution={quality === 'high' ? 128 : 64} frames={1}>
        <Lightformer form="rect" intensity={1.1} position={[0, 3, 0]} scale={[8, 1.2, 1]} rotation={[Math.PI / 2, 0, 0]} color="#dceaff" />
        <Lightformer form="rect" intensity={0.5} position={[-6, 1.2, 2]} scale={[2, 2, 1]} color="#9fd8ff" />
      </Environment>
    </>
  );
}

/* --- canvas -------------------------------------------------------------- */

export function BenchCanvas({
  profile,
  mode = 'bench',
  slug,
}: {
  profile: DeviceProfile;
  mode?: StageMode;
  slug?: string;
}) {
  const [visible, setVisible] = useState(true);
  const q = profile.tier;
  const detail = q === 'high' ? 'high' : 'low';

  const caOffset = useMemo(() => new THREE.Vector2(0.00042, 0.00038), []);

  // free the shared canvas textures and materials when the scene leaves
  useEffect(
    () => () => {
      disposeMaterials();
      disposeTextures();
    },
    [],
  );

  useEffect(() => {
    const windows = document.querySelectorAll(
      '[data-scene-window], [data-monolith-window]',
    );
    if (!windows.length) return; // nothing tagged — stay conservative

    const onScreen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) onScreen.add(e.target);
          else onScreen.delete(e.target);
        }
        setVisible((was) => {
          const now = onScreen.size > 0;
          // resuming: let the rigs jump to their scroll-correct pose
          if (now && !was) sceneState.snap = true;
          return now;
        });
      },
      { rootMargin: '25% 0px 25% 0px' },
    );
    windows.forEach((w) => io.observe(w));
    return () => io.disconnect();
  }, [mode, slug]);

  useEffect(() => {
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
    const onMove = (e: PointerEvent) => {
      sceneState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      sceneState.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}
    >
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={profile.dpr}
        shadows={q === 'high'}
        gl={{ antialias: profile.antialias, alpha: false, powerPreference: 'high-performance' }}
        /* far has to clear the range lane: ~13m of standoff at the wide shot,
           plus the portrait pull-back, plus the depth of the set behind it. */
        camera={{ position: [0.92, 0.46, 1.62], fov: 32, near: 0.02, far: 48 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <BenchLighting quality={q} mode={mode} />
        <Workbench mode={mode} slug={slug} detail={detail} />

        {/* The range set stands on a real floor with a real key over it, so
            the cheap ground-contact pass is only used by the other two. */}
        {mode !== 'range' && (
          <ContactShadows
            position={[0, mode === 'inspect' ? -0.155 : BENCH.topY + 0.002, 0]}
            opacity={mode === 'inspect' ? 0.5 : 0.4}
            scale={mode === 'inspect' ? 2.4 : 3}
            blur={2.4}
            far={0.6}
            resolution={q === 'high' ? 512 : 256}
            color="#000000"
          />
        )}

        <CameraRig mode={mode} />
        <SnapReset />
        <AdaptiveDpr pixelated />

        {profile.postprocessing && (
          <EffectComposer multisampling={2}>
            {/* the threshold sits just above the screens so the LEDs and the
                scope trace bloom while the lit panels stay crisp */}
            <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.95} luminanceSmoothing={0.2} />
            <ChromaticAberration offset={caOffset} radialModulation modulationOffset={0.4} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <Vignette eskil={false} offset={0.26} darkness={0.6} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
