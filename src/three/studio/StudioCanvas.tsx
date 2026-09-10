import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { featuredSlugs, type ProjectSlug } from '../../data/content';
import type { DeviceProfile } from '../../lib/quality';
import { sceneState } from '../sceneState';
import { HeroModel, ProjectModel, ModelResources, type MotionRef } from './Models';
import { studios } from './catalog';

export interface StudioCanvasProps {
  slug?: ProjectSlug;
  profile: DeviceProfile;
  visible: boolean;
  running: boolean;
  value: number;
  autoRotate: boolean;
  view: 'perspective' | 'front' | 'top';
  reset: number;
  home?: boolean;
  zoom?: number;
  onFailure?: () => void;
}

const TARGET = new THREE.Vector3(0, 0.3, 0);

function StudioLighting({ accent, shadows }: { accent: string; shadows: boolean }) {
  return <>
    <hemisphereLight args={['#d7e6f7', '#36434b', 1.1]} />
    <directionalLight position={[3, 6, 4]} intensity={3.2} color="#fff4e5" castShadow={shadows}
      shadow-mapSize={[1024, 1024]} shadow-camera-left={-4} shadow-camera-right={4}
      shadow-camera-top={4} shadow-camera-bottom={-4} shadow-normalBias={0.025} shadow-bias={-0.0001} />
    <directionalLight position={[-4, 2, -3]} intensity={2.5} color="#c0d9f4" />
    <pointLight position={[3, 1, -2]} intensity={6} color={accent} distance={12} decay={2} />
    {/* One baked studio reflection map: no HDR download or per-frame capture. */}
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={4} color="#f4f3ee" scale={[6, 3, 1]} position={[-3, 4, 2]} rotation={[0, Math.PI / 3, 0]} />
      <Lightformer form="rect" intensity={3} color="#a7c9ed" scale={[3, 5, 1]} position={[4, 2, 1]} rotation={[0, -Math.PI / 2, 0]} />
      <Lightformer form="rect" intensity={2} color="#ffffff" scale={[6, 2, 1]} position={[0, 4, -3]} rotation={[Math.PI / 3, 0, 0]} />
    </Environment>
  </>;
}

function CameraControls({ view, reset, autoRotate, zoom = 1 }: Pick<StudioCanvasProps, 'view' | 'reset' | 'autoRotate' | 'zoom'>) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size, invalidate } = useThree();
  const requested = useRef(new THREE.Vector3());
  const moving = useRef(true);
  const last = useRef('');
  const aspect = size.width / Math.max(1, size.height);
  const distance = (aspect < 1 ? 9.5 : 7.4) / zoom;
  useEffect(() => {
    const key = `${view}:${reset}:${distance}`;
    if (last.current === key) return;
    last.current = key;
    if (view === 'top') requested.current.set(0, distance, 0.05);
    else if (view === 'front') requested.current.set(0, 0.8, distance);
    else requested.current.set(distance * 0.35, distance * 0.42, distance * 0.82);
    moving.current = true;
    invalidate();
  }, [view, reset, distance, invalidate]);
  useFrame((_, delta) => {
    if (!moving.current) return;
    camera.position.lerp(requested.current, 1 - Math.exp(-7 * Math.min(delta, 0.05)));
    controls.current?.target.lerp(TARGET, 1 - Math.exp(-7 * Math.min(delta, 0.05)));
    controls.current?.update();
    moving.current = camera.position.distanceToSquared(requested.current) > 0.00001;
    if (moving.current) invalidate();
  });
  return <OrbitControls ref={controls} makeDefault target={[0, 0.3, 0]} enableDamping dampingFactor={0.075}
    enablePan={false} minDistance={3.5} maxDistance={13} minPolarAngle={0.02} maxPolarAngle={Math.PI * 0.49}
    autoRotate={autoRotate} autoRotateSpeed={0.32} enableZoom={false}
    onStart={() => { moving.current = false; }} />;
}

function Scene({ slug, home = false, value, running, autoRotate, view, reset, profile, zoom, onFailure, onActive }: StudioCanvasProps & { onActive: (slug: ProjectSlug | undefined) => void }) {
  const model = useRef<THREE.Group>(null);
  const motion: MotionRef = useRef({ value, time: 0, running });
  const { viewport, camera, invalidate, gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onFailure?.(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);
  const active = useRef<ProjectSlug | undefined>(slug);
  const offset = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  // Shared legacy hardware hooks run after this driver and read a stable pose.
  useFrame(({ clock }, delta) => {
    const d = Math.min(delta, 0.05);
    motion.current.time += running ? d : 0;
    motion.current.running = running;
    motion.current.value = THREE.MathUtils.damp(motion.current.value, value, 8, d);
    clock.elapsedTime = motion.current.time;
    sceneState.stage = 'inspect';
    sceneState.inspect = true;
    sceneState.explode = slug && 'exploded' in studios[slug] ? motion.current.value * 0.75 : 0;
    sceneState.snap = false;
    if (Math.abs(motion.current.value - value) > 0.0001) invalidate();
    if (home) {
      const next = sceneState.station < 0.4 || sceneState.station > featuredSlugs.length + 0.5 ? undefined : featuredSlugs[sceneState.activeProject];
      if (next !== active.current) { active.current = next; onActive(next); }
      const { width, height } = viewport.getCurrentViewport(camera, TARGET);
      // Swap at the scroll handover's dark frame; do not expose a model pop.
      gl.domElement.style.opacity = next ? String(THREE.MathUtils.smoothstep(sceneState.build, 0, 0.8)) : '1';
      desired.current.set(
        (next ? sceneState.frameBias : window.innerWidth < 900 ? 0 : 1) * width * 0.24,
        next ? -sceneState.frameBiasY * height * 0.25 : -0.12,
        0,
      );
      offset.current.lerp(desired.current, 1 - Math.exp(-5 * d));
      if (model.current) {
        model.current.position.copy(offset.current);
        // A restrained scale change accompanies the scroll-driven fade.
        const scale = next ? 0.82 + sceneState.build * 0.10 : 0.91;
        model.current.scale.setScalar(THREE.MathUtils.damp(model.current.scale.x, scale, 5, d));
        model.current.rotation.y = Math.sin(motion.current.time * 0.16) * 0.045;
      }
    }
  }, -100);
  return <>
    <StudioLighting accent={slug ? studios[slug].accent : '#57d9c5'} shadows={profile.tier === 'high'} />
    <group ref={model}>
      <ModelResources key={slug ?? 'hero'}>
        {home && !slug ? <HeroModel /> : slug && <ProjectModel slug={slug} motion={motion} value={value} detail={profile.tier === 'high' ? 'high' : 'low'} />}
      </ModelResources>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]} receiveShadow>
        <circleGeometry args={[home ? 3.2 : 4.5, 64]} />
        <meshStandardMaterial color="#111b24" roughness={0.6} metalness={0.25} />
      </mesh>
    </group>
    {!home && <CameraControls zoom={zoom} view={view} reset={reset} autoRotate={autoRotate && running} />}
  </>;
}

export function StudioCanvas(props: StudioCanvasProps) {
  const { profile, visible, running, home } = props;
  const [active, setActive] = useState<ProjectSlug | undefined>(props.slug);
  const ceiling = Math.min(profile.dpr[1], window.devicePixelRatio || 1, 1.75);
  const [dpr, setDpr] = useState(Math.min(ceiling, 1.25));
  const camera = useMemo(() => ({ position: (home ? [0, 3.1, window.innerWidth < 900 ? 11 : 7.6] : [2.6, 3.1, 6.1]) as [number, number, number], fov: 38, near: 0.05, far: 45 }), [home]);
  return <Canvas camera={camera} dpr={dpr} frameloop={!visible ? 'never' : running ? 'always' : 'demand'}
    shadows={profile.tier === 'high' ? 'soft' : false}
    gl={{ antialias: profile.antialias, alpha: true, powerPreference: 'high-performance', stencil: false }}
    onCreated={({ gl, camera: cam }) => {
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.05;
      cam.lookAt(TARGET);
    }}>
    <PerformanceMonitor bounds={() => [42, 57]} flipflops={3}
      onDecline={() => setDpr(d => Math.max(0.85, d - 0.2))}
      onIncline={() => setDpr(d => Math.min(ceiling, d + 0.1))}
      onFallback={() => setDpr(Math.min(1, ceiling))} />
    <Scene {...props} slug={home ? active : props.slug} onActive={setActive} />
  </Canvas>;
}
