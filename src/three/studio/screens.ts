import * as THREE from 'three';
import type { ProjectSlug } from '../../data/content';
import { studios } from './catalog';

/** Illustrative interfaces, baked only when a page is selected. These are not
 * screenshots of the delivered projects; their content follows the dossiers. */
export function makeScreen(slug: ProjectSlug, step: number, mobile = false) {
  const canvas = document.createElement('canvas');
  canvas.width = mobile ? 384 : 1024; canvas.height = mobile ? 720 : 640;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width; const pad = mobile ? 26 : 48;
  const bank = slug === 'bank-system';
  const hospital = slug === 'hospital-website';
  const food = slug === 'food-order';
  const ink = bank ? '#d8e5dd' : hospital ? '#143d57' : '#293d36';
  const muted = bank ? '#91a49a' : '#667b77';
  const accent = bank ? '#b0b8fb' : hospital ? '#247ead' : food ? '#ab5534' : '#476951';
  const paper = bank ? '#0b1718' : hospital ? '#f1f7fb' : '#f5f1e8';
  const spec = studios[slug];
  const box = (x: number, y: number, width: number, height: number, color: string, radius = 8) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
  };
  const text = (s: string, x: number, y: number, size = 24, color = ink, max = w - x - pad) => {
    ctx.fillStyle = color; ctx.font = `500 ${size}px ${bank ? 'monospace' : 'sans-serif'}`;
    ctx.fillText(s, x, y, max);
  };
  const line = (x:number,y:number,ww:number,color:string) => box(x,y,ww,2,color,0);
  ctx.fillStyle = paper; ctx.fillRect(0,0,w,canvas.height);
  box(0,0,w,32,bank ? '#263b3b' : '#dce3df',0);
  [0,1,2].forEach(i => {ctx.fillStyle = ['#b46c5f','#beab6b','#6c967e'][i];ctx.beginPath();ctx.arc(17+i*15,16,4,0,Math.PI*2);ctx.fill();});
  text(bank ? 'bank-system — C++ console' : 'project / responsive preview',mobile ? 68 : 285,22,13,muted);
  const brand = bank ? 'BANK / CONSOLE' : hospital ? 'HOSPITAL' : food ? 'THE MENU' : 'CEDRUS GROUP';
  text(brand,pad,85,mobile ? 22 : 26,accent);
  if (!mobile && !bank) ['Home',hospital ? 'Departments' : food ? 'Menu' : 'About us',hospital ? 'Appointment' : food ? 'Orders' : 'Services','Contact'].forEach((s,i) => text(s,560+i*108,83,16,muted,100));
  if (mobile && !bank) {line(325,67,28,accent);line(325,76,28,accent);line(325,85,28,accent);}
  line(pad,109,w-pad*2,bank ? '#294442' : '#d7e0da');
  text(spec.steps[step] ?? spec.steps[0],pad,175,mobile ? 34 : 46);

  if (bank) {
    text('ACCOUNT MANAGEMENT SYSTEM',pad,220,mobile ? 15 : 20,muted);
    const lines = step === 0 ? ['> authenticated: manager','01  Create account','02  List / update accounts','03  Delete account','04  Save records']
      : step === 1 ? ['> authenticated: client','01  View balance','02  Deposit funds','03  Withdraw funds','04  Exit session']
      : ['> file: accounts.dat','Open binary stream','Encode account record','Write record / close file','Reopen / read saved record'];
    lines.forEach((s,i) => text(s,pad,278+i*48,mobile ? 18 : 25,i === 0 ? accent : ink));
    line(pad,532,w-pad*2,'#294442');text('> Select an operation _',pad,568,mobile ? 17 : 22,accent);
  } else if (hospital && step >= 2) {
    text(step === 2 ? 'Request an appointment' : 'How can we help?',pad,218,20,muted);
    ['Your name','Email address',step === 2 ? 'Choose a department' : 'Your message'].forEach((s,i) => {
      text(s,pad,264+i*80,16,muted);box(pad,278+i*80,mobile ? w-pad*2 : 565,39,'#ffffff');
      line(pad+14,303+i*80,mobile ? 210 : 440,'#d2dfe7');
    });
    box(pad,533,mobile ? w-pad*2 : 300,48,accent);text(step === 2 ? 'Request appointment' : 'Send message',pad+19,564,19,'#ffffff');
    if (!mobile) {box(667,245,308,275,'#e0edf4');text('Patient services',695,294,25,ink,245);['Departments','Opening hours','Contact information'].forEach((s,i) => text(s,695,353+i*51,19,muted,245));}
  } else if (food && step === 2) {
    text('Review your selection',pad,219,21,muted);
    ['Selected dishes','Quantity / item details','Delivery information'].forEach((s,i) => {
      box(pad,252+i*86,w-pad*2,68,'#fffcf6');text(s,pad+20,293+i*86,21,ink);
    });
    box(pad,545,mobile ? w-pad*2 : 270,48,accent);text('Place order',pad+24,576,20,'#fff8ee');
  } else {
    const labels = food ? ['Seasonal dishes','Kitchen favourites','Fresh sides']
      : hospital ? ['Cardiology','Dermatology','Internal medicine']
      : step === 3 ? ['Engineering','Operations','Join our team']
      : step === 1 ? ['Our story','Our people','Our purpose']
      : ['Our expertise','Solutions & services','Built on experience'];
    text(food ? (step === 1 ? 'Search the menu' : 'Something for every appetite') : hospital ? 'Find the right department' : 'Experience. Expertise. Delivery.',pad,218,mobile ? 17 : 22,muted);
    if (food && step === 1) {box(pad,234,w-pad*2,37,'#e8dfd2');text('Search dishes and categories…',pad+15,259,16,muted);}
    labels.forEach((s,i) => {
      const x = mobile ? pad : pad+i*318;
      const y = mobile ? 283+i*121 : 289;
      const cw = mobile ? w-pad*2 : 292;
      box(x,y,cw,mobile ? 106 : 244,food ? '#fffcf6' : '#ffffff');
      if (food) {
        const cx=x+(mobile ? 53 : 146),cy=y+(mobile ? 49 : 67);
        ctx.fillStyle='#e5ddcd';ctx.beginPath();ctx.ellipse(cx+2,cy+4,mobile?37:67,mobile?30:44,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#f6f1e4';ctx.beginPath();ctx.ellipse(cx,cy,mobile?35:65,mobile?28:42,0,0,Math.PI*2);ctx.fill();
        for(let n=0;n<7;n++){const a=n*2.4;ctx.fillStyle=['#79945a','#b87042','#d6ad62'][n%3];ctx.beginPath();ctx.ellipse(cx+Math.sin(a)*22,cy+Math.cos(a)*15,9+n%3*3,7, a,0,Math.PI*2);ctx.fill();}
      } else if (hospital) {
        const cx=x+(mobile ? 39 : 37),cy=y+32;
        box(cx-7,cy-20,14,40,'#d1e7f1',2);box(cx-20,cy-7,40,14,'#d1e7f1',2);
      } else {
        const cx=x+24,cy=y+18;
        ctx.strokeStyle='#b3c4b5';ctx.lineWidth=3;ctx.strokeRect(cx,cy,39,39);ctx.strokeRect(cx+13,cy+8,39,39);
      }
      const tx=x+(mobile ? 100 : 22),ty=y+(mobile ? 44 : 151);
      text(s,tx,ty,mobile ? 18 : 24,ink,mobile ? 208 : 255);
      if (mobile) text(food ? 'View dish →' : 'Learn more →',tx,ty+29,14,accent,208);
      else {text(food ? 'Prepared fresh. Explore the menu.' : 'Explore the details and learn more.',x+22,y+187,15,muted,255);text('Explore →',x+22,y+222,16,accent);}
    });
  }
  text('Illustrative interface',pad,canvas.height-16,13,muted);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}
