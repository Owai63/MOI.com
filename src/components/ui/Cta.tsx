import { useRef, type ReactNode } from 'react';
import { usePrefersReducedMotion, useIsCoarsePointer } from '../../lib/useMediaQuery';
import styles from './ui.module.scss';

interface Props {
  children: ReactNode;
  href: string;
  variant?: 'primary' | 'ghost';
  external?: boolean;
  onClick?: () => void;
}

/** Magnetic pill button. Magnetism disabled for reduced-motion / touch. */
export function Cta({ children, href, variant = 'primary', external, onClick }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = usePrefersReducedMotion();
  const coarse = useIsCoarsePointer();
  const magnetic = !reduced && !coarse;

  const onMove = (e: React.MouseEvent) => {
    if (!magnetic || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) * 0.2;
    const dy = (e.clientY - r.top - r.height / 2) * 0.2;
    ref.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <a
      ref={ref}
      href={href}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={`${styles.cta} ${variant === 'ghost' ? styles.ctaGhost : styles.ctaPrimary}`}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span>{children}</span>
    </a>
  );
}
