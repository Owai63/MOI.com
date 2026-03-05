# MOI.ENG Portfolio v3.0

> Cyberpunk / embedded-systems aesthetic portfolio — Muhammad Owais Iqbal Malik

## File Structure

```
portfolio/
├── index.html        ← main HTML (structure & content only)
├── css/
│   └── style.css     ← all styles, variables, animations, responsive
├── js/
│   └── main.js       ← all interactivity & canvas logic
└── README.md
```

## Features

| Feature | File |
|---|---|
| Boot terminal sequence | `js/main.js` |
| Custom crosshair cursor | `css/style.css` + `js/main.js` |
| Mouse trail particles | `js/main.js` |
| Click burst + ripple | `js/main.js` |
| Circuit-board canvas background | `js/main.js` |
| Floating hero particles | `js/main.js` |
| Parallax blobs (mouse-driven) | `js/main.js` |
| 3-D orbital hero visual | `css/style.css` |
| Animated hero stat counters | `js/main.js` |
| Typewriter role subtitle | `js/main.js` |
| Text scramble section headings | `js/main.js` |
| Skill pill stagger entrance | `js/main.js` |
| Skill radar chart (canvas) | `js/main.js` |
| Timeline scan beam | `css/style.css` |
| 3-D tilt + spotlight on project cards | `js/main.js` |
| Flip certification cards | `css/style.css` |
| Live GitHub repository grid | `js/main.js` |
| Active nav highlight on scroll | `js/main.js` |
| Scroll progress bar | `js/main.js` |
| Magnetic CTA buttons | `js/main.js` |
| Audio visualiser bars | `js/main.js` |
| Konami code easter egg ↑↑↓↓←→←→BA | `js/main.js` |

## Usage

Just open `index.html` in any modern browser — no build step required.

To update your GitHub username (for the live repo grid) edit line 1 of `js/main.js`:

```js
const GH_USERNAME = 'owai63';   // ← change this
```

## Customisation

All colour variables are at the top of `css/style.css`:

```css
:root {
  --a:   #00ffe0;   /* primary cyan  */
  --a2:  #ff3e6c;   /* accent pink   */
  --gr:  #00ff88;   /* green         */
  --pur: #bd7fff;   /* purple        */
}
```

## Responsive

- ≥ 1024 px — full two-column layout with orbital visual  
- 768 – 1023 px — single column, hamburger menu  
- < 768 px — mobile optimised, flip-cards shown flat  

## Easter Egg

Type the **Konami code** on any page: `↑ ↑ ↓ ↓ ← → ← → B A`
