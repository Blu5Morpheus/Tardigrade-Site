/**
 * Page-curve demo. POST /curve returns per-model entropy curves +
 * the leading-order analytical reference + a focus-cut eigenvalue
 * spectrum. We plot all curves on one axes and the spectrum on a
 * separate log-axis chart.
 */

import { useState } from 'react';
import { MODAL } from '../../lib/config';
import { jsonPost } from '../../lib/modal-client';
import DemoFrame, { type DemoStatus } from './DemoFrame';

type Model = 'haar' | 'clifford' | 'thermal';
type Resp = {
  N: number;
  subsystem_sizes: number[];
  curves: Record<string, number[]>;
  page_analytical: number[];
  n_page: number;
  focus_n: number;
  focus_spectrum: number[];
};

const ENDPOINT = MODAL.pageCurve;
const COLORS: Record<Model, string> = {
  haar: 'var(--phosphor)',
  clifford: 'var(--violet-glow, #b08dff)',
  thermal: 'var(--amber, #f5b94a)',
};

export default function PageCurveDemo() {
  const [N, setN] = useState(8);
  const [samples, setSamples] = useState(8);
  const [focusN, setFocusN] = useState(4);
  const [models, setModels] = useState<Model[]>(['haar', 'thermal']);
  const [seed, setSeed] = useState(42);
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<Resp | null>(null);

  const run = async () => {
    if (!models.length) {
      setError('Select at least one model');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const r = await jsonPost<Resp>(ENDPOINT, '/curve', {
        N, models, samples, focus_n: focusN, seed,
      });
      setResp(r);
      setStatus('done');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  };

  const toggle = (m: Model) =>
    setModels((s) => s.includes(m) ? s.filter((x) => x !== m) : [...s, m]);

  return (
    <DemoFrame title="Page curve · Haar entropies" status={status} error={error}>
      <div className="pc-grid">
        <div className="pc-controls">
          <Field label={`N qubits = ${N}`}>
            <input type="range" min={4} max={12} value={N}
                   onChange={(e) => setN(Number(e.target.value))} />
          </Field>
          <Field label={`Realizations = ${samples}`}>
            <input type="range" min={1} max={40} value={samples}
                   onChange={(e) => setSamples(Number(e.target.value))} />
          </Field>
          <Field label={`Focus cut n = ${focusN}`}>
            <input type="range" min={0} max={N} value={focusN}
                   onChange={(e) => setFocusN(Number(e.target.value))} />
          </Field>
          <Field label="Models">
            <div className="pc-models">
              {(['haar', 'clifford', 'thermal'] as Model[]).map((m) => (
                <label key={m} className="pc-check">
                  <input type="checkbox" checked={models.includes(m)} onChange={() => toggle(m)} />
                  <span style={{ color: COLORS[m] }}>{m}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Seed">
            <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
          </Field>
          <button type="button" className="pc-btn" disabled={status === 'loading'} onClick={run}>
            {status === 'loading' ? 'Computing…' : 'Compute curves'}
          </button>
        </div>

        <div className="pc-plots">
          {resp ? (
            <>
              <CurveChart resp={resp} />
              <SpectrumChart eigs={resp.focus_spectrum} focusN={resp.focus_n} />
            </>
          ) : (
            <div className="pc-empty">Pick a system size and press <strong>Compute curves</strong>.</div>
          )}
        </div>
      </div>
      <Styles />
    </DemoFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="pc-field">
      <span className="pc-field-label">{label}</span>
      {children}
    </label>
  );
}

function CurveChart({ resp }: { resp: Resp }) {
  const W = 520; const H = 280; const pad = 36;
  const xs = resp.subsystem_sizes;
  const ymax = Math.max(
    ...Object.values(resp.curves).flat(),
    ...resp.page_analytical,
  );
  const xScale = (n: number) => pad + (n / Math.max(resp.N, 1)) * (W - 2 * pad);
  const yScale = (v: number) => H - pad - (v / Math.max(ymax, 1e-9)) * (H - 2 * pad);

  const linePath = (ys: number[]) =>
    ys.map((y, i) => `${i === 0 ? 'M' : 'L'} ${xScale(xs[i])} ${yScale(y)}`).join(' ');

  return (
    <svg className="pc-curve" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--rule)" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--rule)" />
      <line x1={xScale(resp.n_page)} y1={pad} x2={xScale(resp.n_page)} y2={H - pad}
            stroke="var(--amber, #f5b94a)" strokeDasharray="3 3" />
      <path d={linePath(resp.page_analytical)} fill="none" stroke="var(--bone-dim)"
            strokeDasharray="4 4" strokeWidth={1} />
      {Object.entries(resp.curves).map(([model, ys]) => (
        <path key={model} d={linePath(ys)} fill="none"
              stroke={COLORS[model as Model] ?? 'var(--bone)'} strokeWidth={1.6} />
      ))}
      {/* axis labels */}
      <text x={W / 2} y={H - 6} fontFamily="var(--mono)" fontSize="10" fill="var(--bone-dim)"
            textAnchor="middle">subsystem size n</text>
      <text x={10} y={H / 2} fontFamily="var(--mono)" fontSize="10" fill="var(--bone-dim)"
            transform={`rotate(-90 10 ${H / 2})`} textAnchor="middle">S(ρ_A)  bits</text>
      <text x={xScale(resp.n_page) + 4} y={pad + 12} fontFamily="var(--mono)" fontSize="9"
            fill="var(--amber, #f5b94a)">n = N/2</text>
    </svg>
  );
}

function SpectrumChart({ eigs, focusN }: { eigs: number[]; focusN: number }) {
  const W = 520; const H = 180; const pad = 36;
  if (!eigs.length) return null;
  const logs = eigs.map((e) => Math.log10(Math.max(e, 1e-12)));
  const ymin = Math.min(...logs);
  const ymax = Math.max(...logs);
  const span = Math.max(ymax - ymin, 1e-6);
  const path = eigs.map((_, i) => {
    const x = pad + (i / Math.max(eigs.length - 1, 1)) * (W - 2 * pad);
    const y = H - pad - ((logs[i] - ymin) / span) * (H - 2 * pad);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="pc-curve" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--rule)" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--rule)" />
      <path d={path} fill="none" stroke="var(--phosphor)" strokeWidth={1.5} />
      <text x={W / 2} y={H - 6} fontFamily="var(--mono)" fontSize="10" fill="var(--bone-dim)"
            textAnchor="middle">rank  ·  log₁₀ eigenvalue · ρ_A at n = {focusN}</text>
    </svg>
  );
}

function Styles() {
  return (
    <style>{`
      .pc-grid { display: grid; grid-template-columns: minmax(220px,260px) 1fr; gap: 1.5rem; }
      @media (max-width: 760px) { .pc-grid { grid-template-columns: 1fr; } }
      .pc-controls { display: flex; flex-direction: column; gap: 0.75rem; }
      .pc-field { display: flex; flex-direction: column; gap: 0.25rem; }
      .pc-field-label {
        font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.1em;
        text-transform: uppercase; color: var(--bone-dim);
      }
      .pc-field input[type="number"] {
        background: var(--ink); color: var(--bone); border: 1px solid var(--rule);
        padding: 0.35rem 0.5rem; font-family: var(--mono);
      }
      .pc-models { display: flex; flex-direction: column; gap: 0.25rem; }
      .pc-check {
        display: flex; gap: 0.4rem; align-items: center;
        font-family: var(--mono); font-size: 0.82rem;
      }
      .pc-btn {
        margin-top: 0.5rem;
        background: var(--phosphor); color: var(--ink); border: 0;
        padding: 0.6rem 1.1rem; font-family: var(--mono); font-size: 0.78rem;
        letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;
      }
      .pc-btn:disabled { opacity: 0.4; }
      .pc-plots { display: flex; flex-direction: column; gap: 0.75rem; }
      .pc-curve { width: 100%; height: auto; background: var(--ink); border: 1px solid var(--rule); }
      .pc-empty {
        padding: 2rem; text-align: center; border: 1px dashed var(--rule);
        font-family: var(--mono); font-size: 0.85rem; color: var(--bone-dim);
      }
    `}</style>
  );
}
