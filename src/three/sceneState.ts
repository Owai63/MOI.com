/** Mutable, allocation-free scene state shared between GSAP/DOM and the R3F
 *  render loop. Read inside useFrame; written by ScrollTrigger and pointer
 *  handlers. Kept out of React state to avoid re-renders in the 3D loop. */
export const sceneState = {
  /** normalised pointer, -1..1. */
  pointerX: 0,
  pointerY: 0,
  /** overall scroll progress 0..1 through the page. */
  progress: 0,
  /** true while the hero is in view (used to gate pointer influence). */
  heroVisible: true,
  /** Set when the render loop resumes after being parked, so the camera and
   *  every rig jump straight to their scroll-correct pose instead of damping
   *  in from wherever they were frozen. */
  snap: false,

  /* ---------------------------------------------------------------------
     WORKBENCH
     The bench is one continuous room the camera travels through. `station`
     is a floating index into the camera path (see bench/cameraPath.ts):
     0 = wide hero shot, 1..N = one push-in per work chapter, N+1 = the wide
     closing shot. Fractional values are interpolated, so scrolling reads as
     a single unbroken dolly rather than a set of cuts.
     ------------------------------------------------------------------- */
  /** floating camera-path index. */
  station: 0,
  /** index of the work chapter under the reader (-1 = none on the bench). */
  activeProject: -1,
  /** Which half of the viewport the device should occupy: +1 right, -1 left,
   *  0 centred. Work chapters alternate their text/visual columns, so the
   *  camera has to shift with them or the object lands under the copy. */
  frameBias: 0,
  /** Vertical companion to `frameBias`: +1 puts the device low in the frame,
   *  which is where the visual column goes once the chapter grid collapses to
   *  a single column on narrow screens. */
  frameBiasY: 0,
  /** 0..1 assembly of the active device: 0 = scattered/absent, 1 = built. */
  build: 0,
  /** 0..1 how "alive" the active device is — LEDs, motors, radio. */
  power: 0,

  /* ---------------------------------------------------------------------
     SOLO STAGES (case study)
     Which set the scene is dressed as. `bench` is the home page; the other
     two are case studies, where one subject is alone in frame and the page's
     scroll drives it directly rather than through chapter bands.
     ------------------------------------------------------------------- */
  stage: 'bench' as 'bench' | 'inspect' | 'range',
  /** true when a single device is on the inspection stage, bench hidden. */
  inspect: false,
  /** 0..1 exploded-view separation, scroll-driven on the case study page. */
  explode: 0,
  /** free-running turntable angle for the inspected device. */
  turntable: 0,

  /* ---------------------------------------------------------------------
     RANGE (shooting-range case study)
     The one case study that is a place rather than an object: a lane, a rail
     down it, and the target runner on the rail. Both of these are scrubbed
     straight off the page's scroll, so running the scroll backwards runs the
     machine backwards — which is the whole reason it reads as a mechanism
     and not as a video.
     ------------------------------------------------------------------- */
  /** floating index into bench/range/rangePath.ts. */
  rangeShot: 0,
  /** 0..1 position of the target runner along its rail — what the scroll
   *  asks for. */
  runner: 0,
  /** Where the carriage has actually damped to. Written by the scene, read by
   *  the camera: a tracking shot has to follow the carriage, not the
   *  instruction the carriage is still catching up with. */
  runnerAt: 0,
};

export type SceneState = typeof sceneState;

/** Reset the per-page fields when moving between the home page and a case
 *  study, so a route change never inherits the previous page's pose. */
export function resetSceneState(stage: 'bench' | 'inspect' | 'range') {
  const solo = stage !== 'bench';
  sceneState.stage = stage;
  sceneState.station = 0;
  sceneState.activeProject = -1;
  sceneState.frameBias = 0;
  sceneState.frameBiasY = 0;
  sceneState.build = solo ? 1 : 0;
  sceneState.power = solo ? 1 : 0;
  sceneState.inspect = stage === 'inspect';
  sceneState.explode = 0;
  sceneState.turntable = 0;
  sceneState.rangeShot = 0;
  sceneState.runner = 0;
  sceneState.runnerAt = 0;
  sceneState.progress = 0;
  sceneState.snap = true;
}

// dev-only: expose for debugging/automation; stripped from prod builds
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __sceneState?: SceneState }).__sceneState = sceneState;
}
