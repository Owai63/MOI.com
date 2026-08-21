/* ============================================================================
   Instruments — the oscilloscope and the bench power supply
   ----------------------------------------------------------------------------
   The scope is the one prop that has to be genuinely alive: a static trace
   image would undo the whole scene. Its screen is a shader — graticule,
   waveform, and phosphor persistence evaluated per pixel — so it animates for
   free on the GPU and never costs a texture upload.

   The trace changes with the chapter on screen: the tracker chapter shows an
   asynchronous serial frame, the range chapter a motor PWM drive, and so on
   (see registry.tsx). The instrument is showing the signal the chapter is
   about, which is the whole reason it is on the bench.
   ========================================================================== */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { benchMaterials, ledMaterial, screenMaterial } from '../materials';
import { sevenSegTexture } from '../textures';
import { sceneState } from '../../sceneState';
import { DEVICES, type Waveform } from '../devices/registry';

/* --- scope screen shader ------------------------------------------------- */

const SCOPE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SCOPE_FRAG = /* glsl */ `
  precision mediump float;
  uniform float uTime;
  uniform float uWave;    // 0 serial, 1 pwm, 2 burst, 3 ramp, 4 noise, 5 pulse
  uniform float uPower;   // 0..1 — the instrument warming up
  uniform vec3  uColor;
  varying vec2 vUv;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  /* Signal under test, in -1..1, as a function of horizontal position. Each
     branch is the shape the corresponding chapter's hardware actually puts on
     a wire: a UART frame, a PWM drive, a packet burst, and so on. */
  float signal(float x, float t) {
    if (uWave < 0.5) {
      // asynchronous serial: start bit, eight data bits, stop
      float bit = floor(x * 11.0);
      float v = bit < 0.5 ? 0.0 : (bit > 9.5 ? 1.0 : step(0.5, hash(bit + floor(t * 1.7) * 13.0)));
      return v * 2.0 - 1.0;
    } else if (uWave < 1.5) {
      // motor PWM, duty slowly sweeping as the drive ramps
      float duty = 0.32 + 0.30 * (0.5 + 0.5 * sin(t * 0.55));
      return step(fract(x * 9.0), duty) * 2.0 - 1.0;
    } else if (uWave < 2.5) {
      // radio packet burst separated by quiet airtime
      float win = step(0.12, fract(x * 1.6 + t * 0.22)) * step(fract(x * 1.6 + t * 0.22), 0.55);
      return sin(x * 260.0 + t * 9.0) * win;
    } else if (uWave < 3.5) {
      // ramp / sawtooth
      return fract(x * 3.0 + t * 0.3) * 2.0 - 1.0;
    } else if (uWave < 4.5) {
      // band-limited noise floor with occasional excursions
      float n = hash(floor(x * 150.0) + floor(t * 22.0) * 7.0) - 0.5;
      return n * 1.5 + sin(x * 18.0 + t) * 0.18;
    }
    // narrow pulses
    float p = fract(x * 6.0 - t * 0.4);
    return (smoothstep(0.03, 0.0, p) + smoothstep(0.03, 0.0, 1.0 - p)) * 1.6 - 0.8;
  }

  void main() {
    vec2 uv = vUv;
    vec3 col = vec3(0.006, 0.016, 0.014);

    // graticule: ten by eight divisions with a brighter centre cross
    vec2 g = abs(fract(uv * vec2(10.0, 8.0)) - 0.5);
    float grid = smoothstep(0.47, 0.5, max(g.x, g.y)) * 0.13;
    float axis = smoothstep(0.004, 0.0, abs(uv.y - 0.5)) + smoothstep(0.004, 0.0, abs(uv.x - 0.5));
    col += vec3(0.16, 0.28, 0.26) * (grid + axis * 0.22);

    /* Trace with persistence. Sampling the signal a few times across the
       pixel's horizontal neighbourhood and taking the nearest approach gives
       the vertical edges their brightness falloff — the thing that makes a
       CRT trace look like a trace rather than a plotted line. */
    float t = uTime;
    float best = 1.0;
    for (int i = -3; i <= 3; i++) {
      float x = uv.x + float(i) * 0.0022;
      float y = 0.5 + signal(x, t) * 0.30;
      best = min(best, abs(uv.y - y));
    }
    float line = smoothstep(0.020, 0.0, best);
    float glow = smoothstep(0.11, 0.0, best) * 0.30;

    col += uColor * (line * 1.5 + glow) * uPower;

    // faint scanline and the vignette of the tube
    col *= 1.0 - 0.06 * sin(uv.y * 620.0);
    float r = length(uv - 0.5);
    col *= smoothstep(0.86, 0.28, r);

    gl_FragColor = vec4(col * (0.25 + uPower * 0.75), 1.0);
  }
`;

const WAVE_INDEX: Record<Waveform, number> = {
  serial: 0,
  pwm: 1,
  burst: 2,
  ramp: 3,
  noise: 4,
  pulse: 5,
};

export function Oscilloscope({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const m = benchMaterials();
  const W = 0.34;
  const H = 0.20;
  const D = 0.16;

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SCOPE_VERT,
        fragmentShader: SCOPE_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uWave: { value: 0 },
          uPower: { value: 0 },
          uColor: { value: new THREE.Color('#4fffc4') },
        },
        toneMapped: false,
      }),
    [],
  );

  const target = useRef({ wave: 0, power: 0 });

  useFrame((state, delta) => {
    const d = Math.min(delta, 1 / 30);
    mat.uniforms.uTime.value = state.clock.elapsedTime;

    // the trace follows the chapter under the reader
    const active = sceneState.activeProject;
    const entry = active >= 0 ? DEVICES[active] : null;
    if (entry) {
      target.current.wave = WAVE_INDEX[entry.wave];
      (mat.uniforms.uColor.value as THREE.Color).lerp(
        SCRATCH.set(entry.accent),
        1 - Math.pow(0.001, d),
      );
    }
    mat.uniforms.uWave.value = target.current.wave;

    // the scope is on whenever the bench is, not only during a chapter
    mat.uniforms.uPower.value = THREE.MathUtils.damp(
      mat.uniforms.uPower.value,
      sceneState.inspect ? 0.35 : 0.55 + sceneState.power * 0.45,
      2,
      d,
    );
  });

  return (
    <group position={position} rotation={rotation as unknown as THREE.Euler}>
      {/* chassis */}
      <mesh position={[0, H / 2, 0]} castShadow receiveShadow material={m.chassis}>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      {/* front panel, proud of the chassis */}
      <mesh position={[0, H / 2, D / 2 + 0.002]} material={m.panel}>
        <boxGeometry args={[W - 0.004, H - 0.006, 0.006]} />
      </mesh>
      {/* screen bezel + the live tube */}
      <mesh position={[-0.045, H / 2 + 0.012, D / 2 + 0.006]}>
        <boxGeometry args={[0.20, 0.126, 0.004]} />
        <meshStandardMaterial color="#08090b" roughness={0.5} />
      </mesh>
      <mesh position={[-0.045, H / 2 + 0.012, D / 2 + 0.009]} material={mat}>
        <planeGeometry args={[0.186, 0.112]} />
      </mesh>

      {/* control cluster: rotary encoders and a column of buttons */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0.10 + (i % 2) * 0.05, H * 0.72 - Math.floor(i / 2) * 0.05, D / 2 + 0.012]}
          rotation={[Math.PI / 2, 0, 0]}
          material={m.polymer}
        >
          <cylinderGeometry args={[0.012, 0.013, 0.014, 16]} />
        </mesh>
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={`b${i}`}
          position={[-0.045 + i * 0.026, H * 0.16, D / 2 + 0.008]}
          material={m.polymer}
        >
          <boxGeometry args={[0.018, 0.010, 0.004]} />
        </mesh>
      ))}
      {/* power indicator */}
      <mesh position={[0.145, H * 0.16, D / 2 + 0.008]} material={ledMaterial('#7dff9f', 2.4)}>
        <sphereGeometry args={[0.0022, 8, 6]} />
      </mesh>
      {/* carry handle over the top */}
      <mesh position={[0, H + 0.014, 0]} material={m.polymer}>
        <boxGeometry args={[0.19, 0.008, 0.022]} />
      </mesh>
      {/* feet */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[(sx * (W - 0.05)) / 2, 0.005, (sz * (D - 0.04)) / 2]}
            material={m.polymer}
          >
            <cylinderGeometry args={[0.008, 0.009, 0.01, 10]} />
          </mesh>
        )),
      )}
    </group>
  );
}

const SCRATCH = new THREE.Color();

/* --- bench power supply -------------------------------------------------- */

/** Linear bench supply: two seven-segment readouts, coarse/fine controls, and
 *  4mm binding posts. The readouts move with the load the bench is under. */
export function PowerSupply({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const m = benchMaterials();
  const W = 0.20;
  const H = 0.155;
  const D = 0.24;

  const voltsTex = useMemo(() => sevenSegTexture('12.0', 'V'), []);
  const ampsTex = useMemo(() => sevenSegTexture('0.42', 'A'), []);
  const voltsMat = useMemo(() => screenMaterial(voltsTex, '#ff5a3c'), [voltsTex]);
  const ampsMat = useMemo(() => screenMaterial(ampsTex, '#3fe0d0'), [ampsTex]);

  useFrame((_, delta) => {
    // the current readout brightens as the device on the bench draws power
    const d = Math.min(delta, 1 / 30);
    ampsMat.emissiveIntensity = THREE.MathUtils.damp(
      ampsMat.emissiveIntensity,
      0.5 + sceneState.power * 1.1,
      2.4,
      d,
    );
    voltsMat.emissiveIntensity = 1.15;
  });

  return (
    <group position={position} rotation={rotation as unknown as THREE.Euler}>
      <mesh position={[0, H / 2, 0]} castShadow receiveShadow material={m.chassis}>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh position={[0, H / 2, D / 2 + 0.002]} material={m.panel}>
        <boxGeometry args={[W - 0.004, H - 0.006, 0.005]} />
      </mesh>

      {/* the two readouts, recessed behind red and green filters */}
      <mesh position={[-0.045, H * 0.72, D / 2 + 0.006]} material={voltsMat}>
        <planeGeometry args={[0.072, 0.028]} />
      </mesh>
      <mesh position={[0.045, H * 0.72, D / 2 + 0.006]} material={ampsMat}>
        <planeGeometry args={[0.072, 0.028]} />
      </mesh>

      {/* coarse and fine controls */}
      {[-0.05, 0.05].map((x) => (
        <mesh key={x} position={[x, H * 0.38, D / 2 + 0.014]} rotation={[Math.PI / 2, 0, 0]} material={m.polymer}>
          <cylinderGeometry args={[0.016, 0.017, 0.02, 20]} />
        </mesh>
      ))}

      {/* 4mm binding posts */}
      <mesh position={[-0.05, H * 0.14, D / 2 + 0.010]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.012, 12]} />
        <meshStandardMaterial color="#b8342b" roughness={0.5} />
      </mesh>
      <mesh position={[0.05, H * 0.14, D / 2 + 0.010]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.012, 12]} />
        <meshStandardMaterial color="#0d0d0f" roughness={0.5} />
      </mesh>
      {/* rocker switch */}
      <mesh position={[0.082, H * 0.14, D / 2 + 0.007]} material={m.polymer}>
        <boxGeometry args={[0.016, 0.022, 0.006]} />
      </mesh>

      {/* ventilated top */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[0, H + 0.0005, -0.06 + i * 0.02]}>
          <boxGeometry args={[W * 0.7, 0.001, 0.006]} />
          <meshStandardMaterial color="#0b0c0e" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
