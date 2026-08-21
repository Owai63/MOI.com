/* ============================================================================
   server/index.mjs — production server for DigitalOcean
   ----------------------------------------------------------------------------
   - Serves the built static site from ../dist
   - Proxies the chatbot to Google Gemini, keeping GEMINI_API_KEY server-side
     (the key is NEVER shipped to the browser).

   Deploy on a DigitalOcean Droplet or App Platform "web service":
     Build command:  npm install && npm run build
     Run command:    node server/index.mjs
   Environment variables:
     GEMINI_API_KEY  (required)  — your Google AI Studio / Gemini API key
     GEMINI_MODEL    (optional)  — default "gemini-3.6-flash"
     PORT            (optional)  — default 8080
     ALLOWED_ORIGIN  (optional)  — CORS origin, default "*" (same-origin needs none)
   ========================================================================== */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KNOWLEDGE } from './knowledge.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.GEMINI_API_KEY || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

/* Model chain. The free Gemini tier caps *each* model at a small number of
   requests per project per day (gemini-3.6-flash is 20/day), and once that is
   spent every chat turn fails with 429 RESOURCE_EXHAUSTED. Rather than let the
   assistant go dark for the rest of the day, we fall through to the next model
   in the chain. Enabling billing on the API key removes the cap entirely and
   makes the fallbacks mostly academic. */
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS ??
  'gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const MODEL_CHAIN = [...new Set([MODEL, ...FALLBACK_MODELS])];

/** Upstream statuses worth retrying on the next model in the chain. */
const FALLTHROUGH = new Set([404, 429, 500, 503]);

app.use(express.json({ limit: '256kb' }));

// Minimal CORS (only needed if the API is served from a different origin).
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    model: MODEL,
    modelChain: MODEL_CHAIN,
    keyConfigured: Boolean(API_KEY),
  }),
);

function systemPrompt(lang) {
  const language =
    lang === 'ar'
      ? 'Respond in Modern Standard Arabic. Keep technical acronyms (BLE, LTE-M, GPS, AWS, STM32, …) in Latin script.'
      : 'Respond in English.';
  return `You are the AI assistant embedded in Muhammad Owais Iqbal's personal portfolio website.
Your job is to answer visitors' questions about Owais — his experience, skills, projects, education, and background — accurately and concisely, as a helpful representative of his portfolio.

RULES:
- Use ONLY the facts in the KNOWLEDGE section below. Never invent employers, dates, job titles, metrics, numbers, or technologies that are not present.
- If something is not covered, say you don't have that detail and suggest contacting Owais at owais1.iqbal@gmail.com.
- Be concise and professional. Prefer short paragraphs or tight bullet points. Do not use markdown headings.
- Speak about Owais in the third person.
- ${language}
- If the user clearly wants to download/get his CV or resume, tell them to use the "Download CV" button in the site header (top navigation), and briefly summarise what the CV contains.

KNOWLEDGE:
${KNOWLEDGE}`;
}

/** Extract the reply text out of a Gemini generateContent response. */
function replyFrom(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join('') || ''
  );
}

/** Seconds Gemini asked us to wait, if it said so. */
function retryAfterSeconds(detail) {
  const match = /"retryDelay":\s*"(\d+)s"/.exec(detail);
  return match ? Number(match[1]) : null;
}

async function callGemini(model, body) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
    `:generateContent?key=${encodeURIComponent(API_KEY)}`;

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const detail = await r.text();
    return { ok: false, status: r.status, detail };
  }
  return { ok: true, status: 200, data: await r.json() };
}

app.post('/api/chat', async (req, res) => {
  if (!API_KEY) {
    return res
      .status(500)
      .json({ error: 'Server is missing GEMINI_API_KEY.', code: 'no_key' });
  }
  try {
    const { messages, lang } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages[] is required.' });
    }

    // Map our {role:'user'|'assistant', content} → Gemini contents.
    const contents = messages
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .slice(-12) // keep context bounded
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content).slice(0, 4000) }],
      }));

    const body = {
      systemInstruction: { parts: [{ text: systemPrompt(lang) }] },
      contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 800, topP: 0.9 },
    };

    let last = null;
    for (const model of MODEL_CHAIN) {
      const attempt = await callGemini(model, body);

      if (attempt.ok) {
        const reply = replyFrom(attempt.data);
        if (reply) return res.json({ reply, model });
        // An empty candidate is usually a safety block — another model is
        // unlikely to do better, so stop here rather than burn the chain.
        console.error('Empty reply from', model);
        return res
          .status(502)
          .json({ error: 'Empty response from model.', code: 'empty' });
      }

      last = attempt;
      console.error(`Gemini error (${model})`, attempt.status, attempt.detail);
      if (!FALLTHROUGH.has(attempt.status)) break;
    }

    // Every model in the chain refused. Tell the client *why* — a spent daily
    // quota is a wait-and-retry condition, not a broken assistant, and the
    // widget shows a different message for it.
    if (last?.status === 429) {
      const wait = retryAfterSeconds(last.detail);
      if (wait) res.setHeader('Retry-After', String(wait));
      return res.status(429).json({
        error: 'The assistant has reached its request limit.',
        code: 'rate_limited',
        retryAfter: wait,
      });
    }

    return res
      .status(502)
      .json({ error: 'Upstream model error.', code: 'upstream' });
  } catch (err) {
    console.error('chat handler failed', err);
    res.status(500).json({ error: 'Assistant failed.', code: 'unknown' });
  }
});

/* Translation is NOT a runtime concern. English→Arabic happens once, at build
   time, via `npm run translate` — the result ships inside the bundle
   (src/i18n/ar.json), so no visitor ever pays for a translation request and
   the site is fully Arabic even with this server offline. */

// Static site + SPA fallback.
const distDir = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));

app.listen(PORT, () => {
  console.log(
    `Server on :${PORT} · models ${MODEL_CHAIN.join(' → ')} · key ${API_KEY ? 'set' : 'MISSING'}`,
  );
});
