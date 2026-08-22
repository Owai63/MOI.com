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
import { RoundedBox } from '@react-three/drei';
import {
  benchMaterials,
  ledMaterial,
  screenMaterial,
  glassMaterial,
  screenGlowMaterial,
} from '../materials';
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
  detail = 'high',
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  detail?: 'high' | 'low';
}) {
  const m = benchMaterials();
  const W = 0.34;
  const H = 0.2;
  const D = 0.16;

  /* The tube's own glass, and the glow it throws into the room. A scope face
     is the most reflective thing on this bench — it is real glass over a
     recessed display — and giving it a lit layer of its own is what stops the
     shader trace reading as a picture stuck to the front of a box. */
  const glass = useMemo(
    () => (detail === 'high' ? glassMaterial({ roughness: 0.1, opacity: 0.11, env: 2.4 }) : null),
    [detail],
  );
  const halo = useMemo(
    () => (detail === 'high' ? screenGlowMaterial('#4fffc4', 0.3) : null),
    [detail],
  );

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
      {/* Chassis, chamfered. A bench instrument is a folded steel box with a
          radius on every edge, and the highlight running round that radius is
          what tells you it is metal rather than a painted volume. */}
      <RoundedBox
        args={[W, H, D]}
        radius={0.005}
        smoothness={3}
        position={[0, H / 2, 0]}
        castShadow
        receiveShadow
        material={m.chassis}
      />
      {/* front panel, proud of the chassis */}
      <RoundedBox
        args={[W - 0.004, H - 0.006, 0.008]}
        radius={0.002}
        smoothness={2}
        position={[0, H / 2, D / 2 + 0.001]}
        material={m.panel}
      />
      {/* Moulded corner bumpers — the thing that says "this gets carried to
          site" rather than "this lives in a rack". */}
      {([-1, 1] as const).map((sx) =>
        ([-1, 1] as const).map((sy) => (
          <mesh
            key={`bump${sx}${sy}`}
            position={[(sx * (W - 0.03)) / 2, H / 2 + (sy * (H - 0.03)) / 2, D / 2 - 0.012]}
            material={m.polymer}
          >
            <boxGeometry args={[0.03, 0.03, 0.03]} />
          </mesh>
        )),
      )}

      {/* screen: a recessed bezel, the live tube, and the glass over it */}
      <mesh position={[-0.045, H / 2 + 0.012, D / 2 + 0.005]}>
        <boxGeometry args={[0.204, 0.13, 0.005]} />
        <meshStandardMaterial color="#08090b" roughness={0.5} />
      </mesh>
      <mesh position={[-0.045, H / 2 + 0.012, D / 2 + 0.0082]} material={mat}>
        <planeGeometry args={[0.186, 0.112]} />
      </mesh>
      {glass && halo && (
        <>
          <mesh position={[-0.045, H / 2 + 0.012, D / 2 + 0.0088]} material={glass}>
            <planeGeometry args={[0.19, 0.116]} />
          </mesh>
          <mesh position={[-0.045, H / 2 + 0.012, D / 2 + 0.016]} material={halo}>
            <planeGeometry args={[0.4, 0.28]} />
          </mesh>
        </>
      )}

      {/* Control cluster: rotary encoders with a knurled skirt and a pointer
          flat, so a knob reads as something you could actually turn. */}
      {[0, 1, 2].map((i) => {
        const x = 0.1 + (i % 2) * 0.05;
        const y = H * 0.72 - Math.floor(i / 2) * 0.05;
        return (
          <group key={i} position={[x, y, D / 2 + 0.006]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow material={m.polymer}>
              <cylinderGeometry args={[0.0135, 0.0145, 0.016, 20]} />
            </mesh>
            {/* knurl: a slightly larger, coarser ring at the base */}
            <mesh position={[0, 0, -0.005]} rotation={[Math.PI / 2, 0, 0]} material={m.chassis}>
              <cylinderGeometry args={[0.0152, 0.0152, 0.005, 24]} />
            </mesh>
            {/* the pointer, so its position means something */}
            <mesh position={[0, 0.008, 0.0085]}>
              <boxGeometry args={[0.0018, 0.009, 0.001]} />
              <meshStandardMaterial color="#dfe6ee" roughness={0.6} />
            </mesh>
          </group>
        );
      })}

      {/* a row of soft-key caps under the screen */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={`b${i}`}
          position={[-0.045 + i * 0.026, H * 0.16, D / 2 + 0.0075]}
          castShadow
          material={m.polymer}
        >
          <boxGeometry args={[0.018, 0.01, 0.005]} />
        </mesh>
      ))}

      {/* Two BNC inputs. A scope with no way to connect anything to it is the
          detail that quietly undoes the rest of the panel. */}
      {detail === 'high' &&
        ([-0.115, -0.078] as const).map((x, i) => (
          <group key={x} position={[x, H * 0.16, D / 2 + 0.006]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={m.aluminium}>
              <cylinderGeometry args={[0.0072, 0.0072, 0.012, 14]} />
            </mesh>
            <mesh position={[0, 0, 0.007]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0034, 0.0034, 0.004, 10]} />
              <meshStandardMaterial color="#0a0b0d" roughness={0.6} />
            </mesh>
            {/* the channel colour ring */}
            <mesh position={[0, -0.011, 0.004]}>
              <boxGeometry args={[0.012, 0.0022, 0.001]} />
              <meshStandardMaterial
                color="#0a0a0a"
                emissive={new THREE.Color(i === 0 ? '#f0c000' : '#3fd0ff')}
                emissiveIntensity={1.4}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}

      {/* power indicator */}
      <mesh position={[0.145, H * 0.16, D / 2 + 0.008]} material={ledMaterial('#7dff9f', 2.4)}>
        <sphereGeometry args={[0.0022, 8, 6]} />
      </mesh>

      {/* carry handle over the top, on real end brackets */}
      <mesh position={[0, H + 0.02, 0]} castShadow material={m.polymer}>
        <boxGeometry args={[0.19, 0.009, 0.024]} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <mesh key={s} position={[s * 0.095, H + 0.009, 0]} material={m.chassis}>
          <boxGeometry args={[0.012, 0.026, 0.02]} />
        </mesh>
      ))}

      {/* side ventilation */}
      {detail === 'high' &&
        ([-1, 1] as const).map((s) =>
          Array.from({ length: 6 }).map((_, i) => (
            <mesh
              key={`v${s}${i}`}
              position={[(s * W) / 2 + s * 0.0006, H * 0.35 + i * 0.016, -0.02]}
            >
              <boxGeometry args={[0.001, 0.006, 0.08]} />
              <meshStandardMaterial color="#050608" roughness={0.95} />
            </mesh>
          )),
        )}

      {/* feet, and the tilt bail folded under the front */}
      {([-1, 1] as const).map((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[(sx * (W - 0.05)) / 2, 0.005, (sz * (D - 0.04)) / 2]}
            material={m.polymer}
          >
            <cylinderGeometry args={[0.008, 0.009, 0.01, 10]} />
          </mesh>
        )),
      )}
      {detail === 'high' && (
        <mesh position={[0, 0.012, D / 2 - 0.03]} rotation={[0, 0, Math.PI / 2]} material={m.aluminium}>
          <cylinderGeometry args={[0.0025, 0.0025, W - 0.08, 8]} />
        </mesh>
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
  detail = 'high',
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  detail?: 'high' | 'low';
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
      <RoundedBox
        args={[W, H, D]}
        radius={0.004}
        smoothness={3}
        position={[0, H / 2, 0]}
        castShadow
        receiveShadow
        material={m.chassis}
      />
      <RoundedBox
        args={[W - 0.004, H - 0.006, 0.007]}
        radius={0.002}
        smoothness={2}
        position={[0, H / 2, D / 2 + 0.0005]}
        material={m.panel}
      />

      {/* The two readouts, recessed behind their filters. The filter is what
          makes a seven-segment display look like one: the unlit segments have
          to be nearly invisible, which is a dark sheet in front, not a dark
          colour behind. */}
      {([-0.045, 0.045] as const).map((x, i) => (
        <group key={x} position={[x, H * 0.72, D / 2 + 0.004]}>
          <mesh position={[0, 0, -0.0005]}>
            <boxGeometry args={[0.08, 0.034, 0.003]} />
            <meshStandardMaterial color="#05060a" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0, 0.0022]} material={i === 0 ? voltsMat : ampsMat}>
            <planeGeometry args={[0.072, 0.028]} />
          </mesh>
        </group>
      ))}

      {/* Coarse and fine controls: a knurled skirt, a moulded cap and a
          pointer flat, so the pair reads as coarse-and-fine rather than as two
          identical discs. */}
      {([-0.05, 0.05] as const).map((x, i) => (
        <group key={x} position={[x, H * 0.38, D / 2 + 0.006]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.chassis}>
            <cylinderGeometry args={[0.0175, 0.0175, 0.006, 24]} />
          </mesh>
          <mesh
            position={[0, 0, 0.007]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
            material={m.polymer}
          >
            <cylinderGeometry args={[0.0135 + i * 0.002, 0.0155, 0.016, 20]} />
          </mesh>
          <mesh position={[0, 0.009, 0.0155]}>
            <boxGeometry args={[0.0018, 0.008, 0.001]} />
            <meshStandardMaterial color="#dfe6ee" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* 4mm binding posts: a coloured collar on a hex body with the brass
          screw terminal in the middle */}
      {(
        [
          [-0.05, '#b8342b'],
          [0.05, '#141416'],
        ] as const
      ).map(([x, colour]) => (
        <group key={x} position={[x, H * 0.14, D / 2 + 0.004]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0075, 0.0075, 0.01, 6]} />
            <meshStandardMaterial color={colour} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.007]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0038, 0.0038, 0.006, 10]} />
            <meshStandardMaterial color="#a98b4a" roughness={0.34} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* rocker switch, lit on its live side */}
      <group position={[0.082, H * 0.14, D / 2 + 0.005]}>
        <mesh material={m.chassis}>
          <boxGeometry args={[0.019, 0.025, 0.005]} />
        </mesh>
        <mesh position={[0, -0.004, 0.0035]} rotation={[0.28, 0, 0]}>
          <boxGeometry args={[0.015, 0.019, 0.003]} />
          <meshStandardMaterial
            color="#180a08"
            emissive={new THREE.Color('#ff4a2a')}
            emissiveIntensity={1.5}
            toneMapped={false}
            roughness={0.4}
          />
        </mesh>
      </group>

      {/* ventilated top */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[0, H + 0.0005, -0.06 + i * 0.02]}>
          <boxGeometry args={[W * 0.7, 0.001, 0.006]} />
          <meshStandardMaterial color="#0b0c0e" roughness={0.9} />
        </mesh>
      ))}

      {/* Feet, and the mains inlet round the back with its lead running off
          the end of the bench — the same reasoning as the monitor cables: a
          bench supply that is not plugged into anything is a prop. */}
      {([-1, 1] as const).map((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[(sx * (W - 0.04)) / 2, 0.005, (sz * (D - 0.04)) / 2]}
            material={m.polymer}
          >
            <cylinderGeometry args={[0.007, 0.008, 0.01, 10]} />
          </mesh>
        )),
      )}
      {detail === 'high' && (
        <mesh position={[0.04, H * 0.3, -D / 2 - 0.004]} material={m.polymer}>
          <boxGeometry args={[0.026, 0.022, 0.008]} />
        </mesh>
      )}
    </group>
  );
}
