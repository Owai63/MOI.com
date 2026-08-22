/* ============================================================================
   keyboardLayout — where every key is, in one place
   ----------------------------------------------------------------------------
   Its own module because two very different things need it and neither should
   own it: the instanced keycaps in Keyboard.tsx, and the legend texture drawn
   in textures.ts. Putting the table in either one would make the other import
   it and close a cycle; worse, it would let the caps and the letters printed
   on them drift apart, which is the one defect nobody would think to look for.
   ========================================================================== */

/** One row of a keyboard, in key units. */
export interface KeyRow {
  /** row height in key units — the function row is a short one. */
  h: number;
  /** width of each key in the row, in key units. */
  keys: number[];
  /** what is printed on each. Empty means an unlabelled modifier. */
  labels: string[];
}

/** A laptop layout. Rows need not sum to the same number of units: each is
 *  scaled to the field width, which is what real boards do anyway once you
 *  count the half-unit at the ends. */
export const KEYBOARD: KeyRow[] = [
  {
    h: 0.62,
    keys: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    labels: ['esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', ''],
  },
  {
    h: 1,
    keys: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    labels: ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', ''],
  },
  {
    h: 1,
    keys: [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
    labels: ['', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', ''],
  },
  {
    h: 1,
    keys: [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
    labels: ['', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", ''],
  },
  {
    h: 1,
    keys: [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
    labels: ['', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', ''],
  },
  {
    h: 1,
    keys: [1.1, 1.1, 1.1, 1.25, 5, 1.25, 1.1, 1.1, 1.1],
    labels: ['fn', '', '', '', '', '', '', '', ''],
  },
];

/** One cap's footprint in the field's own 0..1 space, with 0,0 at the back
 *  left — the function row, escape end. */
export interface KeySlot {
  cx: number;
  cy: number;
  w: number;
  h: number;
  label: string;
}

/** Gap between caps, in key units. Taken out of the cap rather than out of the
 *  pitch, so keys stay on their grid however wide they are. */
const GAP = 0.14;

export function keySlots(rows: KeyRow[] = KEYBOARD): KeySlot[] {
  const totalH = rows.reduce((n, r) => n + r.h, 0);
  const slots: KeySlot[] = [];
  let y = 0;

  for (const row of rows) {
    const units = row.keys.reduce((n, k) => n + k, 0);
    let x = 0;
    row.keys.forEach((k, i) => {
      const w = k / units;
      slots.push({
        cx: x + w / 2,
        cy: (y + row.h / 2) / totalH,
        w: w - GAP / units,
        h: (row.h - GAP) / totalH,
        label: row.labels[i] ?? '',
      });
      x += w;
    });
    y += row.h;
  }
  return slots;
}
