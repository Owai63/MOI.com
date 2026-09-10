import { useRef, useState } from 'react';
import { useT } from '../../i18n/useContent';
import type { ProjectSlug } from '../../data/content';
import { studios, stepAt } from '../studio/catalog';
import { sceneControls, resetSceneControls } from './interaction';
import styles from './SceneControls.module.scss';

/** DOM controls sit over the real full-screen scene; they never replace it. */
export function SceneControls({ slug, range = false }: { slug: ProjectSlug; range?: boolean }) {
  const t = useT();
  const spec = studios[slug];
  const [manual, setManual] = useState(false);
  const [value, setValue] = useState(slug === 'gesture-car' ? 0.5 : 0);
  const [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const release = () => { drag.current = null; };
  const reset = () => {
    resetSceneControls(); setManual(false); setAuto(true); setPaused(false); setZoom(1);
  };
  return <div className={`${styles.explorer} ${range ? styles.range : ''}`}>
    {!range && <div className={styles.drag} role="group" aria-label={t('Drag to rotate the model')} tabIndex={0}
      onPointerDown={e => { if (e.button !== 0) return; drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); sceneControls.autoRotate = false; setAuto(false); }}
      onPointerMove={e => {
        const at = drag.current; if (!at || at.id !== e.pointerId) return;
        sceneControls.yaw += (e.clientX - at.x) * 0.006;
        sceneControls.pitch = Math.max(-0.6, Math.min(0.6, sceneControls.pitch + (e.clientY - at.y) * 0.004));
        at.x = e.clientX; at.y = e.clientY;
      }} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
      onKeyDown={e => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault(); sceneControls.autoRotate = false; setAuto(false);
        if (e.key === 'ArrowLeft') sceneControls.yaw -= 0.15;
        if (e.key === 'ArrowRight') sceneControls.yaw += 0.15;
        if (e.key === 'ArrowUp') sceneControls.pitch = Math.max(-0.6, sceneControls.pitch - 0.1);
        if (e.key === 'ArrowDown') sceneControls.pitch = Math.min(0.6, sceneControls.pitch + 0.1);
      }}><span>{t('Drag to rotate · Arrow keys also work')}</span></div>}
    <div className={styles.panel}>
      <label className={styles.slider}>
        <span>{t(spec.control)}<output>{manual ? t(spec.steps[stepAt(value, spec.steps)]) : t('Following your scroll')}</output></span>
        <input type="range" min="0" max="1" step="0.01" value={value}
          aria-valuetext={manual ? t(spec.steps[stepAt(value, spec.steps)]) : t('Following your scroll')}
          onChange={e => { const v = Number(e.target.value); setValue(v); setManual(true); if (range) sceneControls.runner = v; else sceneControls.demoValue = v; }} />
      </label>
      <div className={styles.buttons}>
        {!range && <button aria-pressed={auto} onClick={() => { sceneControls.autoRotate = !auto; setAuto(!auto); }}>{t('Auto-rotate')}</button>}
        <button aria-pressed={paused} onClick={() => { sceneControls.paused = !paused; setPaused(!paused); }}>{t(paused ? 'Play motion' : 'Pause motion')}</button>
        <button disabled={zoom >= 1.3} aria-label={t('Zoom in')} onClick={() => { const v = Math.min(1.3, zoom + 0.1); setZoom(v); sceneControls.zoom = v; }}>+</button>
        <button disabled={zoom <= 0.8} aria-label={t('Zoom out')} onClick={() => { const v = Math.max(0.8, zoom - 0.1); setZoom(v); sceneControls.zoom = v; }}>−</button>
        <button onClick={reset}>{t('Follow scroll')}</button>
      </div>
    </div>
  </div>;
}
