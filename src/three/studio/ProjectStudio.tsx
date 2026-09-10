import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { ProjectSlug } from '../../data/content';
import { getDeviceProfile } from '../../lib/quality';
import { usePrefersReducedMotion } from '../../lib/useMediaQuery';
import { useT } from '../../i18n/useContent';
import { ProjectVisual } from '../../components/visuals/ProjectVisual';
import { SceneFallback } from '../SceneFallback';
import { studios, stepAt } from './catalog';
import styles from './ProjectStudio.module.scss';

const StudioCanvas = lazy(() => import('./StudioCanvas').then(m => ({ default: m.StudioCanvas })));

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function useStudioVisibility(home = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(home);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const targets = home ? Array.from(document.querySelectorAll('[data-scene-window]')) : [element];
    const seen = new Set<Element>();
    let inView = false;
    const visibility = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? seen.add(entry.target) : seen.delete(entry.target));
      inView = seen.size > 0;
      visibility();
    });
    targets.forEach(target => observer.observe(target));
    const preload = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setNear(true); preload.disconnect(); }
    }, { rootMargin: '300px' });
    preload.observe(element);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); preload.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, [home]);
  return { ref, near, visible };
}

export function ProjectStudio({ slug }: { slug: ProjectSlug }) {
  const t = useT();
  const spec = studios[slug];
  const reduced = usePrefersReducedMotion();
  const profile = useMemo(getDeviceProfile, []);
  const { ref, near, visible } = useStudioVisibility();
  const initial = slug === 'gesture-car' ? 0.5 : slug === 'fsm-traffic' ? 0.4 : 0;
  const [value, setValue] = useState(initial);
  const [running, setRunning] = useState(!reduced);
  const [autoRotate, setAutoRotate] = useState(false);
  const [view, setView] = useState<'perspective' | 'front' | 'top'>('perspective');
  const [reset, setReset] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [enabled, setEnabled] = useState(profile.tier !== 'low');
  useEffect(() => { if (reduced) { setRunning(false); setAutoRotate(false); } }, [reduced]);
  const available = profile.webgl && enabled && !failed;
  const fallback = <div className={styles.fallback}><ProjectVisual slug={slug} />
    <p className={styles.fallbackNote}>{t(failed ? 'The 3D view could not load. You can still explore the project below.' : available ? 'Preparing the interactive view…' : 'Project illustration. The full case study is available below.')}</p>
  </div>;
  const resetAll = () => { setValue(initial); setZoom(1); setView('perspective'); setAutoRotate(false); setReset(n => n + 1); };
  return <div ref={ref} className={styles.studio} style={{ '--studio-accent': spec.accent } as CSSProperties} aria-label={t('Interactive project demonstration')}>
    <div className={styles.header}>
      <div><span className={styles.eyebrow}>{t('Explore in 3D')}</span><h2 className={styles.title}>{t(spec.title)}</h2></div>
      <span className={styles.concept}>{t('Conceptual demonstration')}</span>
    </div>
    <div className={styles.viewport}>
      {near && available ? <SceneBoundary key={retry} fallback={fallback} onError={() => setFailed(true)}>
        <Suspense fallback={fallback}>
          <div className={styles.canvas} onContextMenu={e => e.preventDefault()}>
            <StudioCanvas slug={slug} profile={profile} visible={visible} running={running} value={value}
              autoRotate={autoRotate} view={view} reset={reset} zoom={zoom} onFailure={() => setFailed(true)} />
          </div>
        </Suspense>
      </SceneBoundary> : fallback}
      {available && <>
        <div className={styles.views} aria-label={t('Camera view')}>
          {(['perspective', 'front', 'top'] as const).map(v => <button key={v} className={styles.button} aria-pressed={view === v} onClick={() => { setView(v); setReset(n => n + 1); }}>{t(v === 'perspective' ? 'Perspective' : v === 'front' ? 'Front' : 'Top')}</button>)}
          <button className={styles.button} aria-label={t('Zoom in')} disabled={zoom >= 1.4} onClick={() => setZoom(z => Math.min(1.4, z + 0.15))}>+</button>
          <button className={styles.button} aria-label={t('Zoom out')} disabled={zoom <= 0.7} onClick={() => setZoom(z => Math.max(0.7, z - 0.15))}>−</button>
        </div>
        <p className={styles.hint}>{t('Drag to rotate · Use view buttons to explore')}</p>
      </>}
    </div>
    <div className={styles.controls}>
      <p className={styles.description}>{t(spec.description)}</p>
      {available ? <div className={styles.controlRow}>
        <label className={styles.slider}>
          <span className={styles.sliderLabel}>{t(spec.control)}<output className={styles.output}>{t(spec.steps[stepAt(value, spec.steps)])}</output></span>
          <input className={styles.range} type="range" min="0" max="1" step="0.01" value={value}
            aria-valuetext={t(spec.steps[stepAt(value, spec.steps)])} onChange={e => setValue(Number(e.target.value))} />
        </label>
        <div className={styles.actions}>
          <button className={styles.button} aria-pressed={running} onClick={() => setRunning(v => !v)}>{t(running ? 'Pause motion' : 'Play motion')}</button>
          <button className={styles.button} aria-pressed={autoRotate} onClick={() => { setAutoRotate(v => !v); if (!autoRotate) setRunning(true); }}>{t('Auto-rotate')}</button>
          <button className={styles.button} onClick={resetAll}>{t('Reset view')}</button>
        </div>
      </div> : profile.webgl && <button className={styles.button} onClick={() => { setFailed(false); setEnabled(true); setRetry(n => n + 1); }}>{t(failed ? 'Retry 3D view' : 'Load interactive 3D')}</button>}
      <div className={styles.labels}>{spec.labels.map(label => <span key={label}>{t(label)}</span>)}</div>
    </div>
  </div>;
}

export function HomeStudio() {
  const profile = useMemo(getDeviceProfile, []);
  const reduced = usePrefersReducedMotion();
  const { ref, near, visible } = useStudioVisibility(true);
  const [failed, setFailed] = useState(false);
  if (!profile.webgl || profile.tier === 'low' || reduced || failed) return <SceneFallback />;
  return <div ref={ref} className={styles.home} aria-hidden="true">
    {near && <SceneBoundary fallback={null} onError={() => setFailed(true)}>
      <Suspense fallback={null}><StudioCanvas home profile={profile} visible={visible} running={!reduced}
        value={0} autoRotate={false} view="perspective" reset={0} onFailure={() => setFailed(true)} /></Suspense>
    </SceneBoundary>}
  </div>;
}
