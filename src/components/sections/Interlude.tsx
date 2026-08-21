import styles from './Interlude.module.scss';

/** Transparent breathing band that lets the fixed monolith show through and
 *  act as the transition device between major sections. Decorative label only;
 *  no essential content lives here. */
export function Interlude({
  id,
  label,
  align = 'left',
}: {
  id?: string;
  label: string;
  align?: 'left' | 'right';
}) {
  return (
    <div className={styles.interlude} id={id} aria-hidden="true" data-scene-window>
      <div className={`container ${styles.inner} ${align === 'right' ? styles.right : ''}`}>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}
