import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { sceneState } from './sceneState';

const SLABS = 4;
const W = 2.55;
const D = 1.5;
const H = 0.32; // slab thickness
const CLOSED_GAP = 0.015;
const OPEN_GAP = 0.62;

const CYAN = new THREE.Color('#3fe0d0');
const AMBER = new THREE.Color('#f6a250');
// seam colour per interface — restrained: mostly cyan, one amber signal
const SEAM_COLORS = [CYAN, CYAN, AMBER];

/** Animated energy column revealed between the slabs as they separate.
 *  Rising scanlines + fresnel edge; output >1 so bloom picks it up. */
const CORE_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const CORE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    // fine data lines rising through the core
    float lines = smoothstep(0.78, 1.0, sin(vUv.y * 30.0 - uTime * 2.2) * 0.5 + 0.5);
    // slow broad pulse
    float slow = smoothstep(0.5, 1.0, sin(vUv.y * 6.0 + uTime * 0.6) * 0.5 + 0.5);
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.8);
    vec3 col = uColor * (0.2 + lines * 0.9 + slow * 0.15) + uAccent * fres * 0.3;
    float a = uReveal * (0.08 + lines * 0.3 + fres * 0.18);
    gl_FragColor = vec4(col, a);
  }
`;

/** Additive fresnel shell that gives each slab a faint holographic rim. */
const RIM_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const RIM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.5);
    gl_FragColor = vec4(uColor * f * uIntensity, f * uIntensity);
  }
`;

interface Props {
  quality: 'high' | 'medium' | 'low';
}

export function Monolith({ quality }: Props) {
  const group = useRef<THREE.Group>(null);
  const slabRefs = useRef<THREE.Group[]>([]);
  const seamRefs = useRef<THREE.MeshStandardMaterial[]>([]);
  const core = useRef<THREE.Mesh>(null);

  // reusable temp objects (no allocation in loop)
  const targetRot = useRef(new THREE.Vector2());

  const segments = quality === 'high' ? 4 : 2;

  // one shared geometry for all slab bodies and rim shells
  const slabGeo = useMemo(
    () => new RoundedBoxGeometry(W, H, D, segments, 0.045),
    [segments],
  );
  useEffect(() => () => slabGeo.dispose(), [slabGeo]);

  const coreMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CORE_VERT,
        fragmentShader: CORE_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uReveal: { value: 0 },
          uColor: { value: CYAN.clone() },
          uAccent: { value: AMBER.clone() },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  const rimMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RIM_VERT,
        fragmentShader: RIM_FRAG,
        uniforms: {
          uColor: { value: CYAN.clone() },
          uIntensity: { value: 0.2 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useEffect(
    () => () => {
      coreMat.dispose();
      rimMat.dispose();
    },
    [coreMat, rimMat],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(delta, 1 / 30);
    const sep = sceneState.separation;
    const t = state.clock.elapsedTime;
    // First frame after the loop was parked — scroll moved while we were not
    // rendering, so land on the target pose rather than easing in from it.
    // The flag is cleared by <SnapReset /> once every rig has read it.
    const snap = sceneState.snap;

    // --- slab separation (stacked along Y, centred) ---
    const gap = THREE.MathUtils.lerp(CLOSED_GAP, OPEN_GAP, sep);
    const pitch = H + gap;
    const mid = (SLABS - 1) / 2;
    for (let i = 0; i < SLABS; i++) {
      const slab = slabRefs.current[i];
      if (!slab) continue;
      const targetY = (i - mid) * pitch;
      // slight lateral fan when open, for sculptural offset
      const targetX = sep * (i - mid) * 0.06;
      // alternating micro-yaw as the stack opens — reads as precision machinery
      const targetRotY = sep * (i - mid) * 0.13;
      // emphasised layer lifts a touch
      const emph = sceneState.activeLayer === i ? 0.16 : 0;

      if (snap) {
        slab.position.set(targetX, targetY, emph);
        slab.rotation.y = targetRotY;
        continue;
      }
      slab.position.y = THREE.MathUtils.damp(slab.position.y, targetY, 6, d);
      slab.position.x = THREE.MathUtils.damp(slab.position.x, targetX, 6, d);
      slab.rotation.y = THREE.MathUtils.damp(slab.rotation.y, targetRotY, 5, d);
      slab.position.z = THREE.MathUtils.damp(slab.position.z, emph, 6, d);
    }

    // --- seam glow grows with separation; active layer's seams burn brighter ---
    const active = sceneState.activeLayer;
    for (let i = 0; i < seamRefs.current.length; i++) {
      const m = seamRefs.current[i];
      if (!m) continue;
      const boost = active === i || active === i + 1 ? 0.8 : 0;
      const target = 0.25 + sep * (1.5 + boost);
      m.emissiveIntensity = THREE.MathUtils.damp(m.emissiveIntensity, target, 5, d);
    }

    // --- energy core reveal ---
    coreMat.uniforms.uTime.value = t;
    coreMat.uniforms.uReveal.value = THREE.MathUtils.damp(
      coreMat.uniforms.uReveal.value,
      Math.min(1, sep * 1.6),
      5,
      d,
    );
    if (core.current) {
      core.current.scale.y = (SLABS - 1) * pitch;
      core.current.visible = sep > 0.02;
    }

    // --- rim glow strengthens as the monolith opens ---
    rimMat.uniforms.uIntensity.value = THREE.MathUtils.damp(
      rimMat.uniforms.uIntensity.value,
      0.12 + sep * 0.4,
      5,
      d,
    );

    // --- gentle pointer tilt (only when hero visible) + idle drift ---
    const px = sceneState.heroVisible ? sceneState.pointerX : 0;
    const py = sceneState.heroVisible ? sceneState.pointerY : 0;
    targetRot.current.set(
      -0.32 + py * 0.12 + Math.sin(t * 0.5) * 0.02,
      -0.5 + px * 0.22 + Math.sin(t * 0.35) * 0.03,
    );
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetRot.current.x, 4, d);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetRot.current.y, 4, d);
    // very subtle vertical float
    g.position.y = Math.sin(t * 0.6) * 0.04;
  });

  return (
    <group ref={group} rotation={[-0.32, -0.5, 0]}>
      {/* energy core revealed between the slabs (unit-height box, scaled per frame) */}
      <mesh ref={core} material={coreMat} visible={false}>
        <boxGeometry args={[W * 0.7, 1, D * 0.7]} />
      </mesh>

      {Array.from({ length: SLABS }).map((_, i) => (
        <group key={i} ref={(el) => el && (slabRefs.current[i] = el)}>
          <mesh geometry={slabGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#06080b"
              metalness={0.96}
              roughness={0.19}
              clearcoat={1}
              clearcoatRoughness={0.28}
              envMapIntensity={1.25}
              reflectivity={0.6}
            />
          </mesh>

          {/* holographic fresnel rim */}
          <mesh geometry={slabGeo} material={rimMat} scale={1.015} />

          {/* thin illuminated seam on the top interface (not on the top-most slab) */}
          {i < SLABS - 1 && (
            <mesh position={[0, H / 2 + 0.008, 0]}>
              <boxGeometry args={[W * 0.9, 0.012, D * 0.9]} />
              <meshStandardMaterial
                ref={(el) => el && (seamRefs.current[i] = el)}
                color={SEAM_COLORS[i]}
                emissive={SEAM_COLORS[i]}
                emissiveIntensity={0.25}
                toneMapped={false}
                roughness={0.4}
                metalness={0}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
