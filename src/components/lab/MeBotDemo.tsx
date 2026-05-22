/**
 * me-bot chat island. Subscribes to /chat_stream SSE per turn.
 * Events:
 *   sources  — retrieved chunks (rendered as a sources expander)
 *   token    — append to current assistant message
 *   blocked  — moderator caught fabrication → replace message
 *   error    — surface to user
 *   done     — turn finished
 */

import { useEffect, useRef, useState } from 'react';
import { MODAL } from '../../lib/config';
import { sseStream } from '../../lib/modal-client';
import DemoFrame, { type DemoStatus } from './DemoFrame';

type Role = 'user' | 'assistant';
interface SourceChunk { chunk_id: string; title: string; section: string; text: string; score: number; last_reviewed: string }
interface Turn { role: Role; text: string; sources?: SourceChunk[]; blocked?: boolean }

const ENDPOINT = MODAL.mebot;
const RATE_LIMIT = 20;

export default function MeBotDemo() {
  const [history, setHistory] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => cancelRef.current?.(), []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const userTurns = history.filter((t) => t.role === 'user').length;
  const rateLimited = userTurns >= RATE_LIMIT;

  const send = () => {
    const q = draft.trim();
    if (!q || status === 'streaming' || status === 'loading' || rateLimited) return;
    cancelRef.current?.();
    setDraft('');
    setError(null);
    setStatus('loading');

    const userTurn: Turn = { role: 'user', text: q };
    const placeholder: Turn = { role: 'assistant', text: '' };
    setHistory((h) => [...h, userTurn, placeholder]);

    // Build LLM-shape history (last 6 turns).
    const llmHistory = [...history, userTurn]
      .filter((t) => !t.blocked)
      .slice(-6)
      .map((t) => ({ role: t.role, content: t.text }));

    cancelRef.current = sseStream(
      ENDPOINT,
      '/chat_stream',
      {
        query: q,
        history: JSON.stringify(llmHistory),
        k: 5,
        min_score: 0.25,
      },
      {
        onEvent: (eventName, data) => {
          const d = data as Record<string, unknown>;
          if (eventName === 'sources') {
            const chunks = (d.chunks as SourceChunk[]) ?? [];
            setHistory((h) => {
              const copy = [...h];
              copy[copy.length - 1] = { ...copy[copy.length - 1], sources: chunks };
              return copy;
            });
            setStatus('streaming');
          } else if (eventName === 'token') {
            setHistory((h) => {
              const copy = [...h];
              const last = copy[copy.length - 1];
              copy[copy.length - 1] = { ...last, text: last.text + String(d.text) };
              return copy;
            });
          } else if (eventName === 'blocked') {
            setHistory((h) => {
              const copy = [...h];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                text: String(d.replacement),
                blocked: true,
                sources: [],
              };
              return copy;
            });
          } else if (eventName === 'error') {
            setError(String(d.message));
            setStatus('error');
          } else if (eventName === 'done') {
            setStatus('done');
          }
        },
        onError: (err) => {
          setError(err.message);
          setStatus('error');
        },
      },
    );
  };

  return (
    <DemoFrame
      title="me-bot · RAG over Raven's corpus"
      status={status}
      statusLabel={status === 'streaming' ? 'STREAMING' : undefined}
      error={error}
    >
      <div className="mb-shell">
        <div className="mb-history" ref={scrollRef}>
          {history.length === 0 && (
            <div className="mb-empty">
              Ask about Raven's research, current projects, or coursework.<br />
              Tightly scoped — won't speculate or invent.
            </div>
          )}
          {history.map((t, i) => (
            <div key={i} className={`mb-msg mb-msg-${t.role}`}>
              <span className="mb-role">{t.role}</span>
              <div className="mb-text">{t.text || (t.role === 'assistant' ? <em>…</em> : '')}</div>
              {t.sources && t.sources.length > 0 && (
                <details className="mb-sources">
                  <summary>Sources · {t.sources.length}</summary>
                  {t.sources.map((s) => (
                    <div key={s.chunk_id} className="mb-source">
                      <strong>[{s.chunk_id}]</strong> · score {s.score.toFixed(2)} · reviewed {s.last_reviewed}
                      <blockquote>{s.text.slice(0, 240)}{s.text.length > 240 ? '…' : ''}</blockquote>
                    </div>
                  ))}
                </details>
              )}
            </div>
          ))}
        </div>

        <form className="mb-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={rateLimited
              ? 'Per-session question limit reached. Use /contact for more.'
              : 'Ask about Raven\u2019s work\u2026'}
            disabled={rateLimited || status === 'streaming' || status === 'loading'}
          />
          <button type="submit"
                  disabled={rateLimited || !draft.trim() || status === 'streaming' || status === 'loading'}>
            {status === 'streaming' || status === 'loading' ? '…' : 'Send'}
          </button>
        </form>
        <div className="mb-meta">
          {userTurns}/{RATE_LIMIT} turns · {history.filter((t) => t.blocked).length > 0
            ? `${history.filter((t) => t.blocked).length} blocked by moderator`
            : 'moderator clean'}
        </div>
      </div>
      <Styles />
    </DemoFrame>
  );
}

function Styles() {
  return (
    <style>{`
      .mb-shell { display: flex; flex-direction: column; gap: 0.75rem; }
      .mb-history {
        height: 380px; overflow-y: auto; border: 1px solid var(--rule);
        background: var(--ink); padding: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem;
      }
      .mb-empty {
        margin: auto; text-align: center; color: var(--bone-dim);
        font-family: var(--display); font-style: italic;
      }
      .mb-msg { display: flex; flex-direction: column; gap: 0.25rem; max-width: 90%; }
      .mb-msg-user { align-self: flex-end; }
      .mb-msg-assistant { align-self: flex-start; }
      .mb-role {
        font-family: var(--mono); font-size: 0.65rem;
        letter-spacing: 0.12em; text-transform: uppercase;
        color: var(--bone-dim);
      }
      .mb-text {
        padding: 0.5rem 0.75rem; border: 1px solid var(--rule);
        background: var(--ink-2); white-space: pre-wrap; line-height: 1.5;
      }
      .mb-msg-user .mb-text { background: var(--phosphor); color: var(--ink); border-color: var(--phosphor); }
      .mb-sources { font-family: var(--mono); font-size: 0.78rem; color: var(--bone-dim); }
      .mb-sources summary { cursor: pointer; padding: 0.25rem 0; }
      .mb-source { padding: 0.4rem 0; border-top: 1px dashed var(--rule); }
      .mb-source blockquote {
        margin: 0.3rem 0 0; padding-left: 0.6rem; border-left: 2px solid var(--rule);
        color: var(--bone);
      }
      .mb-form { display: flex; gap: 0.4rem; }
      .mb-form input {
        flex: 1; background: var(--ink); color: var(--bone); border: 1px solid var(--rule);
        padding: 0.6rem 0.75rem; font-family: var(--display); font-size: 1rem;
      }
      .mb-form input:disabled { opacity: 0.5; }
      .mb-form button {
        background: var(--phosphor); color: var(--ink); border: 0;
        padding: 0 1.2rem; font-family: var(--mono); font-size: 0.78rem;
        letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;
      }
      .mb-form button:disabled { opacity: 0.4; }
      .mb-meta {
        font-family: var(--mono); font-size: 0.7rem; color: var(--bone-dim);
        letter-spacing: 0.08em;
      }
    `}</style>
  );
}
