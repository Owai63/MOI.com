# Bilingual + AI Assistant + CV — Setup Guide

This build adds three things to the portfolio:

1. **Bilingual site (English ⇄ Arabic)** with automatic language detection and full RTL.
2. **AI assistant (Google Gemini)** that answers questions about the portfolio.
3. **One-click CV download** in a fixed, print-perfect format (matches the supplied PDF), in both languages.

---

## 1. Bilingual (English / Arabic)

- **How it switches:** the language toggle in the header (shows `العربية` / `English`).
  First visit auto-detects the browser language; the choice is remembered in `localStorage`.
  The `<html>` element gets `lang` + `dir="rtl"`, and the Arabic webfont (Cairo) + RTL rules apply.
- **English is the only side you author.** Every visible word lives in one of four places:
  | Where | What |
  |---|---|
  | `src/data/content.ts` | portfolio facts (projects, experience, education, …) |
  | `src/i18n/ui.ts` | interface chrome (buttons, aria labels, chat, `<title>`) |
  | `src/i18n/copy.ts` | section eyebrows, titles, connective copy |
  | `src/data/projectVisuals.ts` | project image alt text |

  `src/i18n/surface.ts` gathers exactly those four into "every English word on the
  site". **Never hardcode visible English inside a component** — it would bypass
  the surface and stay English forever.

- **Arabic is generated, not authored:** one flat English→Arabic map in
  `src/i18n/ar.json`, produced once by `npm run translate` and shipped inside the
  bundle. Nothing is translated in the browser, so there is no per-visitor cost,
  no network dependency, and no half-translated first frame.

- **Hand-approved overrides:** `src/i18n/curated.ar.ts`. Anything in there always
  wins over the machine output and is never re-translated — that is where you fix
  or improve wording by hand.

### Adding new English content

```bash
# 1. edit the English (content.ts / ui.ts / copy.ts / projectVisuals.ts)
# 2. translate only what's new — existing strings are never re-sent:
npm run translate

# verify nothing is missing (exits 1 and lists the gaps if so — good for CI):
npm run translate:check
```

Other flags: `npm run translate -- --force` re-translates everything except the
curated entries; `-- --prune` drops entries for English that no longer exists.

Requires `GEMINI_API_KEY` (read from `.env`). It is a **build-time authoring
tool** — the key never reaches the browser, and the production server needs it
only for the chat assistant.

Technical acronyms and product names (BLE, LTE-M, AWS, STM32, QuecOpen, …) are
deliberately kept in Latin script, as is standard in Arabic technical writing.

---

## 2. AI Assistant (Google Gemini)

**Your API key never touches the browser.** A small Node/Express proxy holds it server-side.

### Files
- `server/index.mjs` — serves the built site **and** proxies `/api/chat` to Gemini.
- `server/knowledge.mjs` — the factual brief the assistant is grounded in (keep in sync with your content).
- `src/components/chat/ChatWidget.tsx` — the floating chat UI (bilingual, RTL-aware).

### Environment variables (see `.env.example`)
| Variable | Required | Default | Notes |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | Your Google AI Studio key. **Server-side only.** |
| `GEMINI_MODEL` | | `gemini-3.6-flash` | Any Gemini model id. |
| `PORT` | | `8080` | DigitalOcean sets this automatically. |
| `ALLOWED_ORIGIN` | | `*` | Only needed if API is on a different host than the site. |
| `VITE_CHAT_ENDPOINT` | | `/api/chat` | Build-time; change only if the proxy is on another domain. |

### Run locally
```bash
# terminal 1 — the Gemini proxy
GEMINI_API_KEY=your_key npm run server        # http://localhost:8080

# terminal 2 — the site (Vite proxies /api → localhost:8080)
npm run dev
```

---

## 3. CV Download

- Button lives in the **header** and inside the **chat widget**.
- The CV is a **fixed document** (`src/lib/cv/cvData.ts`) rendered by a deterministic A4 template
  (`src/lib/cv/cvTemplate.ts`) — identical layout every time, matching the supplied PDF.
- Clicking opens a print-ready tab and triggers the print dialog → **Save as PDF**.
- Available in **English and Arabic** (follows the current site language).
- If you update your CV facts, edit `cvData.ts` (both `en` and `ar`).

---

## Deploy on DigitalOcean

**App Platform (recommended)** — create a *Web Service* component from this repo:
- **Build command:** `npm install && npm run build`
- **Run command:** `npm start` (= `node server/index.mjs`)
- **HTTP port:** `8080`
- **Env var:** `GEMINI_API_KEY` (mark as *encrypted/secret*)

**Droplet** — same idea:
```bash
npm install && npm run build
GEMINI_API_KEY=your_key PORT=8080 npm start   # put behind Nginx / pm2
```

The Express server serves `dist/` and the `/api/chat` proxy from the same origin, so no CORS setup is needed.
