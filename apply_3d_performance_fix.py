#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()

def read(rel):
    p = ROOT / rel
    if not p.exists():
        raise FileNotFoundError(f"Missing: {p}")
    return p, p.read_text(encoding="utf-8")

def backup(p):
    b = p.with_suffix(p.suffix + ".before-3d-fix")
    if not b.exists():
        shutil.copy2(p, b)

def replace_exact(rel, old, new, count=1):
    p, s = read(rel)
    if old not in s:
        raise RuntimeError(f"Expected source block not found in {rel}. Project version may differ.")
    backup(p)
    p.write_text(s.replace(old, new, count), encoding="utf-8")
    print(f"patched  {rel}")

def replace_all(rel, old, new):
    p, s = read(rel)
    n = s.count(old)
    if n == 0:
        raise RuntimeError(f"Expected source text not found in {rel}. Project version may differ.")
    backup(p)
    p.write_text(s.replace(old, new), encoding="utf-8")
    print(f"patched  {rel} ({n} replacements)")

quality = """\
/** Device performance tiering + WebGL capability detection.
 *  Drives adaptive quality for the 3D scene and the no-WebGL fallback. */

export type QualityTier = 'high' | 'medium' | 'low';

export interface DeviceProfile {
  tier: QualityTier;
  webgl: boolean;
  dpr: [number, number];
  postprocessing: boolean;
  antialias: boolean;
}

let cached: DeviceProfile | null = null;

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function getDeviceProfile(): DeviceProfile {
  if (cached) return cached;

  const webgl = detectWebGL();
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const narrow = window.innerWidth < 900;
  const saveData =
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData === true;

  // CPU count is only a weak proxy for WebGL/GPU throughput.
  let tier: QualityTier = 'medium';
  if (!webgl || saveData || cores <= 2 || mem <= 2) {
    tier = 'low';
  } else if (!coarse && !narrow && cores >= 8 && mem >= 8) {
    tier = 'high';
  }

  // DPR cost is roughly quadratic. Keep the full-screen canvas crisp without
  // letting retina/high-density displays multiply fragment work excessively.
  const dpr: [number, number] =
    tier === 'low'
      ? [1, 1]
      : coarse
        ? [1, 1.05]
        : tier === 'high'
          ? [1, 1.35]
          : [1, 1.15];

  // The post chain is several full-screen passes. Restrict it to strong,
  // reasonably sized desktop framebuffers.
  const postprocessing =
    tier === 'high' &&
    window.innerWidth <= 1600 &&
    window.devicePixelRatio <= 1.5;

  cached = {
    tier,
    webgl,
    dpr,
    postprocessing,
    antialias: tier === 'high' && !coarse && !postprocessing,
  };
  return cached;
}
"""

p, _ = read("src/lib/quality.ts")
backup(p)
p.write_text(quality, encoding="utf-8")
print("patched  src/lib/quality.ts")

# Remove stacked input lag.
replace_exact("src/lib/useLenis.ts", "      duration: 1.1,", "      duration: 0.62,")
replace_exact("src/lib/useLenis.ts", "      touchMultiplier: 1.6,", "      touchMultiplier: 1.25,")
replace_exact("src/lib/useBenchScroll.ts", "          scrub: 0.9,", "          scrub: 0.18,")
replace_exact("src/lib/useBenchScroll.ts", "          scrub: 0.7,", "          scrub: 0.16,")

# Tighten camera tracking.
replace_exact(
    "src/three/bench/BenchCanvas.tsx",
    "    const omega = mode === 'range' ? 11 : mode === 'inspect' ? 9 : 6.4;",
    "    const omega = mode === 'range' ? 16 : mode === 'inspect' ? 14 : 10;"
)

# Reduce shadow/environment/full-screen render cost.
replace_all(
    "src/three/bench/BenchCanvas.tsx",
    "shadow-mapSize={[2048, 2048]}",
    "shadow-mapSize={[1024, 1024]}"
)
replace_exact(
    "src/three/bench/BenchCanvas.tsx",
    "shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]}",
    "shadow-mapSize={[1024, 1024]}"
)
replace_all(
    "src/three/bench/BenchCanvas.tsx",
    "resolution={quality === 'high' ? 256 : 64}",
    "resolution={quality === 'high' ? 128 : 64}"
)
replace_exact(
    "src/three/bench/BenchCanvas.tsx",
    "            resolution={q === 'high' ? 512 : 256}",
    "            resolution={256}"
)
replace_exact(
    "src/three/bench/BenchCanvas.tsx",
    "      <EffectComposer multisampling={2}>",
    "      <EffectComposer multisampling={0}>"
)

# Tighten device assembly response.
replace_exact(
    "src/three/bench/assembly.ts",
    "      : THREE.MathUtils.damp(live.current, targetBuild, 3.2, d);",
    "      : THREE.MathUtils.damp(live.current, targetBuild, 7.5, d);"
)

old_opacity = """\
function applyOpacity(root: THREE.Object3D, opacity: number) {
  if (opacity >= 0.999) {
    root.traverse(setOpaque);
    return;
  }
  fadeTarget = opacity;
  root.traverse(setFaded);
}

let fadeTarget = 1;"""

new_opacity = """\
const lastOpacity = new WeakMap<THREE.Object3D, number>();

function applyOpacity(root: THREE.Object3D, opacity: number) {
  // Avoid traversing a part's entire subtree every frame when its visual
  // opacity has not meaningfully changed.
  const next = opacity >= 0.999 ? 1 : Math.round(opacity * 100) / 100;
  if (lastOpacity.get(root) === next) return;
  lastOpacity.set(root, next);

  if (next === 1) {
    root.traverse(setOpaque);
    return;
  }
  fadeTarget = next;
  root.traverse(setFaded);
}

let fadeTarget = 1;"""

replace_exact("src/three/bench/assembly.ts", old_opacity, new_opacity)

print()
print("3D performance patch applied successfully.")
print("Backups use the suffix .before-3d-fix")
print("Run: npm run typecheck && npm run build")
