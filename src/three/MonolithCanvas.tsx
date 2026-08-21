import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  ContactShadows,
  AdaptiveDpr,
} from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  ToneMapping,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { Monolith } from './Monolith';
import { Particles, GroundGlow } from './Atmosphere';
import { sceneState } from './sceneState';
import type { DeviceProfile } from '../lib/quality';

const FLOOR_Y = -1.55;

/** Cinematic camera choreography: a slow arc that swings out and rises as
 *  the visitor moves through the page, returning home at contact. Pointer
 *  adds a light parallax on top. All damped — never snaps. */
function CameraRig() {
  const look = useRef(new THREE.Vector3(0, 0.1, 0));

  useFrame(({ camera }, delta) => {
    const d = Math.min(delta, 1 / 30);
    const p = sceneState.progress;
    // 0 at hero and contact, 1 mid-page — the camera "visits" the open stack
    const arc = Math.sin(p * Math.PI);
    const px = sceneState.pointerX;
    const py = sceneState.pointerY;

    const tx = px * 0.26 - arc * 0.9;
    const ty = 0.35 + py * 0.12 + arc * 0.55;
    const tz = 6 + arc * 0.9;
    const ly = 0.1 - arc * 0.3;

    if (sceneState.snap) {
      // First frame after the loop was parked: the scroll position moved while
      // we were not rendering, so damping from the frozen pose would read as a
      // slow drift. Jump instead.
      camera.position.set(tx, ty, tz);
      look.current.y = ly;
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, 2.2, d);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, ty, 2.2, d);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, tz, 2.2, d);
      look.current.y = THREE.MathUtils.damp(look.current.y, ly, 2.2, d);
    }
    camera.lookAt(look.current);
  });

  return null;
}

/** Clears the one-shot snap flag after every rig has had a chance to read it.
 *  Rendered last inside the Canvas so its useFrame runs last. */
function SnapReset() {
  useFrame(() => {
    if (sceneState.snap) sceneState.snap = false;
  });
  return null;
}

function StudioRig({ quality }: { quality: 'high' | 'medium' | 'low' }) {
  return (
    <>
      <color attach="background" args={['#05070a']} />
      <fog attach="fog" args={['#05070a', 7, 15]} />

      <ambientLight intensity={0.12} />

      {/* Controlled studio reflections baked once (no external HDRI). */}
      <Environment resolution={quality === 'high' ? 256 : 128} frames={1}>
        <Lightformer
          form="rect"
          intensity={3.4}
          position={[0, 4, 2]}
          scale={[8, 5, 1]}
          color="#eaf6ff"
        />
        <Lightformer
          form="rect"
          intensity={1.4}
          position={[-4, 1, 1]}
          scale={[3, 6, 1]}
          rotation={[0, Math.PI / 6, 0]}
          color="#bfe9ff"
        />
        <Lightformer
          form="rect"
          intensity={0.9}
          position={[5, 0, 2]}
          scale={[3, 5, 1]}
          rotation={[0, -Math.PI / 5, 0]}
          color="#ffd9ab"
        />
        <Lightformer
          form="ring"
          intensity={1.1}
          position={[0, -2, 4]}
          scale={[4, 4, 1]}
          color="#3fe0d0"
        />
      </Environment>

      {/* key light for the soft contact shadow */}
      <directionalLight
        position={[3, 6, 4]}
        intensity={0.6}
        castShadow={quality === 'high'}
        shadow-mapSize={[1024, 1024]}
      />
    </>
  );
}

function Floor({ quality }: { quality: 'high' | 'medium' | 'low' }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}>
      <planeGeometry args={[50, 50]} />
      {quality === 'low' ? (
        <meshStandardMaterial color="#06080b" roughness={0.6} metalness={0.4} />
      ) : (
        /* The floor sits behind heavy fog and is never read in detail, so the
           reflection buffer and blur kernel are sized for the impression, not
           for fidelity. Halving both is invisible here and is the single
           biggest per-frame GPU saving in the scene. */
        <MeshReflectorMaterial
          blur={[160, 60]}
          resolution={quality === 'high' ? 512 : 256}
          mixBlur={1}
          mixStrength={38}
          roughness={0.9}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#04060a"
          metalness={0.6}
          mirror={0}
        />
      )}
    </mesh>
  );
}

export function MonolithCanvas({ profile }: { profile: DeviceProfile }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const q = profile.tier;

  // barely-there lens fringing — enough to feel filmic, never distracting
  const caOffset = useMemo(() => new THREE.Vector2(0.00045, 0.0004), []);

  /* Park the render loop while the monolith is covered.
     The canvas itself is `position: fixed; inset: 0`, so observing *it* always
     reports "intersecting" and the scene ends up rendering for the full height
     of the page — reflective floor, contact shadows and the whole effect chain
     included — even though opaque content sits over it for most of the scroll.
     Instead we observe the elements the object is actually meant to show
     through (hero, the two interlude bands, footer), which are tagged with
     `data-monolith-window`. */
  useEffect(() => {
    const windows = document.querySelectorAll('[data-monolith-window]');
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
          // Resuming: let the scene jump to its scroll-correct pose.
          if (now && !was) sceneState.snap = true;
          return now;
        });
      },
      // Start rendering slightly before the window reaches the viewport so the
      // object is already alive by the time any of it is exposed.
      { rootMargin: '25% 0px 25% 0px' },
    );
    windows.forEach((w) => io.observe(w));
    return () => io.disconnect();
  }, []);

  // Pointer influence (skipped on coarse pointers — handled by not attaching).
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
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={profile.dpr}
        shadows={q === 'high'}
        gl={{
          antialias: q !== 'low',
          alpha: false,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 0.35, 6], fov: 32 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.02;
        }}
      >
        <StudioRig quality={q} />
        <Monolith quality={q} />
        <Particles quality={q} />
        <GroundGlow y={FLOOR_Y + 0.02} />
        <Floor quality={q} />
        <ContactShadows
          position={[0, FLOOR_Y + 0.01, 0]}
          opacity={0.55}
          scale={12}
          blur={2.6}
          far={4}
          resolution={q === 'high' ? 512 : 256}
          color="#000000"
        />
        <CameraRig />
        <SnapReset />
        <AdaptiveDpr pixelated />

        {/* 2x MSAA is enough once bloom is doing its own smoothing; 4x cost
            real frames on integrated GPUs for no visible gain. */}
        {profile.postprocessing && (
          <EffectComposer multisampling={2}>
            <Bloom
              mipmapBlur
              intensity={0.85}
              luminanceThreshold={1}
              luminanceSmoothing={0.15}
            />
            <ChromaticAberration
              offset={caOffset}
              radialModulation
              modulationOffset={0.4}
            />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            <Vignette eskil={false} offset={0.24} darkness={0.62} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
