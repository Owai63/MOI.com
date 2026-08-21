import { useContent, useCopy } from '../../i18n/useContent';
import styles from './Footer.module.scss';

export function Footer() {
  const { profile } = useContent();
  const copy = useCopy();
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer} data-monolith-window>
      <div className={`container ${styles.inner}`}>
        <div className={styles.left}>
          <span className={styles.mark} aria-hidden="true" />
          <span>© {year} {profile.fullName}</span>
        </div>
        <div className={styles.mid}>{profile.title} · {profile.location}</div>
        <a href="#top" className={styles.top}>
          {copy.footer.backToTop}
        </a>
      </div>
    </footer>
  );
}
