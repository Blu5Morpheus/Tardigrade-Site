/**
 * Hamiltonian Discovery — HNN training + symbolic distillation.
 *
 * Flow: pick a system → /train → see loss curve + learned-vs-true H
 * heatmaps + energy drift along a held-out trajectory → /distill →
 * see the recovered polynomial equation next to the ground truth.
 */

import { useState } from 'react';
import { MODAL } from '../../lib/config';
import { jsonPost } from '../../lib/modal-client';
import DemoFrame, { type DemoStatus } from './DemoFrame';

type System = 'sho' | 'duffing' | 'henon';

interface TrainResp {
  cache_key: string;
  system: System;
  system_info: { name: string; dim: number; true_H_str: string };
  history: { epoch: number; loss: number }[];
  phase_axes: { q: number[]; p: number[] };
  learned_H: number[][];
  true_H: number[][];
  energy_drift: number[];
  energy_drift_t: number[];
  final_loss: number | null;
}

interface DistillResp {
  expression: string;
  truth_expression: string;
  terms: { term: string; coef: number }[];
  n_terms_total: number;
  alpha: number;
  max_degree: number;
}

const ENDPOINT = MODAL.hnn;

const SYSTEM_LABEL: Record<System, string> = {
  sho: 'Simple harmonic oscillator',
  duffing: 'Duffing (anharmonic)',
  henon: 'Hénon-Heiles',
};

export default function HamiltonianDiscoveryDemo() {
  const [system, setSystem] = useState<System>('sho');
  const [hidden, setHidden] = useState(64);
  const [epochs, setEpochs] = useState(60);
  const [nTraj, setNTraj] = useState(40);
  const [lr, setLr] = useState(0.001);
  const [seed, setSeed] = useState(0);
  const [maxDegree, setMaxDegree] = useState(4);
  const [alpha, setAlpha] = useState(0.001);

  const [status, setStatus] = useState<DemoStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [trainResp, setTrainResp] = useState<TrainResp | null>(null);
  const [distillResp, setDistillResp] = useState<DistillResp | null>(null);
  const [distillBusy, setDistillBusy] = useState(false);

  const runTrain = async () => {
    setStatus('loading');
    setError(null);
    setDistillResp(null);
    try {
      const r = await jsonPost<TrainResp>(ENDPOINT, '/train', {
        system, hidden, epochs, n_traj: nTraj, lr, seed,
        t_max: 8.0, dt: 0.05, batch_size: 128,
      });
      setTrainResp(r);
      setStatus('done');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  };

  const runDistill = async () => {
    if (!trainResp) return;
    setDistillBusy(true);
    setError(null);
    try {
      const r = await jsonPost<DistillResp>(ENDPOINT, '/distill', {
        cache_key: trainResp.cache_key,
        max_degree: maxDegree,
        alpha,
        n_pts: 3000,
        span: 1.5,
      });
      setDistillResp(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDistillBusy(false);
    }
  };

  return (
    <DemoFrame
      title="Hamiltonian discovery · HNN + symbolic distillation"
      status={status}
      error={error}
    >
      <div className="hnn-grid">
        <div className="hnn-controls">
          <Field label="System">
            <select value={system} onChange={(e) => setSystem(e.target.value as System)}>
              <option value="sho">{SYSTEM_LABEL.sho}</option>
              <option value="duffing">{SYSTEM_LABEL.duffing}</option>
              <option value="henon">{SYSTEM_LABEL.henon}</option>
            </select>
          </Field>
          <Field label={`Trajectories = ${nTraj}`}>
            <input type="range" min={10} max={120} value={nTraj}
                   onChange={(e) => setNTraj(Number(e.target.value))} />
          </Field>
          <Field label={`Hidden = ${hidden}`}>
            <input type="range" min={16} max={128} step={16} value={hidden}
                   onChange={(e) => setHidden(Number(e.target.value))} />
          </Field>
          <Field label={`Epochs = ${epochs}`}>
            <input type="range" min={10} max={150} value={epochs}
                   onChange={(e) => setEpochs(Number(e.target.value))} />
          </Field>
          <Field label="Learning rate">
            <input type="number" step={0.0005} value={lr}
                   onChange={(e) => setLr(Number(e.target.value))} />
          </Field>
          <Field label="Seed">
            <input type="number" value={seed}
                   onChange={(e) => setSeed(Number(e.target.value))} />
          </Field>
          <button type="button" className="hnn-btn"
                  disabled={status === 'loading'} onClick={runTrain}>
            {status === 'loading' ? 'Training HNN…' : 'Train HNN'}
          </button>

          {trainResp && (
            <>
              <div className="hnn-divider" />
              <Field label={`Polynomial degree ≤ ${maxDegree}`}>
                <input type="range" min={2} max={6} value={maxDegree}
                       onChange={(e) => setMaxDegree(Number(e.target.value))} />
              </Field>
              <Field label="Lasso α (sparsity)">
                <input type="number" step={0.0005} value={alpha}
                       onChange={(e) => setAlpha(Number(e.target.value))} />
              </Field>
              <button type="button" className="hnn-btn hnn-btn-distill"
                      disabled={distillBusy} onClick={runDistill}>
                {distillBusy ? 'Distilling…' : 'Distill symbolic H'}
              </button>
            </>
          )}
        </div>

        <div className="hnn-results">
          {trainResp ? (
            <>
              <div className="hnn-metrics">
                <Metric label="System" value={SYSTEM_LABEL[trainResp.system]} />
                <Metric label="Final loss"
                        value={trainResp.final_loss != null
                          ? trainResp.final_loss.toExponential(2) : '—'} />
                <Metric label="Truth" value={trainResp.system_info.true_H_str} mono />
              </div>

              <LossChart history={trainResp.history} />

              <div className="hnn-heatmap-row">
                <HeatPanel label="Learned H_θ" axes={trainResp.phase_axes} data={trainResp.learned_H} />
                <HeatPanel label="True H" axes={trainResp.phase_axes} data={trainResp.true_H} />
              </div>

              <EnergyDriftChart trace={trainResp.energy_drift} t={trainResp.energy_drift_t} />

              {distillResp && (
                <div className="hnn-distill">
                  <h4>Recovered symbolic Hamiltonian</h4>
                  <div className="hnn-eqn-pair">
                    <div className="hnn-eqn">
                      <span className="hnn-eqn-label">Discovered (Lasso, deg ≤ {distillResp.max_degree})</span>
                      <code>{distillResp.expression || '0'}</code>
                    </div>
                    <div className="hnn-eqn">
                      <span className="hnn-eqn-label">Ground truth</span>
                      <code>{distillResp.truth_expression}</code>
                    </div>
                  </div>
                  {distillResp.terms.length > 0 && (
                    <table className="hnn-terms">
                      <thead>
                        <tr><th>term</th><th>coefficient</th></tr>
                      </thead>
                      <tbody>
                        {distillResp.terms.map((t, i) => (
                          <tr key={i}>
                            <td className="hnn-mono">{t.term}</td>
                            <td className="hnn-mono"
                                style={{ color: Math.abs(t.coef) > 0.4 ? 'var(--phosphor)' : 'var(--bone-dim)' }}>
                              {t.coef.toFixed(4)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="hnn-empty">
              Pick a system and press <strong>Train HNN</strong>.<br />
              <em>SHO converges in a few seconds; Hénon-Heiles takes ~30s.</em>
            </div>
          )}
        </div>
      </div>
      <Styles />
    </DemoFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="hnn-field"><span className="hnn-field-label">{label}</span>{children}</label>;
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="hnn-metric">
      <span className="hnn-metric-label">{label}</span>
      <span className="hnn-metric-value" style={mono ? { fontSize: '0.78rem' } : undefined}>{value}</span>
    </div>
  );
}

function LossChart({ history }: { history: { epoch: number; loss: number }[] }) {
  const W = 560; const H = 180; const pad = 40;
  if (!history.length) return null;
  const losses = history.map((h) => Math.log10(Math.max(h.loss, 1e-12)));
  const lo = Math.min(...losses), hi = Math.max(...losses);
  const span = Math.max(hi - lo, 1e-6);
  const xScale = (i: number) => pad + (i / Math.max(history.length - 1, 1)) * (W - 2 * pad);
  const yScale = (logv: number) => H - pad - ((logv - lo) / span) * (H - 2 * pad);
  const path = losses.map((l, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(l)}`).join(' ');
  return (
    <svg className="hnn-curve" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--rule)" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--rule)" />
      <path d={path} fill="none" stroke="var(--phosphor)" strokeWidth={1.5} />
      <text x={W / 2} y={H - 6} fontFamily="var(--mono)" fontSize="10" fill="var(--bone-dim)"
            textAnchor="middle">epoch  ·  y: log₁₀ symplectic-residual loss</text>
    </svg>
  );
}

function EnergyDriftChart({ trace, t }: { trace: number[]; t: number[] }) {
  const W = 560; const H = 140; const pad = 40;
  if (!trace.length) return null;
  const lo = Math.min(...trace), hi = Math.max(...trace);
  const span = Math.max(hi - lo, 1e-6);
  const xScale = (i: number) => pad + (i / Math.max(trace.length - 1, 1)) * (W - 2 * pad);
  const yScale = (v: number) => H - pad - ((v - lo) / span) * (H - 2 * pad);
  const path = trace.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`).join(' ');
  const drift = ((hi - lo) / Math.max(Math.abs((hi + lo) / 2), 1e-6)) * 100;
  return (
    <div className="hnn-drift">
      <span className="hnn-drift-label">
        Learned H along held-out trajectory · drift = {drift.toFixed(2)}%
      </span>
      <svg className="hnn-curve" viewBox={`0 0 ${W} ${H}`}>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--rule)" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--rule)" />
        <path d={path} fill="none" stroke="var(--violet-glow, #b08dff)" strokeWidth={1.5} />
      </svg>
    </div>
  );
}

function HeatPanel({ label, axes, data }: { label: string; axes: { q: number[]; p: number[] }; data: number[][] }) {
  const rows = data.length;
  const cols = data[0]?.length ?? 0;
  if (!rows || !cols) return null;
  let lo = Infinity, hi = -Infinity;
  for (const r of data) for (const v of r) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = Math.max(hi - lo, 1e-12);
  const cell = 8;
  return (
    <div className="hnn-heat">
      <span className="hnn-heat-label">{label}</span>
      <svg viewBox={`0 0 ${cols * cell} ${rows * cell}`}>
        {data.flatMap((row, y) =>
          row.map((v, x) => {
            const t = (v - lo) / span;
            const r = Math.round(15 + 115 * t);
            const g = Math.round(20 + 235 * t);
            const b = Math.round(30 + 150 * t);
            return <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell}
                         fill={`rgb(${r},${g},${b})`} />;
          })
        )}
      </svg>
      <span className="hnn-heat-axes">q ∈ [{axes.q[0].toFixed(1)}, {axes.q[axes.q.length - 1].toFixed(1)}],  p same</span>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .hnn-grid { display: grid; grid-template-columns: minmax(220px,280px) 1fr; gap: 1.5rem; }
      @media (max-width: 760px) { .hnn-grid { grid-template-columns: 1fr; } }
      .hnn-controls { display: flex; flex-direction: column; gap: 0.75rem; }
      .hnn-divider { height: 1px; background: var(--rule); margin: 0.5rem 0; }
      .hnn-field { display: flex; flex-direction: column; gap: 0.25rem; }
      .hnn-field-label {
        font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.1em;
        text-transform: uppercase; color: var(--bone-dim);
      }
      .hnn-field input, .hnn-field select {
        background: var(--ink); color: var(--bone); border: 1px solid var(--rule);
        padding: 0.35rem 0.5rem; font-family: var(--mono); font-size: 0.85rem;
      }
      .hnn-btn {
        background: var(--phosphor); color: var(--ink); border: 0;
        padding: 0.6rem 1.1rem; font-family: var(--mono); font-size: 0.78rem;
        letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;
      }
      .hnn-btn:disabled { opacity: 0.4; }
      .hnn-btn-distill { background: var(--violet-glow, #b08dff); }
      .hnn-results { display: flex; flex-direction: column; gap: 0.75rem; }
      .hnn-metrics {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.5rem;
      }
      .hnn-metric { border: 1px solid var(--rule); padding: 0.4rem 0.6rem; }
      .hnn-metric-label {
        display: block; font-family: var(--mono); font-size: 0.65rem;
        letter-spacing: 0.1em; text-transform: uppercase; color: var(--bone-dim);
      }
      .hnn-metric-value { font-family: var(--mono); font-size: 0.92rem; color: var(--phosphor); word-break: break-word; }
      .hnn-curve { width: 100%; height: auto; background: var(--ink); border: 1px solid var(--rule); }
      .hnn-drift { display: flex; flex-direction: column; gap: 0.25rem; }
      .hnn-drift-label {
        font-family: var(--mono); font-size: 0.7rem; color: var(--bone-dim);
        letter-spacing: 0.08em;
      }
      .hnn-heatmap-row {
        display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;
      }
      @media (max-width: 560px) { .hnn-heatmap-row { grid-template-columns: 1fr; } }
      .hnn-heat {
        display: flex; flex-direction: column; gap: 0.2rem;
        border: 1px solid var(--rule); background: var(--ink); padding: 0.3rem;
      }
      .hnn-heat-label {
        font-family: var(--mono); font-size: 0.7rem; color: var(--bone-dim);
        letter-spacing: 0.08em;
      }
      .hnn-heat-axes {
        font-family: var(--mono); font-size: 0.65rem; color: var(--bone-dim);
      }
      .hnn-heat svg { width: 100%; aspect-ratio: 1; display: block; }
      .hnn-empty {
        padding: 2rem; text-align: center; border: 1px dashed var(--rule);
        font-family: var(--mono); font-size: 0.85rem; color: var(--bone-dim);
      }
      .hnn-distill { margin-top: 0.5rem; }
      .hnn-distill h4 {
        font-family: var(--mono); font-size: 0.78rem; letter-spacing: 0.1em;
        text-transform: uppercase; color: var(--violet-glow, #b08dff); margin: 0 0 0.5rem;
      }
      .hnn-eqn-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
      @media (max-width: 760px) { .hnn-eqn-pair { grid-template-columns: 1fr; } }
      .hnn-eqn { border: 1px solid var(--rule); padding: 0.5rem 0.75rem; background: var(--ink); }
      .hnn-eqn-label {
        display: block; font-family: var(--mono); font-size: 0.65rem;
        letter-spacing: 0.1em; text-transform: uppercase; color: var(--bone-dim);
        margin-bottom: 0.3rem;
      }
      .hnn-eqn code {
        font-family: var(--mono); font-size: 0.92rem; color: var(--phosphor);
        word-break: break-word;
      }
      .hnn-terms { width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 0.82rem; margin-top: 0.5rem; }
      .hnn-terms th, .hnn-terms td { border-bottom: 1px solid var(--rule); padding: 0.3rem 0.5rem; text-align: left; }
      .hnn-terms th {
        color: var(--bone-dim); font-weight: 400; font-size: 0.7rem;
        letter-spacing: 0.1em; text-transform: uppercase;
      }
      .hnn-mono { color: var(--bone); }
    `}</style>
  );
}
