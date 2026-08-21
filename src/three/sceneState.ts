/** Mutable, allocation-free scene state shared between GSAP/DOM and the R3F
 *  render loop. Read inside useFrame; written by ScrollTrigger and pointer
 *  handlers. Kept out of React state to avoid re-renders in the 3D loop. */
export const sceneState = {
  /** 0 = monolith closed, 1 = fully separated (driven by scroll). */
  separation: 0,
  /** which project layer is emphasised (-1 = none). */
  activeLayer: -1,
  /** normalised pointer, -1..1. */
  pointerX: 0,
  pointerY: 0,
  /** overall scroll progress 0..1 through the page. */
  progress: 0,
  /** true while the hero is in view (used to gate pointer influence). */
  heroVisible: true,
  /** render-on-demand flag: true when something is animating. */
  needsRender: true,
  /** Set when the render loop resumes after being parked, so the camera and
   *  slabs jump straight to their scroll-correct pose instead of damping in
   *  from wherever they were frozen. */
  snap: false,
};

export type SceneState = typeof sceneState;

// dev-only: expose for debugging/automation; stripped from prod builds
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __sceneState?: SceneState }).__sceneState = sceneState;
}
