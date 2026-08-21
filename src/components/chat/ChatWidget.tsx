import { useEffect, useRef, useState } from 'react';
import { useUi, useLang } from '../../i18n/useContent';
import { downloadCv } from '../../lib/cv/downloadCv';
import styles from './ChatWidget.module.scss';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const ENDPOINT =
  (import.meta.env.VITE_CHAT_ENDPOINT as string | undefined) || '/api/chat';

export function ChatWidget() {
  const ui = useUi();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [ui.chatSuggest1, ui.chatSuggest2, ui.chatSuggest3];

  // Auto-scroll to newest.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  // Focus input when opened.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setError(false);
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, lang }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
        code?: string;
      };
      // A spent API quota is a wait-and-retry condition, not a dead assistant —
      // say so instead of claiming we could not reach it.
      if (res.status === 429 || data.code === 'rate_limited') {
        setError(true);
        setMessages((m) => [...m, { role: 'assistant', content: ui.chatBusy }]);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      if (!data.reply) throw new Error('empty');
      setMessages((m) => [...m, { role: 'assistant', content: data.reply as string }]);
    } catch {
      setError(true);
      setMessages((m) => [...m, { role: 'assistant', content: ui.chatError }]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
        aria-label={open ? ui.chatClose : ui.chatOpen}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M4 5h16v10H8l-4 4V5z"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="12" cy="10" r="1" fill="currentColor" />
            <circle cx="15" cy="10" r="1" fill="currentColor" />
          </svg>
        )}
      </button>

      <section
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        role="dialog"
        aria-label={ui.chatTitle}
        aria-hidden={!open}
      >
        <header className={styles.head}>
          <div>
            <h2 className={styles.title}>{ui.chatTitle}</h2>
            <p className={styles.subtitle}>{ui.chatSubtitle}</p>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label={ui.chatClose}
            onClick={() => setOpen(false)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className={styles.list} ref={listRef}>
          <div className={`${styles.msg} ${styles.bot}`}>{ui.chatGreeting}</div>

          {messages.length === 0 && (
            <div className={styles.suggestions}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.chip}
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`${styles.msg} ${m.role === 'user' ? styles.user : styles.bot} ${
                error && i === messages.length - 1 && m.role === 'assistant' ? styles.errMsg : ''
              }`}
            >
              {m.content}
            </div>
          ))}

          {busy && (
            <div className={`${styles.msg} ${styles.bot} ${styles.typing}`} aria-live="polite">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>

        <div className={styles.cvRow}>
          <button type="button" className={styles.cvChip} onClick={() => downloadCv(lang)}>
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path d="M12 3v11m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {ui.chatDownloadCv}
          </button>
        </div>

        <form className={styles.inputRow} onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder={ui.chatPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button
            type="submit"
            className={styles.send}
            aria-label={ui.chatSend}
            disabled={busy || !input.trim()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M4 12l16-8-6 16-3-6-7-2z" fill="currentColor" />
            </svg>
          </button>
        </form>

        <p className={styles.disclaimer}>{ui.chatDisclaimer}</p>
      </section>
    </>
  );
}
