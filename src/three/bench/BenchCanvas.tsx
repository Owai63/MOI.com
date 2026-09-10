/* ============================================================================
   BenchCanvas — renderer, lighting, camera rig
   ----------------------------------------------------------------------------
   The room is lit by the things you can see lighting it: the ceiling run over
   the floor, the batten over the bench, the two monitors, and the instrument
   panels. Nothing is lit by an invisible key, which is most of why the scene
   reads as a room rather than as a product shot.

   The light level was raised across this pass. The first version was a night
   lab, which flattered the hardware and hid the room — fine when the camera
   only ever looked at one metre of benchtop, wrong now that it walks around.
   A room the reader is being walked through has to be legible, so the ceiling
   fixtures are always on and the bench light is a key on top of them rather
   than the only source in the building.

   The render loop is parked whenever no part of the scene is exposed through
   the page. The canvas is `position: fixed`, so observing the canvas itself
   would always report "visible" and the bench would render for the entire
   height of the document with opaque content sitting on top of it. Instead we
   observe the elements the scene is meant to show through, tagged in the DOM
   with `data-scene-window`.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Environment,
  Lightformer,
  ContactShadows,
  PerformanceMonitor,
  type PerformanceMonitorApi,
} from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  ToneMapping,
  DepthOfField,
} from '@react-three/postprocessing';
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing';
import * as THREE from 'three';
import { sceneControls, inspectionValue, advanceInspection } from './interaction';
import type { ProjectSlug } from '../../data/content';
import { studios } from '../studio/catalog';
import { Workbench } from './Workbench';
import { sceneState } from '../sceneState';
import { sampleStation, inspectPose, makePose } from './cameraPath';
import { Spring3, Spring1, clampToRoom, portraitFraming, breathe } from './cameraRig';
import { sampleShot, runnerX, FIRING_X, BACKSTOP_X } from './range/rangePath';
import { SHELL, CEILING_FIXTURES } from './layout';
import { isRoomChapter, deviceIndex } from './devices/registry';
import { disposeMaterials } from './materials';
import { disposeTextures } from './textures';
import type { DeviceProfile } from '../../lib/quality';

export type StageMode = 'bench' | 'inspect' | 'range';

/* --- camera -------------------------------------------------------------- */

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const drift = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** The world point the rig is looking at, written every frame and handed to
 *  the depth-of-field pass as its autofocus target. A shared mutable vector
 *  rather than a prop: the value changes sixty times a second and the effect
 *  reads `.target` directly during its own update, so there is nothing for
 *  React to be involved in. */
const focusPoint = new THREE.Vector3(0, 0, 0);

/** Where the adaptive resolution opens, as a fraction of the profile's range.
 *  Shared by the initial state and by PerformanceMonitor's own starting factor,
 *  which are two different things that have to agree or the first frame undoes
 *  the second. */
const START_FACTOR = 0.35;

function CameraRig({ mode, slug }: { mode: StageMode; slug?: string }) {
  const additionalScene = Boolean(slug && deviceIndex(slug) < 0);
  const pose = useMemo(makePose, []);
  const posSpring = useMemo(() => new Spring3(), []);
  const lookSpring = useMemo(() => new Spring3(), []);
  const fovSpring = useMemo(() => new Spring1(), []);
  const bias = useRef(0);
  const biasY = useRef(0);
  const roll = useRef(0);

  useFrame(({ camera, size, clock }, delta) => {
    const d = Math.min(delta, 0.1);
    const cam = camera as THREE.PerspectiveCamera;

    if (mode === 'inspect') {
      const separates = !slug || (studios[slug as ProjectSlug] as { exploded?: boolean } | undefined)?.exploded;
      inspectPose(separates ? inspectionValue(sceneState.explode) : 0, pose);
    } else if (mode === 'range') {
      sampleShot(sceneState.rangeShot, sceneState.runnerAt, pose.pos, pose.look);
      pose.fov = 34;
    } else {
      sampleStation(sceneState.station, pose);
    }

    if (mode !== 'bench') {
      forward.copy(pose.pos).sub(pose.look).divideScalar(sceneControls.zoom);
      pose.pos.copy(pose.look).add(forward);
    }

    /* --- lens. A narrow viewport opens the lens rather than walking the
       camera backwards, so the authored standpoint is still the standpoint on
       a phone. Only what the lens could not cover is taken as standoff. */
    const aspect = size.width / Math.max(1, size.height);
    const framing = portraitFraming(pose.fov, aspect);
    pose.fov = framing.fov;
    if (framing.pull > 1) {
      forward.copy(pose.pos).sub(pose.look).multiplyScalar(framing.pull);
      pose.pos.copy(pose.look).add(forward);
    }

    /* --- lateral frame shift. Translating BOTH the camera and its look-at
       along the view's right vector slides the whole frame sideways without
       turning the camera, which moves the subject to the opposite side of the
       viewport — the object ends up inside the chapter's visual column rather
       than behind its text. Damped, so the swap between an odd and an even
       chapter reads as the camera stepping across rather than as a cut.

       On a case study the device shares the viewport with the title block, so
       the inspection frame is biased right rather than centred. The range set
       is full-bleed but its captions sit in the lower left, so its subject is
       nudged off that corner by less — several of those shots look straight
       down a lane and want to stay centred. */
    const wantBias =
      window.innerWidth < 900
        ? mode === 'bench'
          ? sceneState.frameBias
          : 0
        : mode === 'inspect'
          ? additionalScene ? 0.2 : 0.5
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
      forward.copy(pose.look).sub(pose.pos);
      const distance = forward.length();
      forward.normalize();
      right.crossVectors(forward, UP).normalize();
      up.crossVectors(right, forward).normalize();

      /* How far the frame slides, measured in what the camera can SEE rather
         than in metres.

         This used to be `distance * 0.26`, described as "a quarter of the
         visible width". It was a quarter of the visible width at exactly one
         field of view and nothing like it anywhere else, because how much of
         the frame a given world distance covers depends on the lens as well as
         the standoff. Now that stations carry their own field of view — 27
         degrees on a laptop screen, 46 on the range — the error is large and
         backwards: the same constant shifted the tight shots about 65% harder
         than the wide ones, which is how half of the laptop screen ended up
         past the edge of the viewport on all three of its chapters while the
         room shots barely moved.

         Deriving the shift from the visible half-width fixes it at every focal
         length: 0.46 of a half-width puts the subject's centre just inside the
         middle of its column, which is the most a subject that fills half the
         frame can be moved without losing an edge. */
      const halfHeight = Math.tan(THREE.MathUtils.degToRad(pose.fov) / 2) * distance;
      const halfWidth = halfHeight * aspect;

      const shiftX = -bias.current * halfWidth * 0.46;
      /* Vertically: enough to clear the copy and sit inside the visual frame
         below it, but not so much that the device lands on the fold. */
      const shiftY = biasY.current * halfHeight * 0.6;

      pose.pos.addScaledVector(right, shiftX).addScaledVector(up, shiftY);
      pose.look.addScaledVector(right, shiftX).addScaledVector(up, shiftY);
    }

    /* --- pointer parallax and float, both scaled down as the camera closes on
       an object: at a wide room shot a little drift is atmosphere, but the same
       angular offset 400mm from a circuit board is a lurch. Scale off the
       actual standoff rather than off the station index, so it is correct for
       every mode without a table of exceptions. */
    const standoff = pose.pos.distanceTo(pose.look);
    const openness = THREE.MathUtils.clamp((standoff - 0.45) / 1.6, 0, 1);
    pose.pos.x += sceneState.pointerX * 0.055 * openness;
    pose.pos.y += sceneState.pointerY * 0.035 * openness;

    breathe(clock.elapsedTime, 0.016 * openness, drift);
    pose.pos.add(drift);

    if (mode === 'bench') clampToRoom(pose.pos);

    /* --- motion. A tracking shot has to sit tighter on its mark than a room
       walk does, or the carriage slides around inside the frame every time the
       reader changes scroll speed. */
    const omega = mode === 'range' ? 16 : mode === 'inspect' ? 14 : 10;

    if (sceneState.snap) {
      posSpring.snap(pose.pos);
      lookSpring.snap(pose.look);
      fovSpring.snap(pose.fov);
      roll.current = 0;
    } else {
      posSpring.step(pose.pos, omega, d);
      // the head settles a touch faster than the body, which keeps the subject
      // pinned while the camera is still arriving
      lookSpring.step(pose.look, omega * 1.25, d);
      fovSpring.step(pose.fov, omega * 0.8, d);
    }

    camera.position.copy(posSpring.value);

    /* --- bank. A few tenths of a degree of roll into a lateral move. The
       velocity is already being carried by the spring, so this costs a dot
       product and is the cheapest cinematography in the scene. */
    forward.copy(lookSpring.value).sub(posSpring.value);
    const dist = forward.length() || 1;
    forward.divideScalar(dist);
    right.crossVectors(forward, UP).normalize();
    const lateral = posSpring.velocity.dot(right);
    roll.current = THREE.MathUtils.damp(
      roll.current,
      THREE.MathUtils.clamp(-lateral * 0.016, -0.022, 0.022),
      3,
      d,
    );

    camera.lookAt(lookSpring.value);
    if (roll.current !== 0) camera.rotateZ(roll.current);

    if (Math.abs(cam.fov - fovSpring.value) > 0.01) {
      cam.fov = fovSpring.value;
      cam.updateProjectionMatrix();
    }

    focusPoint.copy(lookSpring.value);
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

/** Pause only the free-running demonstration time. The reader keeps control
 * of scroll, inspection and camera movement. The clamp prevents tab resumes
 * from skipping an entire device cycle. */
function SceneTime({ mode }: { mode: StageMode }) {
  const elapsed = useRef(0);
  useFrame(({ clock }, delta) => {
    if (mode === 'bench' || !sceneControls.paused) elapsed.current += Math.min(delta, 0.1);
    clock.elapsedTime = elapsed.current;
    advanceInspection(delta, sceneState.explode);
  }, -100);
  return null;
}

function FocusTracking({ dof }: { dof: React.RefObject<DepthOfFieldEffect> }) {
  useFrame(() => { if (dof.current) dof.current.target = focusPoint; });
  return null;
}

/* --- lighting ------------------------------------------------------------ */

function BenchLighting({ quality, mode }: { quality: 'high' | 'medium' | 'low'; mode: StageMode }) {
  const key = useRef<THREE.SpotLight>(null);

  useFrame((_, delta) => {
    if (!key.current || mode !== 'bench') return;
    /* The bench light lifts slightly as a device powers up, so the moment a
       chapter arrives is carried by the lighting and not only by the LEDs, and
       eases off when the reader turns to face the room. It no longer goes out:
       the camera now walks around the room and can see the bench and the floor
       area in the same shot, and a bench that switches itself off when you
       turn your back is a stage trick you can see the wires on. */
    const away = isRoomChapter(sceneState.activeProject) ? 1 : 0;
    key.current.intensity = THREE.MathUtils.damp(
      key.current.intensity,
      (20 + sceneState.power * 7) * (1 - away * 0.34),
      2,
      Math.min(delta, 1 / 30),
    );
  });

  /* Inspect mode gets its own rig rather than a brighter bench.

     The bench light hangs 950mm above the benchtop and is tuned for objects
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
        <color attach="background" args={['#070b11']} />
        <fog attach="fog" args={['#070b11', 2.0, 6.5]} />
        <ambientLight intensity={0.42} color="#9fb6cd" />
        {/* Intensities look large next to the bench rig's, and have to be:
            with decay={2} irradiance falls as 1/d², and these lights stand
            roughly twice as far from their subject as the batten does from
            the benchtop. */}
        <spotLight
          position={[0.5, 0.9, 0.75]}
          angle={0.95}
          penumbra={1}
          distance={6}
          decay={2}
          intensity={30}
          color="#e6f2ff"
          castShadow={quality === 'high'}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.002}
          shadow-camera-near={0.1}
          shadow-camera-far={5}
        />
        <pointLight position={[-0.95, 0.4, 0.65]} intensity={4.2} distance={4} decay={2} color="#7fb8ff" />
        {/* rim from behind, so a black enclosure still holds an edge */}
        <pointLight position={[-0.35, 0.55, -1.15]} intensity={4.4} distance={4} decay={2} color="#9fe6ff" />
        <Environment resolution={quality === 'high' ? 256 : 128} frames={1}>
          <Lightformer form="rect" intensity={0.65} position={[-1.3, 0.7, -0.7]} scale={[0.8, 1.4, 1]} rotation={[0, Math.PI / 3, 0]} color="#f0d5ac" />
          <Lightformer form="rect" intensity={1.8} position={[0, 2, 0.6]} scale={[2.4, 1.2, 1]} color="#e8f4ff" />
          <Lightformer
            form="rect"
            intensity={0.9}
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
      <color attach="background" args={['#0a0e14']} />
      {/* Set well out. The camera now stands at the far end of a 7m room and
          looks the length of it; fog tuned for a one-metre benchtop closed the
          far wall in to a grey card. */}
      <fog attach="fog" args={['#0a0e14', 6, 19]} />

      {/* Sky-to-floor ambient. A hemisphere rather than a flat ambient so
          upward faces read cool from the ceiling and downward faces pick up
          the warm bounce off the pine benchtop — for one uniform it does more
          for the sense of a real interior than any other light here.

          Both of these are deliberately restrained. Raising the light level is
          not the same as raising the FILL: fill has no direction, so past a
          certain point every extra unit of it is bought by flattening the
          scene, which is the exact look the brief was asking to get away from.
          The room gets its brightness from the ceiling run below, which has a
          position and therefore a falloff and a shape. */}
      <hemisphereLight args={['#bfd8ed', '#493b2d', 0.44]} />
      <ambientLight intensity={0.1} color="#93a8bd" />

      {/* the batten over the bench — a wide, soft, slightly cool pool */}
      <spotLight
        ref={key}
        position={[-0.32, 0.95, -0.16]}
        angle={1.05}
        penumbra={1}
        distance={5}
        decay={2}
        intensity={20}
        color="#dceeff"
        castShadow={quality === 'high'}
        /* 1024, not 2048. This is the ONLY shadow-casting light in the room
           now, and it covers 3.2m of bench: a 1024 map over that is ~3mm per
           texel, which is finer than anything a soft-edged batten 950mm up
           would actually resolve. The 2048 it briefly had was four times the
           shadow-pass fill for a difference nothing in frame is sharp enough
           to show. */
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        /* Normal bias, not a bigger depth bias: the bench is full of thin
           slabs lying flat, and biasing those by depth alone either acnes the
           benchtop or floats every shadow off the object casting it. */
        shadow-normalBias={0.004}
        shadow-camera-near={0.1}
        shadow-camera-far={3.2}
      />

      {/* The ceiling run over the room floor. Always on — this is the light the
          reader is walking around under, and the room has to be there before a
          chapter asks for it. Positions come from layout.ts, which is also
          where RoomShell hangs the fixtures you can see. */}
      {CEILING_FIXTURES.map(([x, z]) => (
        <pointLight
          key={`${x}:${z}`}
          position={[x, SHELL.fixtureY, z]}
          intensity={26}
          distance={8.5}
          decay={2}
          color="#cfe0f5"
        />
      ))}

      {/* Spill from the two monitors, and from the instrument panel at the
          other end of the bench. These two survived the light cull below
          because they are the whole "lit by the things you can see lighting
          it" idea — take them out and the bench is lit by nothing that is in
          the shot. */}
      <pointLight position={[0.46, 0.28, -0.24]} intensity={1.1} distance={1.8} decay={2} color="#8fc4ff" />
      <pointLight position={[-0.95, 0.16, -0.14]} intensity={0.7} distance={1.4} decay={2} color="#4fe8c8" />

      {/* Two lights that used to be here are gone, and neither is missed:
          a warm bounce off the benchtop, now carried by the hemisphere's
          ground colour, which is the same effect for no per-fragment cost;
          and a corridor light behind the doorway, now carried by the doorway
          panel's own emissive, which is what the reader was actually seeing.
          Both were paid for on every pixel of the frame to do something a
          free uniform or an existing surface already did. */}

      {/* Baked once — this is what the metals, the glass and the solder mask
          reflect. Never re-rendered, so it costs nothing per frame. */}
      <Environment resolution={quality === 'high' ? 256 : 128} frames={1}>
        <Lightformer form="rect" intensity={2.8} position={[0, 2.2, 0.4]} scale={[3, 1.2, 1]} color="#e8f4ff" />
        <Lightformer form="rect" intensity={1.6} position={[0, 2.4, 2.4]} scale={[4, 1.4, 1]} color="#dceaff" />
        <Lightformer
          form="rect"
          intensity={1.2}
          position={[1.6, 0.6, 1.2]}
          scale={[1.6, 2, 1]}
          rotation={[0, -Math.PI / 4, 0]}
          color="#9fd8ff"
        />
        <Lightformer
          form="rect"
          intensity={0.8}
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
      <color attach="background" args={['#070a0e']} />
      {/* The far end of the lane goes into haze rather than into a hard edge. */}
      <fog attach="fog" args={['#070a0e', 12, 48]} />
      <hemisphereLight args={['#a8c0d8', '#25292e', 0.5]} />
      <ambientLight intensity={0.26} color="#9db2c6" />

      {/* The overhead run, as three pools rather than one per fixture. These
          are large numbers because they are 2.7m up with decay={2}: the floor
          under each one lands at roughly intensity/7. */}
      {[FIRING_X + 1.2, 0.6, BACKSTOP_X - 2.2].map((x, i) => (
        <pointLight
          key={x}
          position={[x, 2.72, 0]}
          intensity={i === 1 ? 68 : 58}
          distance={14}
          decay={2}
          color="#dbeaff"
        />
      ))}
      {/* the console's own glow at the firing point */}
      <pointLight position={[FIRING_X - 0.3, 1.25, -1.1]} intensity={3.6} distance={3.5} decay={2} color="#8fc4ff" />

      {/* the travelling key */}
      <primitive object={target} />
      <spotLight
        ref={key}
        target={target}
        angle={0.62}
        penumbra={1}
        distance={7}
        decay={2}
        intensity={62}
        color="#e6f2ff"
        castShadow={quality === 'high'}
        shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.004}
        shadow-camera-near={0.4}
        shadow-camera-far={7}
      />

      <Environment resolution={quality === 'high' ? 256 : 128} frames={1}>
        <Lightformer form="rect" intensity={1.4} position={[0, 3, 0]} scale={[8, 1.2, 1]} rotation={[Math.PI / 2, 0, 0]} color="#dceaff" />
        <Lightformer form="rect" intensity={0.7} position={[-6, 1.2, 2]} scale={[2, 2, 1]} color="#9fd8ff" />
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
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  useEffect(() => {
    const update = () => { setPageVisible(!document.hidden); if (!document.hidden) sceneState.snap = true; };
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const q = profile.tier;
  const detail = q === 'high' ? 'high' : 'low';

  /* Live resolution, seeded below the profile's ceiling and then moved by the
     performance monitor. Held in state rather than a ref because the canvas
     reads it as a prop; it changes at most a handful of times in a session, so
     the re-renders are not a concern.

     Starting BELOW the ceiling rather than at it is the important part. Device
     pixel ratio is quadratic in cost — a retina panel at dpr 2 shades four
     times the fragments of the same page at dpr 1 — so opening at the maximum
     means every machine that cannot hold it spends the first few seconds
     visibly stuttering before the monitor notices and backs off. Those first
     few seconds are the hero shot, which is the heaviest frame on the page and
     the first thing anybody sees. Climbing into headroom is free; discovering
     the ceiling by hitting it is not. */
  const [dpr, setDpr] = useState(() => {
    const [min, max] = profile.dpr;
    return Math.min(max, min + (max - min) * START_FACTOR);
  });
  const onPerformance = useCallback(
    ({ factor }: PerformanceMonitorApi) => {
      const [min, max] = profile.dpr;
      // never below 1 physical pixel per CSS pixel: past that the page's own
      // text is what starts to look wrong, not the scene
      setDpr(Math.max(min, Math.round((min + (max - min) * factor) * 20) / 20));
    },
    [profile.dpr],
  );

  const caOffset = useMemo(() => new THREE.Vector2(0.0004, 0.00036), []);
  const dof = useRef<DepthOfFieldEffect>(null);

  const post = usePostChain(profile.postprocessing, caOffset, dof);

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
        frameloop={visible && pageVisible ? 'always' : 'never'}
        dpr={dpr}
        /* PCF, not 'soft'. PCFSoftShadowMap does a variable-radius lookup that
           costs several times a plain PCF tap, and at this map size against a
           penumbra-1 spot the two are indistinguishable. */
        shadows={q === 'high'}
        gl={{
          /* Under an EffectComposer the scene is rendered into render targets
             and the context's own MSAA never runs, so asking for it only costs
             a wider default framebuffer. The composer does the sampling. */
          antialias: profile.antialias && !profile.postprocessing,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        /* far has to clear the range lane: ~13m of standoff at the wide shot,
           plus the depth of the set behind it. */
        camera={{ position: [1.86, 0.68, 2.88], fov: 40, near: 0.02, far: 48 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          /* Up from 1.05. The set is brighter now, and ACES rolls the top end
             off gently enough that the extra third of a stop lands as presence
             in the mid-tones rather than as clipping in the highlights. */
          gl.toneMappingExposure = 1.22;
        }}
      >
        <SceneTime mode={mode} />
        <BenchLighting quality={q} mode={mode} />
        <Workbench mode={mode} slug={slug} detail={detail} />

        {/* The range set stands on a real floor with a real key over it, and
            the bench now has a lit room floor under it, so the cheap
            ground-contact pass is only worth its cost on the inspection
            stage, where there is no floor to catch a real shadow. */}
        {mode === 'inspect' && (
          <ContactShadows
            position={[0, -0.155, 0]}
            opacity={0.5}
            scale={2.4}
            blur={2.4}
            far={0.6}
            resolution={q === 'high' ? 512 : 256}
            color="#000000"
          />
        )}

        <CameraRig mode={mode} slug={slug} />
        <FocusTracking dof={dof} />
        <SnapReset />

        {/* Resolution that follows the machine rather than a guess about it.

            `getDeviceProfile` tiers from `hardwareConcurrency`, `deviceMemory`
            and pointer type, which are the only things available before a frame
            has been drawn — and they are a poor proxy for GPU throughput. A
            thin laptop with eight cores and an integrated GPU reports as high
            tier and then renders a full-viewport scene at a third of the
            refresh rate. This measures what actually happens and walks the
            device pixel ratio down until frames fit in the budget, then eases
            it back up if they do.

            Only the resolution moves. Toggling passes or lights from here would
            recompile shaders mid-scroll, which costs far more than the frame it
            was trying to save. */}
        <PerformanceMonitor
          /* Judged over a longer window than the default. Scrolling a page with
             a fixed canvas under it is inherently spiky — a chapter's texture
             upload, a route prefetch — and reacting to single bad frames would
             have the resolution oscillating for reasons that have nothing to do
             with the scene. */
          ms={260}
          iterations={7}
          /* Start where the canvas started, not at the ceiling. This is the
             monitor's INITIAL factor and it fires `onChange` immediately, so
             leaving it at 1 would jump the resolution straight back up to the
             maximum on the first frame and undo the conservative seed above. */
          factor={START_FACTOR}
          step={0.1}
          bounds={() => [45, 58]}
          flipflops={4}
          onFallback={() => setDpr(profile.dpr[0])}
          onChange={onPerformance}
        />

        {post}
      </Canvas>
    </div>
  );
}

/**
 * The post chain, memoised as one element.
 *
 * `EffectComposer` rebuilds every pass whenever its `children` identity
 * changes, and BenchCanvas re-renders each time the scene scrolls in or out of
 * view. Without this, every one of those tears down and rebuilds the whole
 * chain — including the depth-of-field pass's render targets.
 */
function usePostChain(
  enabled: boolean,
  caOffset: THREE.Vector2,
  dof: React.RefObject<DepthOfFieldEffect>,
) {
  return useMemo(() => {
    if (!enabled) return null;
    return (
      <EffectComposer multisampling={2}>
        {/* No ambient-occlusion pass, deliberately.

            SSAO was here and it looked good, but it needs a NORMAL PASS: a
            second full render of every object in the scene, every frame, purely
            to fill a buffer of surface normals. Against a room of ~400 visible
            meshes that doubled the geometry submitted per frame, on top of the
            shadow map, and it is the single most expensive thing this scene
            ever did. What it bought was contact darkening that the shadow map
            and the hemisphere's ground colour already approximate.

            If it comes back it should come back as a quality tier the user
            opts into, not as the default on every machine. */}
        {/* Focal plane on whatever the rig is looking at. A wide focus range
            and a small bokeh, deliberately: this is a room being walked
            through, not a macro lens, and the moment the background dissolves
            the set stops existing. 2.2m of world range keeps the subject and
            everything around it on the bench crisp, and only softens the far
            wall. */}
        <DepthOfField
          ref={dof}
          focusDistance={2.6}
          focusRange={2.2}
          bokehScale={1.5}
          /* The circle-of-confusion and bokeh buffers at a third of the frame.
             This is a soft background separation, not a bokeh showreel, and
             nothing in the blurred region has detail worth resolving — which
             is what makes it the one post effect here that can be run cheap
             without looking cheap. */
          resolutionScale={0.35}
        />
        {/* The threshold sits just above the screens so the LEDs and the scope
            trace bloom while the lit panels stay crisp. It had to move up with
            the panels: once the screens were brightened to hold their own
            against the lifted room, the old threshold put the white text on
            every console inside the bloom, which spread it into its own
            background and undid the brightening. */}
        <Bloom mipmapBlur intensity={0.55} luminanceThreshold={1.12} luminanceSmoothing={0.2} />
        <ChromaticAberration offset={caOffset} radialModulation modulationOffset={0.4} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette eskil={false} offset={0.3} darkness={0.52} />
      </EffectComposer>
    );
  }, [enabled, caOffset, dof]);
}
