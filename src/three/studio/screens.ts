import * as THREE from 'three';
import type { ProjectSlug } from '../../data/content';
import { studios } from './catalog';

/** Small, static screen textures. Redrawn only when the selected page changes. */
export function makeScreen(slug: ProjectSlug, step: number, mobile = false) {
  const canvas = document.createElement('canvas');
  canvas.width = mobile ? 384 : 1024;
  canvas.height = mobile ? 720 : 640;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const pad = mobile ? 28 : 52;
  const spec = studios[slug];
  const accent = spec.accent;
  const box = (x: number, y: number, width: number, height: number, color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, width, height, 10); ctx.fill();
  };
  const text = (s: string, x: number, y: number, size = 24, color = '#edf3f5') => {
    ctx.fillStyle = color; ctx.font = `500 ${size}px ${slug === 'bank-system' ? 'monospace' : 'sans-serif'}`;
    ctx.fillText(s, x, y, w - x - pad);
  };
  ctx.fillStyle = '#101923'; ctx.fillRect(0, 0, w, canvas.height);
  box(pad, 30, w - pad * 2, 38, '#1d2a36');
  [0, 1, 2].forEach(i => { ctx.fillStyle = ['#d79085', '#d4b770', '#86bea7'][i]; ctx.beginPath(); ctx.arc(pad + 18 + i * 18, 49, 4, 0, Math.PI * 2); ctx.fill(); });
  const names: Partial<Record<ProjectSlug, string>> = {
    'cedrus-website': 'CEDRUS GROUP', 'hospital-website': 'CARE / HOSPITAL',
    'bank-system': 'BANK / CONSOLE', 'food-order': 'THE MENU',
  };
  text(names[slug] ?? 'ENGINEERED REALITY', pad, 111, mobile ? 25 : 27, accent);
  const heading = spec.steps[step] ?? spec.steps[0];
  text(heading, pad, 187, mobile ? 34 : 52);
  if (slug === 'bank-system') {
    const lines = step === 0 ? ['> manager', '01  Create account', '02  View accounts', '03  Update record', '04  Delete account']
      : step === 1 ? ['> client', '01  View balance', '02  Deposit', '03  Withdraw', '04  Exit']
      : ['> accounts.dat', 'Write binary record', 'Close file', 'Reopen file', 'Read saved record'];
    lines.forEach((line, i) => text(line, pad, 270 + i * 53, mobile ? 20 : 28, i === 0 ? accent : '#c5d2db'));
  } else if (slug === 'hospital-website' && step >= 2) {
    ['Your name', 'Email address', step === 2 ? 'Department' : 'Your message'].forEach((line, i) => {
      text(line, pad, 242 + i * 88, 20, '#aebfcf'); box(pad, 257 + i * 88, w - pad * 2, 45, '#203342');
    });
    box(pad, 524, Math.min(270, w - pad * 2), 52, accent); text(step === 2 ? 'Request appointment' : 'Send message', pad + 15, 558, 20, '#10202e');
  } else {
    const rows = slug === 'food-order' ? (step === 2 ? ['Order summary', 'Selected items', 'Order details'] : ['Seasonal dishes', 'Fresh from the kitchen', 'Browse categories'])
      : slug === 'hospital-website' ? ['Cardiology', 'Dermatology', 'Internal medicine']
      : slug === 'cedrus-website' ? (step === 3 ? ['Open opportunities', 'Join the team', 'Build your career'] : ['Our expertise', 'Our services', 'Our approach'])
      : ['Firmware', 'Connectivity', 'Device systems'];
    rows.forEach((line, i) => {
      const x = mobile ? pad : pad + i * 310;
      const y = mobile ? 230 + i * 131 : 253;
      box(x, y, mobile ? w - pad * 2 : 288, mobile ? 110 : 245, '#1d2c38');
      box(x + 18, y + 18, mobile ? 44 : 66, mobile ? 24 : 48, accent);
      text(line, x + 18, y + (mobile ? 75 : 115), mobile ? 20 : 25);
      if (!mobile) { box(x + 18, y + 145, 238, 7, '#43525e'); box(x + 18, y + 164, 182, 7, '#35434e'); }
    });
  }
  text('Illustrative interface', pad, canvas.height - 24, 16, '#879aa8');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
