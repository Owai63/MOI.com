import { useUi } from '../../i18n/useContent';
import styles from './ui.module.scss';

export function TagList({ items, label }: { items: string[]; label?: string }) {
  const ui = useUi();
  if (!items.length) return null;
  return (
    <ul className={styles.tags} aria-label={label ?? ui.technologies}>
      {/* data-latin keeps stacks like "C/C++" or "LTE-M / NB-IoT" in LTR order
          when the page is in Arabic — see the RTL block in global.scss. It is
          applied per tag, because translated tags are Arabic and must not be
          forced LTR. */}
      {items.map((t) => (
        <li key={t} className={styles.tag} data-latin={isLatin(t) || undefined}>
          {t}
        </li>
      ))}
    </ul>
  );
}

/** A tag is "Latin" when it carries no Arabic letters — an acronym or stack
 *  string the translator deliberately left in Latin script. */
function isLatin(tag: string): boolean {
  return !/[\u0600-\u06FF]/.test(tag);
}
