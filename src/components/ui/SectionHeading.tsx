import styles from './ui.module.scss';

interface Props {
  index: string;
  eyebrow: string;
  title: string;
  id?: string;
}

export function SectionHeading({ index, eyebrow, title, id }: Props) {
  return (
    <header className={styles.heading}>
      <div className={styles.headingMeta}>
        <span className={styles.headingNum}>{index}</span>
        <span className="eyebrow">{eyebrow}</span>
      </div>
      <h2 id={id} className={styles.headingTitle}>
        {title}
      </h2>
    </header>
  );
}
