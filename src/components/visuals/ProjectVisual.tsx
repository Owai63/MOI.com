import type { ProjectSlug } from '../../data/content';
import { IMAGE_VISUALS } from '../../data/projectVisuals';
import { asset } from '../../lib/asset';
import { useLang, useT, useUi } from '../../i18n/useContent';
import styles from './ProjectVisual.module.scss';

export function ProjectVisual({ slug }: { slug: ProjectSlug }) {
  const t = useT();
  const image = IMAGE_VISUALS[slug];

  if (image) {
    return (
      <div className={styles.wrap}>
        <img
          className={styles.photo}
          src={asset(image.src)}
          alt={t(image.alt)}
          loading="lazy"
          decoding="async"
          style={{ objectPosition: image.position ?? '50% 50%' }}
        />
        <span className={styles.photoShade} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={styles.wrap} aria-hidden="true">
      {VISUALS[slug] ?? genericVisual(slug)}
    </div>
  );
}

/* Deterministic pseudo-random spread (0..1) from a slug — no Math.random so
 * server/client and re-renders stay identical. */
function seeded(slug: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

/** Generic node/pulse visual for projects without bespoke SVG art — a plain,
 *  honestly-abstract diagram rather than a fabricated screenshot. */
function genericVisual(slug: string) {
  const nodes: [number, number][] = [
    [130, 100], [470, 90], [110, 300], [490, 300], [300, 340],
  ];
  return (
    <svg {...svgProps}>
      {nodes.map(([x, y], i) => (
        <line key={i} x1="300" y1="200" x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />
      ))}
      {nodes.map(([x, y], i) => (
        <circle
          key={`p${i}`}
          r="3"
          fill={i % 2 === 0 ? 'var(--cyan-bright)' : 'var(--amber)'}
          className={styles.packet}
        >
          <animateMotion
            dur={`${2.6 + seeded(slug, i + 1) * 2}s`}
            repeatCount="indefinite"
            begin={`${seeded(slug, i + 7) * 2}s`}
            path={`M300 200 L${x} ${y}`}
          />
        </circle>
      ))}
      {nodes.map(([x, y], i) => (
        <rect
          key={`n${i}`}
          x={x - 12}
          y={y - 10}
          width="24"
          height="20"
          rx="3"
          fill="#0b1015"
          stroke="var(--line)"
          strokeWidth="1"
        />
      ))}
      <rect x="266" y="172" width="68" height="56" rx="8" fill="#0d1319" stroke="var(--cyan-dim)" strokeWidth="1.4" />
      <rect x="280" y="188" width="40" height="4" rx="2" fill="var(--cyan-dim)" />
      <rect x="280" y="200" width="28" height="4" rx="2" fill="var(--line)" />
      <circle cx="300" cy="200" r="40" fill="none" stroke="var(--cyan-glow)" strokeWidth="1" className={styles.pulseRing} />
    </svg>
  );
}

const svgProps = {
  viewBox: '0 0 600 400',
  preserveAspectRatio: 'xMidYMid slice',
  className: styles.svg,
} as const;

// Layout constants (declared before VISUALS — JSX below evaluates eagerly).
const NODES: [number, number][] = [
  [110, 90], [470, 90], [120, 310], [480, 310], [300, 60], [300, 340],
];
const LIFE_STAGES: [number, number][] = [
  [60, 320], [140, 200], [230, 120], [300, 90], [370, 120], [460, 200], [540, 320],
];
const CORNERS: [number, number, number, number][] = [
  [40, 40, 1, 1], [560, 40, -1, 1], [40, 360, 1, -1], [560, 360, -1, -1],
];
/** The "conceptual" watermark on the illustrative visuals. A component (not a
 *  bare <text>) so it can read the localized label — letter-spacing is dropped
 *  in Arabic, where it would break the cursive joining of the script. */
function OverlayLabel() {
  const ui = useUi();
  const { lang } = useLang();
  return (
    <text
      x="46"
      y="30"
      fill="var(--text-mute)"
      fontFamily="var(--font-mono)"
      fontSize="11"
      letterSpacing={lang === 'ar' ? undefined : 2}
    >
      {ui.conceptualOverlay}
    </text>
  );
}

const FIGURES: [number, number][] = [[150, 0.8], [230, 1], [430, 0.7], [480, 0.9]];

const VISUALS: Partial<Record<ProjectSlug, JSX.Element>> = {
  /* MYMO2 — night route network + live vehicle + geofence */
  mymo2: (
    <svg {...svgProps}>
      <g className={styles.faint} stroke="var(--line)" strokeWidth="1" fill="none">
        <path d="M40 300 H560" />
        <path d="M120 60 V360" />
        <path d="M300 40 V370" />
        <path d="M460 80 V340" />
        <path d="M60 160 H540" />
        <path d="M80 230 H520" />
      </g>
      {/* geofence */}
      <circle
        className={styles.geofence}
        cx="300"
        cy="210"
        r="120"
        fill="none"
        stroke="var(--amber-dim)"
        strokeWidth="1.2"
        strokeDasharray="4 8"
      />
      {/* live cyan route */}
      <path
        className={styles.route}
        d="M90 320 L120 230 L300 210 L300 120 L460 120"
        fill="none"
        stroke="var(--cyan)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className={styles.routeGlow}
        d="M90 320 L120 230 L300 210 L300 120 L460 120"
        fill="none"
        stroke="var(--cyan)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* moving vehicle marker */}
      <circle className={styles.vehicle} r="5" fill="var(--cyan-bright)">
        <animateMotion
          dur="6s"
          repeatCount="indefinite"
          path="M90 320 L120 230 L300 210 L300 120 L460 120"
        />
      </circle>
      <circle cx="460" cy="120" r="4" fill="none" stroke="var(--cyan)" strokeWidth="1.5" />
      <circle cx="90" cy="320" r="3" fill="var(--amber)" />
    </svg>
  ),

  /* Shooting range — precision rail, carrier, RF, amber motion */
  'shooting-range': (
    <svg {...svgProps}>
      {/* rail */}
      <line x1="70" y1="230" x2="540" y2="230" stroke="var(--line)" strokeWidth="2" />
      <line x1="70" y1="238" x2="540" y2="238" stroke="var(--line-soft)" strokeWidth="1" />
      {[110, 200, 290, 380, 470].map((x) => (
        <line key={x} x1={x} y1="226" x2={x} y2="242" stroke="var(--text-mute)" strokeWidth="1" />
      ))}
      {/* amber motion trail */}
      <line
        className={styles.motionTrail}
        x1="110"
        y1="222"
        x2="470"
        y2="222"
        stroke="var(--amber)"
        strokeWidth="2"
        strokeDasharray="14 10"
      />
      {/* carrier */}
      <g className={styles.carrier}>
        <rect x="-16" y="200" width="32" height="24" rx="3" fill="#0c1116" stroke="var(--amber-dim)" strokeWidth="1.2" />
        <rect x="-3" y="150" width="6" height="52" fill="var(--text-mute)" />
        <circle cx="0" cy="146" r="7" fill="none" stroke="var(--amber)" strokeWidth="1.5" />
      </g>
      {/* RF base + waves */}
      <g transform="translate(300 320)">
        <rect x="-10" y="0" width="20" height="16" rx="2" fill="#0c1116" stroke="var(--cyan-dim)" strokeWidth="1" />
        {[18, 34, 50].map((r, i) => (
          <path
            key={r}
            className={styles.rf}
            style={{ ['--d']: `${i * 0.4}s` }}
            d={`M ${-r * 0.7} -${r * 0.2} A ${r} ${r} 0 0 1 ${r * 0.7} -${r * 0.2}`}
            fill="none"
            stroke="var(--cyan)"
            strokeWidth="1.2"
          />
        ))}
      </g>
      {/* state indicators */}
      {['var(--cyan)', 'var(--cyan)', 'var(--amber)'].map((c, i) => (
        <circle key={i} cx={470 + i * 16} cy="60" r="3.5" fill={c} className={styles.blink} style={{ ['--d']: `${i * 0.5}s` }} />
      ))}
    </svg>
  ),

  /* Device management — central node + device network + version flow */
  'device-management': (
    <svg {...svgProps}>
      {NODES.map(([x, y], i) => (
        <line key={i} x1="300" y1="200" x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />
      ))}
      {NODES.map(([x, y], i) => (
        <circle
          key={`p${i}`}
          r="3"
          fill={i === 3 ? 'var(--amber)' : 'var(--cyan-bright)'}
          className={styles.packet}
          style={{ '--d': `${i * 0.6}s` }}
        >
          <animateMotion dur="3s" repeatCount="indefinite" begin={`${i * 0.4}s`} path={`M300 200 L${x} ${y}`} />
        </circle>
      ))}
      {NODES.map(([x, y], i) => (
        <g key={`n${i}`}>
          <rect x={x - 14} y={y - 11} width="28" height="22" rx="3" fill="#0b1015" stroke={i === 3 ? 'var(--amber-dim)' : 'var(--line)'} strokeWidth="1" />
          <circle cx={x} cy={y} r="2.5" fill={i === 3 ? 'var(--amber)' : 'var(--cyan)'} />
        </g>
      ))}
      {/* central control node */}
      <rect x="262" y="168" width="76" height="64" rx="8" fill="#0d1319" stroke="var(--cyan-dim)" strokeWidth="1.4" />
      <rect x="276" y="184" width="48" height="4" rx="2" fill="var(--cyan-dim)" />
      <rect x="276" y="196" width="34" height="4" rx="2" fill="var(--line)" />
      <rect x="276" y="208" width="40" height="4" rx="2" fill="var(--line)" />
      <circle cx="300" cy="200" r="46" fill="none" stroke="var(--cyan-glow)" strokeWidth="1" className={styles.pulseRing} />
    </svg>
  ),

  /* Lifecycle database — staged path with milestones */
  'lifecycle-database': (
    <svg {...svgProps}>
      <path
        className={styles.lifePath}
        d="M60 320 C 180 320 160 90 300 90 C 440 90 420 320 540 320"
        fill="none"
        stroke="var(--cyan-dim)"
        strokeWidth="1.6"
        strokeDasharray="3 6"
      />
      {LIFE_STAGES.map((p, i) => (
        <g key={i} className={styles.stage} style={{ ['--d']: `${i * 0.25}s` }}>
          <circle cx={p[0]} cy={p[1]} r="6" fill="#0b1015" stroke={i % 3 === 2 ? 'var(--amber)' : 'var(--cyan)'} strokeWidth="1.5" />
          <circle cx={p[0]} cy={p[1]} r="2" fill={i % 3 === 2 ? 'var(--amber)' : 'var(--cyan)'} />
          <line x1={p[0]} y1={p[1] - 10} x2={p[0]} y2={p[1] - 22} stroke="var(--line)" strokeWidth="1" />
        </g>
      ))}
      <circle className={styles.tracer} r="4" fill="var(--cyan-bright)">
        <animateMotion dur="7s" repeatCount="indefinite" path="M60 320 C 180 320 160 90 300 90 C 440 90 420 320 540 320" />
      </circle>
    </svg>
  ),

  /* Violence detection — conceptual CCTV frame with illustrative overlay */
  'violence-detection': (
    <svg {...svgProps}>
      <rect x="40" y="40" width="520" height="320" fill="#070a0d" />
      {/* corner brackets */}
      {CORNERS.map(([x, y, sx, sy], i) => (
        <path key={i} d={`M${x} ${y + sy * 22} V${y} H${x + sx * 22}`} fill="none" stroke="var(--cyan-dim)" strokeWidth="1.5" />
      ))}
      {/* abstract distant figures (non-graphic) */}
      {FIGURES.map(([x, s], i) => (
        <g key={i} transform={`translate(${x} ${300 - s * 30}) scale(${s})`} fill="var(--text-mute)" opacity="0.5">
          <circle cx="0" cy="0" r="7" />
          <rect x="-6" y="8" width="12" height="26" rx="5" />
        </g>
      ))}
      {/* illustrative detection region */}
      <rect className={styles.detect} x="250" y="200" width="120" height="120" fill="none" stroke="var(--amber)" strokeWidth="1.6" strokeDasharray="6 5" />
      <rect x="250" y="184" width="70" height="14" fill="var(--amber)" opacity="0.85" />
      {/* timeline */}
      <line x1="60" y1="342" x2="540" y2="342" stroke="var(--line)" strokeWidth="2" />
      <rect className={styles.timeMarker} x="60" y="338" width="6" height="8" fill="var(--cyan-bright)" />
      <OverlayLabel />
    </svg>
  ),

  /* Wheelchair — EEG → classify → move */
  wheelchair: (
    <svg {...svgProps}>
      <path
        className={styles.eeg}
        d="M40 160 L90 160 L110 110 L130 210 L150 130 L170 190 L200 160 L260 160"
        fill="none"
        stroke="var(--cyan)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line x1="40" y1="160" x2="260" y2="160" stroke="var(--line)" strokeWidth="1" opacity="0.4" />
      {/* classifier */}
      <g transform="translate(300 160)">
        <rect x="-34" y="-34" width="68" height="68" rx="10" fill="#0d1319" stroke="var(--cyan-dim)" strokeWidth="1.4" />
        <circle cx="0" cy="0" r="14" fill="none" stroke="var(--cyan)" strokeWidth="1.5" className={styles.pulseRing} />
        <circle cx="0" cy="0" r="4" fill="var(--cyan-bright)" />
      </g>
      <line x1="266" y1="160" x2="266" y2="160" stroke="var(--cyan)" strokeWidth="2" />
      {/* directional outputs */}
      {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy], i) => (
        <g key={i} transform={`translate(${420 + dx * 40} ${230 + dy * 40})`} className={styles.dir} style={{ ['--d']: `${i * 0.4}s` }}>
          <path d="M0 -8 L8 8 L0 3 L-8 8 Z" fill={i === 2 ? 'var(--amber)' : 'var(--cyan)'} transform={`rotate(${dx === -1 ? -90 : dx === 1 ? 90 : dy === 1 ? 180 : 0})`} />
        </g>
      ))}
      <line x1="334" y1="160" x2="400" y2="200" stroke="var(--line)" strokeWidth="1" />
    </svg>
  ),
};
