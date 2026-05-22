/**
 * Shared chrome for every Modal-backed demo. Renders a panel with a
 * header strip (title + status indicator), a content slot, and a
 * loading/error overlay state machine.
 *
 * Each demo composes its own UI inside <DemoFrame> rather than reusing
 * a single generic widget — demos have widely different controls.
 */

import type { ReactNode } from 'react';

export type DemoStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

interface Props {
  title: string;
  status: DemoStatus;
  statusLabel?: string;
  error?: string | null;
  children: ReactNode;
}

const STATUS_LABEL: Record<DemoStatus, string> = {
  idle: 'READY',
  loading: 'WARMING MODAL…',
  streaming: 'STREAMING',
  done: 'COMPLETE',
  error: 'ERROR',
};

const STATUS_COLOR: Record<DemoStatus, string> = {
  idle: 'var(--bone-dim)',
  loading: 'var(--amber, #f5b94a)',
  streaming: 'var(--phosphor)',
  done: 'var(--mint, var(--phosphor))',
  error: '#e35a5a',
};

export default function DemoFrame({ title, status, statusLabel, error, children }: Props) {
  return (
    <div className="demo-shell">
      <div className="demo-strip">
        <span className="demo-strip-title">§ {title}</span>
        <span className="demo-strip-status" style={{ color: STATUS_COLOR[status] }}>
          <span className="demo-strip-dot" style={{ background: STATUS_COLOR[status] }} />
          {statusLabel ?? STATUS_LABEL[status]}
        </span>
      </div>
      <div className="demo-body">{children}</div>
      {error && (
        <div className="demo-error" role="alert">
          <strong>Error</strong> — {error}
        </div>
      )}
      <style>{`
        .demo-shell {
          width: 100%;
          border: 1px solid var(--rule);
          background: var(--ink-2);
        }
        .demo-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 1rem;
          border-bottom: 1px solid var(--rule);
          font-family: var(--mono);
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--bone-dim);
        }
        .demo-strip-title { color: var(--phosphor); }
        .demo-strip-status {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .demo-strip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
        }
        .demo-body { padding: 1rem; }
        .demo-error {
          padding: 0.75rem 1rem;
          border-top: 1px solid #e35a5a;
          background: rgba(227, 90, 90, 0.08);
          color: #e35a5a;
          font-family: var(--mono);
          font-size: 0.78rem;
          letter-spacing: 0.04em;
        }
      `}</style>
    </div>
  );
}
