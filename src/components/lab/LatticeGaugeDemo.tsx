/**
 * Wilson lattice gauge demo — POST /sweep on tardigrade-lattice.
 * Renders the plaquette heatmap as inline SVG, plus action +
 * ⟨plaquette⟩ history as sparkline traces.
 */

import { useState } from 'react';
import { MODAL } from '../../lib/config';
import { jsonPost } from '../../lib/modal-client';
import DemoFrame, { type DemoStatus } from './DemoFrame';

type Group = 'U(1)' | 'SU(2)';
type SweepResp = {
  group: Group;
  L: number;
  beta: number;
  state: unknown;
  plaquette_grid: number[][];
  history: { action: number; avg_plaq: number }[];
  regime: 'confined' | 'deconfined';
};

const ENDPOINT = MODAL.lattice;

export default function LatticeGaugeDemo() {
  const [group, setGroup] = useState<Group>('U(1)');
  const [L, setL] = useState(8);
  const [beta, setBeta] = useState(1.5);
  const [sweeps, setSweeps] = useState(30);
  const [seed, setSeed] = useState(7);

  const [status, setStatus] = useState<DemoStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<SweepResp | null>(null);
  const [accumHistory, setAccumHistory] = useState<{ action: number; avg_plaq: number }[]>([]);

  const run = async (continuing: boolean) => {
    setStatus('loading');
    setError(null);
    try {
      const body: Record<string, unknown> = {
        group, L, beta, sweeps, seed: continuing ? seed + accumHistory.length : seed,
      };
      if (continuing && resp) body.state = resp.state;
      const r = await jsonPost<SweepResp>(ENDPOINT, '/sweep', body);
      setResp(r);
      setAccumHistory((h) => continuing ? [...h, ...r.history] : r.history);
      setStatus('done');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  };

  const reset = () => {
    setResp(null);
    setAccumHistory([]);
    setStatus('idle');
  };

  return (
    <DemoFrame
      title={`Wilson lattice · ${group}`}
      status={status}
      statusLabel={resp ? `${accumHistory.length} sweeps · ${resp.regime.toUpperCase()}` : undefined}
      error={error}
    >
      <div className="lg-grid">
        <div className="lg-controls">
          <Field label="Gauge group">
            <select value={group} onChange={(e) => { setGroup(e.target.value as Group); reset(); }}>
              <option value="U(1)">U(1)</option>
              <option value="SU(2)">SU(2)</option>
            </select>
          </Field>
          <Field label={`Lattice size L = ${L}`}>
            <input type="range" min={4} max={20} value={L}
                   onChange={(e) => { setL(Number(e.target.value)); reset(); }} />
          </Field>
          <Field label={`β = ${beta.toFixed(2)}`}>
            <input type="range" min={0.1} max={4} step={0.1} value={beta}
                   onChange={(e) => setBeta(Number(e.target.value))} />
          </Field>
          <Field label={`Sweeps = ${sweeps}`}>
            <input type="range" min={5} max={100} value={sweeps}
                   onChange={(e) => setSweeps(Number(e.target.value))} />
          </Field>
          <Field label="Seed">
            <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
          </Field>
          <div className="lg-buttons">
            <button type="button" className="lg-btn" disabled={status === 'loading'}
                    onClick={() => run(resp !== null)}>
              {status === 'loading' ? 'Sweeping…' : resp ? 'Continue sweeps' : 'Initialize + sweep'}
            </button>
            {resp && (
              <button type="button" className="lg-btn lg-btn-ghost" onClick={reset}>
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="lg-results">
          {resp ? (
            <>
              <PlaquetteHeatmap grid={resp.plaquette_grid} />
              <div className="lg-charts">
                <TraceChart label="Wilson action" data={accumHistory.map((h) => h.action)} />
                <TraceChart label="⟨plaquette⟩" data={accumHistory.map((h) => h.avg_plaq)}
                            min={-1} max={1} />
              </div>
              <div className={`lg-regime lg-regime-${resp.regime}`}>
                ● REGIME : {resp.regime.toUpperCase()}
              </div>
            </>
          ) : (
            <div className="lg-empty">Set β + sweeps, then <strong>Initialize + sweep</strong>.</div>
          )}
        </div>
      </div>
      <Styles />
    </DemoFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="lg-field">
      <span className="lg-field-label">{label}</span>
      {children}
    </label>
  );
}

function PlaquetteHeatmap({ grid }: { grid: number[][] }) {
  const L = grid.length;
  const cell = 22;
  return (
    <svg className="lg-heatmap" viewBox={`0 0 ${L * cell} ${L * cell}`}>
      {grid.flatMap((row, y) =>
        row.map((v, x) => {
          const t = (v + 1) / 2;
          const r = Math.round(40 + (180 - 40) * (1 - t));
          const g = Math.round(60 + (255 - 60) * t);
          const b = Math.round(80 + (180 - 80) * (1 - Math.abs(v)));
          return (
            <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell}
                  fill={`rgb(${r},${g},${b})`} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
          );
        })
      )}
    </svg>
  );
}

function TraceChart({ label, data, min, max }: { label: string; data: number[]; min?: number; max?: number }) {
  const W = 320; const H = 100; const pad = 24;
  if (!data.length) return null;
  const ymin = min ?? Math.min(...data);
  const ymax = max ?? Math.max(...data);
  const span = Math.max(ymax - ymin, 1e-9);
  const path = data.map((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (W - 2 * pad);
    const y = H - pad - ((v - ymin) / span) * (H - 2 * pad);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div className="lg-trace">
      <span className="lg-trace-label">{label}</span>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--rule)" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--rule)" />
        <path d={path} fill="none" stroke="var(--phosphor)" strokeWidth={1.5} />
      </svg>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .lg-grid { display: grid; grid-template-columns: minmax(220px,260px) 1fr; gap: 1.5rem; }
      @media (max-width: 760px) { .lg-grid { grid-template-columns: 1fr; } }
      .lg-controls { display: flex; flex-direction: column; gap: 0.75rem; }
      .lg-field { display: flex; flex-direction: column; gap: 0.25rem; }
      .lg-field-label {
        font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.1em;
        text-transform: uppercase; color: var(--bone-dim);
      }
      .lg-field input, .lg-field select {
        background: var(--ink); color: var(--bone);
        border: 1px solid var(--rule); padding: 0.35rem 0.5rem;
        font-family: var(--mono); font-size: 0.85rem;
      }
      .lg-buttons { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
      .lg-btn {
        background: var(--phosphor); color: var(--ink); border: 0;
        padding: 0.6rem 1.1rem; font-family: var(--mono); font-size: 0.78rem;
        letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;
      }
      .lg-btn:disabled { opacity: 0.4; }
      .lg-btn-ghost { background: transparent; color: var(--bone-dim); border: 1px solid var(--rule); }
      .lg-results { display: flex; flex-direction: column; gap: 0.75rem; }
      .lg-heatmap { width: 100%; aspect-ratio: 1; background: var(--ink); border: 1px solid var(--rule); }
      .lg-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
      @media (max-width: 540px) { .lg-charts { grid-template-columns: 1fr; } }
      .lg-trace { display: flex; flex-direction: column; gap: 0.25rem; }
      .lg-trace-label {
        font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.1em;
        text-transform: uppercase; color: var(--bone-dim);
      }
      .lg-trace svg { width: 100%; height: 100px; background: var(--ink); border: 1px solid var(--rule); }
      .lg-empty {
        padding: 2rem; text-align: center; border: 1px dashed var(--rule);
        font-family: var(--mono); font-size: 0.85rem; color: var(--bone-dim);
      }
      .lg-regime {
        padding: 0.5rem 0.75rem; font-family: var(--mono);
        font-size: 0.78rem; letter-spacing: 0.16em; border: 1px solid var(--rule);
      }
      .lg-regime-deconfined { color: var(--phosphor); border-color: var(--phosphor); }
      .lg-regime-confined { color: var(--amber, #f5b94a); border-color: var(--amber, #f5b94a); }
    `}</style>
  );
}
