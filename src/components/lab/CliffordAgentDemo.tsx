/**
 * Clifford-agent demo. Two modes, sharing the same algebra picker:
 *  - Equivariance check: POST /equivariance with x + transform,
 *    show ‖f(g·x) − g·f(x)‖ per grade.
 *  - Classifier: POST /classify, plot training curve + confusion.
 */

import { useState } from 'react';
import { MODAL } from '../../lib/config';
import { jsonPost } from '../../lib/modal-client';
import DemoFrame, { type DemoStatus } from './DemoFrame';

type Mode = 'equivariance' | 'classifier';
type Algebra = 'Cl(3,0)' | 'Cl(3,1)';
type Transform = 'rotation' | 'boost' | 'reflection';

type EquivResp = {
  algebra: Algebra;
  dim: number;
  x: number[];
  f_x: number[];
  g_x: number[];
  f_g_x: number[];
  g_f_x: number[];
  equivariance_error: number;
  per_grade: { grade: number; x_norm: number; fx_norm: number; equiv_err: number }[];
};

type ClassifyResp = {
  angles: number[];
  head: number[];
  history: { epoch: number; loss: number; accuracy: number }[];
  test_accuracy: number;
  confusion: { tp: number; tn: number; fp: number; fn: number };
};

const ENDPOINT = MODAL.clifford;

export default function CliffordAgentDemo() {
  const [mode, setMode] = useState<Mode>('equivariance');
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // equivariance mode
  const [algebra, setAlgebra] = useState<Algebra>('Cl(3,0)');
  const [x, setX] = useState<number[]>([1, 0, 0]);
  const [transform, setTransform] = useState<Transform>('rotation');
  const [theta, setTheta] = useState(0.4);
  const [layerSeed, setLayerSeed] = useState(3);
  const [equiv, setEquiv] = useState<EquivResp | null>(null);

  // classifier mode
  const [nEach, setNEach] = useState(120);
  const [epochs, setEpochs] = useState(30);
  const [lr, setLr] = useState(0.1);
  const [clsSeed, setClsSeed] = useState(7);
  const [cls, setCls] = useState<ClassifyResp | null>(null);

  const xLen = algebra === 'Cl(3,1)' ? 4 : 3;
  const xx = [...x, 0, 0, 0, 0].slice(0, xLen);

  const runEquiv = async () => {
    setStatus('loading');
    setError(null);
    try {
      const r = await jsonPost<EquivResp>(ENDPOINT, '/equivariance', {
        algebra, x: xx, transform, theta, layer_seed: layerSeed,
      });
      setEquiv(r);
      setStatus('done');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  };

  const runClassify = async () => {
    setStatus('loading');
    setError(null);
    try {
      const r = await jsonPost<ClassifyResp>(ENDPOINT, '/classify', {
        n_each: nEach, epochs, lr, seed: clsSeed,
      });
      setCls(r);
      setStatus('done');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  };

  return (
    <DemoFrame title="Clifford agent" status={status} error={error}>
      <div className="ca-modes">
        {(['equivariance', 'classifier'] as Mode[]).map((m) => (
          <button key={m} type="button"
                  className={`ca-mode ${mode === m ? 'active' : ''}`}
                  onClick={() => setMode(m)}>{m === 'equivariance' ? 'Equivariance check' : 'LIGO classifier'}</button>
        ))}
      </div>

      {mode === 'equivariance' ? (
        <div className="ca-grid">
          <div className="ca-controls">
            <Field label="Algebra">
              <select value={algebra} onChange={(e) => setAlgebra(e.target.value as Algebra)}>
                <option value="Cl(3,0)">Cl(3,0) — Euclidean</option>
                <option value="Cl(3,1)">Cl(3,1) — Minkowski</option>
              </select>
            </Field>
            <Field label={`x (grade-1, ${xLen} components)`}>
              <div className="ca-xrow">
                {Array.from({ length: xLen }).map((_, i) => (
                  <input key={i} type="number" step={0.1} value={xx[i]}
                         onChange={(e) => {
                           const next = [...xx]; next[i] = Number(e.target.value); setX(next);
                         }} />
                ))}
              </div>
            </Field>
            <Field label="Transform">
              <select value={transform} onChange={(e) => setTransform(e.target.value as Transform)}>
                <option value="rotation">rotation</option>
                {algebra === 'Cl(3,1)' && <option value="boost">boost</option>}
                <option value="reflection">reflection</option>
              </select>
            </Field>
            <Field label={`θ = ${theta.toFixed(2)}`}>
              <input type="range" min={-3.14} max={3.14} step={0.05} value={theta}
                     onChange={(e) => setTheta(Number(e.target.value))} />
            </Field>
            <Field label="Layer seed">
              <input type="number" value={layerSeed}
                     onChange={(e) => setLayerSeed(Number(e.target.value))} />
            </Field>
            <button type="button" className="ca-btn" disabled={status === 'loading'} onClick={runEquiv}>
              {status === 'loading' ? 'Computing…' : 'Check equivariance'}
            </button>
          </div>

          <div className="ca-out">
            {equiv ? (
              <>
                <div className="ca-metrics">
                  <Metric label="Equivariance error" value={equiv.equivariance_error.toExponential(2)}
                          good={equiv.equivariance_error < 1e-9} />
                  <Metric label="Algebra" value={equiv.algebra} />
                  <Metric label="Multivector dim" value={String(equiv.dim)} />
                </div>
                <table className="ca-table">
                  <thead><tr><th>grade</th><th>‖x‖</th><th>‖f(x)‖</th><th>‖f(g·x) − g·f(x)‖</th></tr></thead>
                  <tbody>
                    {equiv.per_grade.map((r) => (
                      <tr key={r.grade}>
                        <td>{r.grade}</td>
                        <td>{r.x_norm.toFixed(3)}</td>
                        <td>{r.fx_norm.toFixed(3)}</td>
                        <td style={{ color: r.equiv_err < 1e-9 ? 'var(--phosphor)' : '#e35a5a' }}>
                          {r.equiv_err.toExponential(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="ca-empty">Set x and a transform, then <strong>Check equivariance</strong>.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="ca-grid">
          <div className="ca-controls">
            <Field label={`Examples / class = ${nEach}`}>
              <input type="range" min={30} max={400} value={nEach}
                     onChange={(e) => setNEach(Number(e.target.value))} />
            </Field>
            <Field label={`Epochs = ${epochs}`}>
              <input type="range" min={5} max={120} value={epochs}
                     onChange={(e) => setEpochs(Number(e.target.value))} />
            </Field>
            <Field label="Learning rate">
              <input type="number" step={0.01} value={lr}
                     onChange={(e) => setLr(Number(e.target.value))} />
            </Field>
            <Field label="Seed">
              <input type="number" value={clsSeed}
                     onChange={(e) => setClsSeed(Number(e.target.value))} />
            </Field>
            <button type="button" className="ca-btn" disabled={status === 'loading'} onClick={runClassify}>
              {status === 'loading' ? 'Training…' : 'Train classifier'}
            </button>
          </div>

          <div className="ca-out">
            {cls ? (
              <>
                <div className="ca-metrics">
                  <Metric label="Test accuracy" value={`${(cls.test_accuracy * 100).toFixed(1)}%`} />
                  <Metric label="TP" value={String(cls.confusion.tp)} />
                  <Metric label="FP" value={String(cls.confusion.fp)} />
                  <Metric label="FN" value={String(cls.confusion.fn)} />
                </div>
                <TrainingCurve history={cls.history} />
              </>
            ) : (
              <div className="ca-empty">Pick params, then <strong>Train classifier</strong>.</div>
            )}
          </div>
        </div>
      )}
      <Styles />
    </DemoFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="ca-field"><span className="ca-field-label">{label}</span>{children}</label>;
}

function Metric({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="ca-metric">
      <span className="ca-metric-label">{label}</span>
      <span className="ca-metric-value" style={good !== undefined
        ? { color: good ? 'var(--phosphor)' : 'var(--amber, #f5b94a)' } : undefined}>{value}</span>
    </div>
  );
}

function TrainingCurve({ history }: { history: { epoch: number; loss: number; accuracy: number }[] }) {
  const W = 520; const H = 220; const pad = 32;
  if (!history.length) return null;
  const losses = history.map((h) => h.loss);
  const accs = history.map((h) => h.accuracy);
  const lossMax = Math.max(...losses, 0.1);
  const xScale = (i: number) => pad + (i / Math.max(history.length - 1, 1)) * (W - 2 * pad);
  const lossY = (v: number) => H - pad - (v / lossMax) * (H - 2 * pad);
  const accY = (v: number) => H - pad - v * (H - 2 * pad);
  const path = (ys: number[], yFn: (v: number) => number) =>
    ys.map((y, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yFn(y)}`).join(' ');
  return (
    <svg className="ca-curve" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--rule)" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--rule)" />
      <path d={path(losses, lossY)} fill="none" stroke="var(--phosphor)" strokeWidth={1.5} />
      <path d={path(accs, accY)} fill="none" stroke="var(--violet-glow, #b08dff)" strokeWidth={1.5} />
      <text x={pad + 4} y={pad + 12} fontFamily="var(--mono)" fontSize="10" fill="var(--bone-dim)">
        <tspan fill="var(--phosphor)">— loss</tspan>
        <tspan dx="12" fill="var(--violet-glow, #b08dff)">— accuracy</tspan>
      </text>
    </svg>
  );
}

function Styles() {
  return (
    <style>{`
      .ca-modes {
        display: flex; gap: 0.25rem; border-bottom: 1px solid var(--rule); margin-bottom: 1rem;
      }
      .ca-mode {
        background: none; border: 0; padding: 0.5rem 0.9rem;
        font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.1em;
        text-transform: uppercase; color: var(--bone-dim); cursor: pointer;
        border-bottom: 2px solid transparent;
      }
      .ca-mode.active { color: var(--phosphor); border-bottom-color: var(--phosphor); }
      .ca-grid { display: grid; grid-template-columns: minmax(220px,260px) 1fr; gap: 1.5rem; }
      @media (max-width: 760px) { .ca-grid { grid-template-columns: 1fr; } }
      .ca-controls { display: flex; flex-direction: column; gap: 0.75rem; }
      .ca-field { display: flex; flex-direction: column; gap: 0.25rem; }
      .ca-field-label {
        font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.1em;
        text-transform: uppercase; color: var(--bone-dim);
      }
      .ca-field input, .ca-field select {
        background: var(--ink); color: var(--bone); border: 1px solid var(--rule);
        padding: 0.35rem 0.5rem; font-family: var(--mono); font-size: 0.85rem;
      }
      .ca-xrow { display: flex; gap: 0.3rem; }
      .ca-xrow input { flex: 1; min-width: 0; }
      .ca-btn {
        background: var(--phosphor); color: var(--ink); border: 0;
        padding: 0.6rem 1.1rem; font-family: var(--mono); font-size: 0.78rem;
        letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;
      }
      .ca-btn:disabled { opacity: 0.4; }
      .ca-out { display: flex; flex-direction: column; gap: 0.75rem; }
      .ca-metrics {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem;
      }
      .ca-metric { border: 1px solid var(--rule); padding: 0.4rem 0.6rem; }
      .ca-metric-label {
        display: block; font-family: var(--mono); font-size: 0.65rem;
        letter-spacing: 0.1em; text-transform: uppercase; color: var(--bone-dim);
      }
      .ca-metric-value { font-family: var(--mono); font-size: 1rem; color: var(--phosphor); }
      .ca-table {
        width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 0.82rem;
      }
      .ca-table th, .ca-table td {
        border-bottom: 1px solid var(--rule); padding: 0.3rem 0.6rem; text-align: left;
      }
      .ca-table th {
        color: var(--bone-dim); font-weight: 400; font-size: 0.7rem;
        letter-spacing: 0.1em; text-transform: uppercase;
      }
      .ca-curve { width: 100%; height: auto; background: var(--ink); border: 1px solid var(--rule); }
      .ca-empty {
        padding: 2rem; text-align: center; border: 1px dashed var(--rule);
        font-family: var(--mono); font-size: 0.85rem; color: var(--bone-dim);
      }
    `}</style>
  );
}
