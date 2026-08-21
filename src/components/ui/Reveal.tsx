import { type ReactNode } from 'react';
import { useReveal } from '../../lib/useReveal';
import styles from './ui.module.scss';

interface Props {
  children: ReactNode;
  as?: 'div' | 'li' | 'ul' | 'ol' | 'section' | 'article' | 'header';
  delay?: number;
  className?: string;
}

/** Fade-and-rise on scroll into view. Reduced-motion users get it instantly
 *  (handled inside useReveal). */
export function Reveal({ children, as = 'div', delay = 0, className }: Props) {
  const { ref, inView } = useReveal<HTMLDivElement>();
  const Tag = as as 'div';
  return (
    <Tag
      ref={ref}
      className={`${styles.reveal} ${inView ? styles.in : ''} ${className ?? ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
