/**
 * VQE-LIGO React island — talks to tardigrade-vqe Modal app.
 *
 * Controls (sidebar style on wide screens, stacked on narrow):
 *   class count (2 or 4), depth, Hodge generator, optimizer, lr, epochs.
 *
 * Watch panel (right column):
 *   live training stream from /train_stream (SSE) — plots loss + accuracy
 *   per epoch, plus the stabilizer baseline as a horizontal reference.
 *
 * Inspector tab:
 *   /encode on a single strain window — shows the Cl(3,0) multivector
 *   and its 8 Pauli decomposition, demystifying the "GW effective
 *   Hamiltonian" claim.
 *
 * Ground-state tab:
 *   /ground on a single strain — runs proper VQE on H(s), reports the
 *   exact eigenvalue alongside the trained ⟨H⟩.
 */

import { useEffect, useRef, useState } from 'react';
import { MODAL } from '../../lib/config';
import { jsonGet, jsonPost, sseStream } from '../../lib/modal-client';
import DemoFrame, { type DemoStatus } from './DemoFrame';

type Optimizer = 'Adam' | 'Nesterov' | 'SPSA';
type Tab = 'train' | 'inspect' | 'ground';

interface EpochPoint {
  epoch: number;
  loss: number;
  accuracy: number | null;
}

interface PauliTerm {
  pauli: string;
  coefficient: number;
  blade: string;
}

interface EncodeResp {
  multivector: Record<string, number>;
  pauli_terms: PauliTerm[];
}

interface GroundResp {
  exact_ground_energy: number;
  vqe_energy: number;
  gap: number;
  trace: { epoch: number; energy: number }[];
}

interface FixtureResp {
  sample_rate: number;
  chirps: number[][];
  glitches: number[][];
}

const ENDPOINT = MODAL.vqe;

export default function VqeLigoDemo() {
  const [tab, setTab] = useState<Tab>('train');

  // ── training config
  const [nPerClass, setNPerClass] = useState(80);
  const [nClasses, setNClasses] = useState<2 | 4>(2);
  const [depth, setDepth] = useState(3);
  const [useHodge, setUseHodge] = useState(true);
  const [optimizer, setOptimizer] = useState<Optimizer>('Adam');
  const [lr, setLr] = useState(0.05);
  const [epochs, setEpochs] = useState(15);
  const [seed, setSeed] = useState(42);

  // ── live training state
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<EpochPoint[]>([]);
  const [stabilizerBaseline, setStabilizerBaseline] = useState<number | null>(null);
  const [finalAcc, setFinalAcc] = useState<number | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  // ── inspector state
  const [encoded, setEncoded] = useState<EncodeResp | null>(null);
  const [encodeBusy, setEncodeBusy] = useState(false);
  const [fixture, setFixture] = useState<FixtureResp | null>(null);
  const [fixtureIdx, setFixtureIdx] = useState(0);
  const [fixtureKind, setFixtureKind] = useState<'chirps' | 'glitches'>('chirps');

  // ── ground-state state
  const [ground, setGround] = useState<GroundResp | null>(null);
  const [groundBusy, setGroundBusy] = useState(false);

  useEffect(() => () => cancelRef.current?.(), []);

  // Lazy-load a 8-sample fixture for the inspector + ground panes
  useEffect(() => {
    if (tab === 'train') return;
    if (fixture) return;
    (async () => {
      try {
        const data = await jsonGet<FixtureResp>(ENDPOINT, '/fixture?n_per_class=4&seed=42');
        setFixture(data);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [tab, fixture]);

  const startTraining = () => {
    cancelRef.current?.();
    setStatus('loading');
    setError(null);
    setHistory([]);
    setStabilizerBaseline(null);
    setFinalAcc(null);
    cancelRef.current = sseStream(
      ENDPOINT,
      '/train_stream',
      {
        n_per_class: nPerClass,
        n_classes: nClasses,
        depth,
        use_hodge: useHodge,
        optimizer,
        lr,
        epochs,
        seed,
      },
      {
        onEvent: (eventName, data) => {
          const d = data as Record<string, unknown>;
          if (eventName === 'baseline') {
            setStabilizerBaseline(d.stabilizer_accuracy as number);
            setStatus('streaming');
          } else if (eventName === 'epoch') {
            setHistory((h) => [
              ...h,
              {
                epoch: d.epoch as number,
                loss: d.loss as number,
                accuracy: (d.accuracy as number | null) ?? null,
              },
            ]);
          } else if (eventName === 'done') {
            setFinalAcc(d.final_accuracy as number);
            setStatus('done');
          } else if (eventName === 'error') {
            setError(String(d.message));
            setStatus('error');
          }
        },
        onError: (err) => {
          setError(err.message);
          setStatus('error');
        },
      },
    );
  };

  const cancelTraining = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setStatus('idle');
  };

  const currentStrain = fixture
    ? fixture[fixtureKind][fixtureIdx] ?? null
    : null;

  const runEncode = async () => {
    if (!currentStrain) return;
    setEncodeBusy(true);
    setError(null);
    try {
      const resp = await jsonPost<EncodeResp>(ENDPOINT, '/encode', {
        strain: currentStrain,
      });
      setEncoded(resp);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEncodeBusy(false);
    }
  };

  const runGround = async () => {
    if (!currentStrain) return;
    setGroundBusy(true);
    setError(null);
    try {
      const resp = await jsonPost<GroundResp>(ENDPOINT, '/ground', {
        strain: currentStrain,
        depth,
        use_hodge: useHodge,
        optimizer,
        lr,
        epochs: 40,
        seed,
      });
      setGround(resp);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGroundBusy(false);
    }
  };

  const statusLabel = status === 'streaming'
    ? `EPOCH ${history.length} / ${epochs}`
    : undefined;

  return (
    <DemoFrame
      title="VQE × LIGO — Clifford+T over GW Hamiltonian"
      status={status}
      statusLabel={statusLabel}
      error={error}
    >
      <div className="vqe-tabs">
        {(['train', 'inspect', 'ground'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`vqe-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'train' ? 'Train classifier' : t === 'inspect' ? 'Inspect H(s)' : 'Ground state'}
          </button>
        ))}
      </div>

      {tab === 'train' && (
        <div className="vqe-grid">
          <div className="vqe-controls">
            <Field label="Examples / class">
              <input type="number" min={20} max={300} value={nPerClass}
                     onChange={(e) => setNPerClass(Number(e.target.value))} />
            </Field>
            <Field label="Classes">
              <select value={nClasses} onChange={(e) => setNClasses(Number(e.target.value) as 2 | 4)}>
                <option value={2}>2 (chirp / glitch)</option>
                <option value={4}>4 (BBH / BNS / ECO / Beyond-GR)</option>
              </select>
            </Field>
            <Field label="Depth (Clifford+T layers)">
              <input type="range" min={1} max={6} value={depth}
                     onChange={(e) => setDepth(Number(e.target.value))} />
              <span className="vqe-val">{depth}</span>
            </Field>
            <Field label="Optimizer">
              <select value={optimizer} onChange={(e) => setOptimizer(e.target.value as Optimizer)}>
                <option value="Adam">Adam</option>
                <option value="Nesterov">Nesterov</option>
                <option value="SPSA">SPSA</option>
              </select>
            </Field>
            <Field label="Learning rate">
              <input type="number" step={0.005} min={0.001} max={1} value={lr}
                     onChange={(e) => setLr(Number(e.target.value))} />
            </Field>
            <Field label="Epochs">
              <input type="range" min={5} max={50} value={epochs}
                     onChange={(e) => setEpochs(Number(e.target.value))} />
              <span className="vqe-val">{epochs}</span>
            </Field>
            <Field label="Seed">
              <input type="number" value={seed}
                     onChange={(e) => setSeed(Number(e.target.value))} />
            </Field>
            <label className="vqe-check">
              <input type="checkbox" checked={useHodge}
                     onChange={(e) => setUseHodge(e.target.checked)} />
              Include Hodge-dual generator (X₀Y₁X₂)
            </label>
            <div className="vqe-buttons">
              {status === 'streaming' || status === 'loading' ? (
                <button type="button" className="vqe-btn vqe-btn-stop" onClick={cancelTraining}>
                  Cancel
                </button>
              ) : (
                <button type="button" className="vqe-btn" onClick={startTraining}>
                  Train classifier
                </button>
              )}
            </div>
          </div>

          <div className="vqe-watch">
            <LearningCurve
              history={history}
              baseline={stabilizerBaseline}
              targetEpochs={epochs}
            />
            <div className="vqe-metrics">
              <Metric label="Stabilizer baseline (θ=0)" value={stabilizerBaseline != null
                ? `${(stabilizerBaseline * 100).toFixed(1)}%` : '—'} />
              <Metric label="Latest loss" value={history.length
                ? history[history.length - 1].loss.toFixed(4) : '—'} />
              <Metric label="Latest accuracy" value={history.length && history[history.length - 1].accuracy != null
                ? `${(history[history.length - 1].accuracy! * 100).toFixed(1)}%` : '—'} />
              <Metric label="Final" value={finalAcc != null
                ? `${(finalAcc * 100).toFixed(1)}%` : '—'} />
            </div>
            <p className="vqe-note">
              The dashed line is the stabilizer baseline — what the same ansatz
              achieves at θ = 0, with all T-rotations frozen off. Any rise above
              that line is the contribution of non-Clifford resources.
            </p>
          </div>
        </div>
      )}

      {tab === 'inspect' && (
        <div className="vqe-inspect">
          <FixturePicker
            fixture={fixture}
            kind={fixtureKind}
            idx={fixtureIdx}
            onKind={setFixtureKind}
            onIdx={setFixtureIdx}
          />
          <div className="vqe-buttons">
            <button type="button" className="vqe-btn"
                    onClick={runEncode} disabled={!currentStrain || encodeBusy}>
              {encodeBusy ? 'Encoding…' : 'Encode → H(s)'}
            </button>
          </div>
          {encoded && (
            <div className="vqe-encode-out">
              <h4>Cl(3,0) multivector</h4>
              <table className="vqe-table">
                <thead>
                  <tr><th>blade</th><th>coefficient</th></tr>
                </thead>
                <tbody>
                  {Object.entries(encoded.multivector).map(([k, v]) => (
                    <tr key={k}>
                      <td className="vqe-mono">{k}</td>
                      <td className="vqe-mono">{v.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h4>Pauli decomposition of H(s)</h4>
              <table className="vqe-table">
                <thead>
                  <tr><th>blade</th><th>Pauli string</th><th>coefficient</th></tr>
                </thead>
                <tbody>
                  {encoded.pauli_terms.map((t) => (
                    <tr key={t.blade}>
                      <td className="vqe-mono">{t.blade}</td>
                      <td className="vqe-mono">{t.pauli}</td>
                      <td className="vqe-mono">{t.coefficient.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'ground' && (
        <div className="vqe-ground">
          <FixturePicker
            fixture={fixture}
            kind={fixtureKind}
            idx={fixtureIdx}
            onKind={setFixtureKind}
            onIdx={setFixtureIdx}
          />
          <div className="vqe-buttons">
            <button type="button" className="vqe-btn"
                    onClick={runGround} disabled={!currentStrain || groundBusy}>
              {groundBusy ? 'Running VQE…' : 'Run VQE on H(s)'}
            </button>
          </div>
          {ground && (
            <>
              <div className="vqe-metrics">
                <Metric label="Exact ground energy" value={ground.exact_ground_energy.toFixed(5)} />
                <Metric label="VQE ⟨H⟩" value={ground.vqe_energy.toFixed(5)} />
                <Metric label="Gap" value={ground.gap.toFixed(5)} />
              </div>
              <EnergyTrace trace={ground.trace} exact={ground.exact_ground_energy} />
            </>
          )}
        </div>
      )}

      <DemoStyles />
    </DemoFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="vqe-field">
      <span className="vqe-field-label">{label}</span>
      <span className="vqe-field-input">{children}</span>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="vqe-metric">
      <span className="vqe-metric-label">{label}</span>
      <span className="vqe-metric-value">{value}</span>
    </div>
  );
}

function FixturePicker({
  fixture, kind, idx, onKind, onIdx,
}: {
  fixture: FixtureResp | null;
  kind: 'chirps' | 'glitches';
  idx: number;
  onKind: (k: 'chirps' | 'glitches') => void;
  onIdx: (i: number) => void;
}) {
  if (!fixture) return <p className="vqe-note">Loading synthetic fixture…</p>;
  const window = fixture[kind][idx] ?? [];
  return (
    <div className="vqe-fixture">
      <div className="vqe-fixture-controls">
        <Field label="Kind">
          <select value={kind} onChange={(e) => onKind(e.target.value as 'chirps' | 'glitches')}>
            <option value="chirps">chirp</option>
            <option value="glitches">glitch</option>
          </select>
        </Field>
        <Field label="Window index">
          <input type="range" min={0} max={fixture[kind].length - 1} value={idx}
                 onChange={(e) => onIdx(Number(e.target.value))} />
          <span className="vqe-val">{idx}</span>
        </Field>
      </div>
      <Sparkline data={window} />
    </div>
  );
}

function LearningCurve({
  history, baseline, targetEpochs,
}: {
  history: EpochPoint[];
  baseline: number | null;
  targetEpochs: number;
}) {
  const W = 560;
  const H = 220;
  const pad = 28;
  if (history.length === 0) {
    return (
      <div className="vqe-curve-empty">
        Press <strong>Train classifier</strong> to start streaming epochs.
      </div>
    );
  }
  const xs = history.map((h) => h.epoch);
  const losses = history.map((h) => h.loss);
  const lossMax = Math.max(...losses, 0.1);
  const xScale = (e: number) => pad + (e / Math.max(targetEpochs - 1, 1)) * (W - 2 * pad);
  const lossY = (v: number) => H - pad - (v / lossMax) * (H - 2 * pad);
  const accY = (v: number) => H - pad - v * (H - 2 * pad);

  const lossPath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${xScale(x)} ${lossY(losses[i])}`).join(' ');
  const accPts = history.filter((h) => h.accuracy != null);
  const accPath = accPts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${xScale(p.epoch)} ${accY(p.accuracy!)}`
  ).join(' ');

  return (
    <svg className="vqe-curve" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {/* baseline */}
      {baseline != null && (
        <line x1={pad} y1={accY(baseline)} x2={W - pad} y2={accY(baseline)}
              stroke="var(--bone-dim)" strokeDasharray="4 4" strokeWidth={1} />
      )}
      {/* axes */}
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--rule)" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--rule)" />
      {/* paths */}
      <path d={lossPath} fill="none" stroke="var(--phosphor)" strokeWidth={1.5} />
      <path d={accPath} fill="none" stroke="var(--violet-glow, #b08dff)" strokeWidth={1.5} />
      {/* legend */}
      <g fontFamily="var(--mono)" fontSize="10" fill="var(--bone-dim)">
        <text x={pad + 4} y={pad + 12}>
          <tspan fill="var(--phosphor)">— loss</tspan>
          <tspan dx="12" fill="var(--violet-glow, #b08dff)">— accuracy</tspan>
          {baseline != null && (
            <tspan dx="12">- - stabilizer baseline ({(baseline * 100).toFixed(0)}%)</tspan>
          )}
        </text>
      </g>
    </svg>
  );
}

function EnergyTrace({ trace, exact }: { trace: { epoch: number; energy: number }[]; exact: number }) {
  const W = 560;
  const H = 200;
  const pad = 28;
  if (trace.length === 0) return null;
  const energies = trace.map((t) => t.energy);
  const yMin = Math.min(exact, ...energies);
  const yMax = Math.max(exact, ...energies);
  const span = Math.max(yMax - yMin, 1e-3);
  const xScale = (e: number) => pad + (e / Math.max(trace.length - 1, 1)) * (W - 2 * pad);
  const yScale = (v: number) => H - pad - ((v - yMin) / span) * (H - 2 * pad);
  const path = trace.map((t, i) =>
    `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(t.energy)}`
  ).join(' ');
  return (
    <svg className="vqe-curve" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pad} y1={yScale(exact)} x2={W - pad} y2={yScale(exact)}
            stroke="var(--bone-dim)" strokeDasharray="4 4" />
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--rule)" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--rule)" />
      <path d={path} fill="none" stroke="var(--phosphor)" strokeWidth={1.5} />
      <text x={pad + 4} y={pad + 12} fontFamily="var(--mono)" fontSize="10" fill="var(--bone-dim)">
        — ⟨H⟩ trace   - - exact ground energy ({exact.toFixed(3)})
      </text>
    </svg>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const W = 560;
  const H = 80;
  if (!data.length) return null;
  const yMin = Math.min(...data);
  const yMax = Math.max(...data);
  const span = Math.max(yMax - yMin, 1e-9);
  const path = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - yMin) / span) * (H - 4) - 2;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="vqe-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke="var(--phosphor)" strokeWidth={1} />
    </svg>
  );
}

function DemoStyles() {
  return (
    <style>{`
      .vqe-tabs {
        display: flex;
        gap: 0.25rem;
        border-bottom: 1px solid var(--rule);
        margin-bottom: 1rem;
      }
      .vqe-tab {
        background: none;
        border: 0;
        padding: 0.5rem 0.9rem;
        font-family: var(--mono);
        font-size: 0.75rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--bone-dim);
        cursor: pointer;
        border-bottom: 2px solid transparent;
      }
      .vqe-tab.active {
        color: var(--phosphor);
        border-bottom-color: var(--phosphor);
      }
      .vqe-grid {
        display: grid;
        grid-template-columns: minmax(220px, 280px) 1fr;
        gap: 1.5rem;
      }
      @media (max-width: 760px) {
        .vqe-grid { grid-template-columns: 1fr; }
      }
      .vqe-controls { display: flex; flex-direction: column; gap: 0.75rem; }
      .vqe-field {
        display: flex; flex-direction: column; gap: 0.25rem;
      }
      .vqe-field-label {
        font-family: var(--mono);
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--bone-dim);
      }
      .vqe-field-input { display: flex; align-items: center; gap: 0.5rem; }
      .vqe-field-input input[type="number"],
      .vqe-field-input select {
        flex: 1;
        background: var(--ink);
        color: var(--bone);
        border: 1px solid var(--rule);
        padding: 0.35rem 0.5rem;
        font-family: var(--mono);
        font-size: 0.85rem;
      }
      .vqe-field-input input[type="range"] { flex: 1; }
      .vqe-val {
        font-family: var(--mono);
        font-size: 0.8rem;
        color: var(--phosphor);
        min-width: 2.5ch;
        text-align: right;
      }
      .vqe-check {
        display: flex; align-items: center; gap: 0.4rem;
        font-family: var(--mono); font-size: 0.78rem;
        color: var(--bone);
      }
      .vqe-buttons { margin-top: 0.5rem; }
      .vqe-btn {
        background: var(--phosphor);
        color: var(--ink);
        border: 0;
        padding: 0.6rem 1.1rem;
        font-family: var(--mono);
        font-size: 0.78rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        cursor: pointer;
      }
      .vqe-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .vqe-btn-stop { background: #e35a5a; color: white; }
      .vqe-watch { display: flex; flex-direction: column; gap: 0.75rem; }
      .vqe-curve { width: 100%; height: auto; background: var(--ink); border: 1px solid var(--rule); }
      .vqe-curve-empty {
        padding: 2rem;
        text-align: center;
        font-family: var(--mono);
        font-size: 0.85rem;
        color: var(--bone-dim);
        border: 1px dashed var(--rule);
      }
      .vqe-metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.75rem;
      }
      .vqe-metric {
        border: 1px solid var(--rule);
        padding: 0.5rem 0.75rem;
        background: var(--ink);
      }
      .vqe-metric-label {
        display: block;
        font-family: var(--mono);
        font-size: 0.65rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--bone-dim);
        margin-bottom: 0.2rem;
      }
      .vqe-metric-value {
        font-family: var(--mono);
        font-size: 1.1rem;
        color: var(--phosphor);
      }
      .vqe-note {
        font-family: var(--display);
        font-size: 0.9rem;
        color: var(--bone-dim);
        font-style: italic;
      }
      .vqe-inspect, .vqe-ground { display: flex; flex-direction: column; gap: 1rem; }
      .vqe-fixture { display: flex; flex-direction: column; gap: 0.5rem; }
      .vqe-fixture-controls { display: flex; gap: 1rem; flex-wrap: wrap; }
      .vqe-spark { width: 100%; height: 80px; background: var(--ink); border: 1px solid var(--rule); }
      .vqe-encode-out h4 {
        font-family: var(--mono);
        font-size: 0.78rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--phosphor);
        margin: 1rem 0 0.4rem;
      }
      .vqe-table {
        width: 100%;
        border-collapse: collapse;
        font-family: var(--mono);
        font-size: 0.82rem;
      }
      .vqe-table th, .vqe-table td {
        border-bottom: 1px solid var(--rule);
        padding: 0.3rem 0.5rem;
        text-align: left;
      }
      .vqe-table th {
        color: var(--bone-dim);
        font-weight: 400;
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .vqe-mono { color: var(--bone); }
    `}</style>
  );
}
