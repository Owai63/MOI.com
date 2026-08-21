import { useUi } from '../i18n/useContent';

export function RouteFallback() {
  const ui = useUi();
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg)',
        color: 'var(--text-mute)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem',
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
      }}
    >
      {ui.loading}
    </div>
  );
}
