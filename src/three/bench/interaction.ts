/** Interaction overlays augment the authored scroll choreography. A null
 * override always hands the scene back to its original scroll signal. */
export const sceneControls = {
  autoRotate: true,
  paused: false,
  yaw: 0,
  pitch: 0,
  zoom: 1,
  demoValue: null as number | null,
  demoCurrent: 0,
  runner: null as number | null,
};

export const inspectionValue = (scrollValue: number) => sceneControls.demoValue === null ? scrollValue : sceneControls.demoCurrent;

/** Manual sliders settle through the same frame clock as the camera. */
export function advanceInspection(delta: number, scrollValue: number) {
  if (sceneControls.demoValue === null) sceneControls.demoCurrent = scrollValue;
  else sceneControls.demoCurrent += (sceneControls.demoValue - sceneControls.demoCurrent) * (1 - Math.exp(-10 * Math.min(delta, 0.1)));
}

export function resetSceneControls() {
  sceneControls.autoRotate = true;
  sceneControls.paused = false;
  sceneControls.yaw = 0;
  sceneControls.pitch = 0;
  sceneControls.zoom = 1;
  sceneControls.demoValue = null;
  sceneControls.demoCurrent = 0;
  sceneControls.runner = null;
}
