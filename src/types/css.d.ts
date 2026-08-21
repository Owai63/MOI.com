import 'react';

// Allow CSS custom properties (--foo) on inline style objects.
declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
