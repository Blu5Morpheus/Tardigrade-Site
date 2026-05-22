/**
 * Plasma-MHD React island. Runs an Orszag-Tang vortex on Modal and
 * shows the headline comparison: ∇·B over time on a log axis, Clifford
 * track flat at machine epsilon, naive track blowing up. Side panels
 * render the velocity, current, and B-field magnitude heatmaps from
 * the last snapshot — confirming the dynamics are otherwise sensible.
 */

import { useState } from 'react';
import { MODAL } from '../../lib/config';
import { jsonPost } from '../../lib/modal-client';
import DemoFrame, { type DemoStatus } from './DemoFrame';

interface Snapshot {
  step: number;
  time: number;
  v_mag: number[][];
  B_mag_clifford: number[][];
  B_mag_naive: number[][];
  vorticity: number[][];
  current_jz: number[][];
}

interface RunResp {
  N: number;
  n_steps: number;
  dt: number;
  time_axis: number[];
  div_B_clifford: number[];
  div_B_naive: number[];
  kinetic_energy: number[];
  magnetic_energy_clifford: number[];
  magnetic_energy_naive: number[];
  snapshots: Snapshot[];
  note: string;
}

const ENDPOINT = MODAL.plasmaMhd;

export default function PlasmaMHDDemo() {
  const [N, setN] = useState(64);
  const [nSteps, setNSteps] = useState(300);
  const [dt, setDt] = useState(0.005);
  const [snapshotEvery, setSnapshotEvery] = useState(30);
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<RunResp | null>(null);
  const [snapIdx, setSnapIdx] = useState(0);

  const run = async () => {
    setStatus('loading');
    setError(null);
    try {
      const r = await jsonPost<RunResp>(ENDPOINT, '/run', {
        N, n_steps: nSteps, dt,
        snapshot_every: snapshotEvery,
        downsample: 48,
      });
      setResp(r);
      setSnapIdx(r.snapshots.length - 1);
      setStatus('done');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  };

  const snap = resp ? resp.snapshots[snapIdx] : null;
  const finalRatio = resp
    ? resp.div_B_naive[resp.div_B_naive.length - 1] /
      Math.max(resp.div_B_clifford[resp.div_B_clifford.length - 1], 1e-30)
    : null;

  return (
    <DemoFrame
      title="Plasma MHD · Clifford bivector vs naive channels"
      status={status}
      error={error}
      statusLabel={resp ? `${resp.n_steps} steps · t=${(resp.n_steps * resp.dt).toFixed(2)}` : undefined}
    >
      <div className="mhd-grid">
        <div className="mhd-controls">
          <Field label={`Grid N = ${N}`}>
            <input type="range" min={32} max={128} step={16} value={N}
                   onChange={(e) => setN(Number(e.target.value))} />
          </Field>
          <Field label={`Time steps = ${nSteps}`}>
            <input type="range" min={50} max={1000} step={50} value={nSteps}
                   onChange={(e) => setNSteps(Number(e.target.value))} />
          </Field>
          <Field label="dt">
            <input type="number" step={0.001} value={dt}
                   onChange={(e) => setDt(Number(e.target.value))} />
          </Field>
          <Field label={`Snapshot every ${snapshotEvery}`}>
            <input type="range" min={5} max={100} value={snapshotEvery}
                   onChange={(e) => setSnapshotEvery(Number(e.target.value))} />
          </Field>
          <button type="button" className="mhd-btn" disabled={status === 'loading'} onClick={run}>
            {status === 'loading' ? 'Evolving plasma…' : 'Run Orszag-Tang'}
          </button>
          <p className="mhd-note">
            Same initial condition for both tracks. Only the <em>representation</em>
            differs: Clifford carries B as a bivector via its potential A, so
            ∇·B = 0 holds at machine ε. Naive evolves B<sub>x</sub>, B<sub>y</sub>
            as independent scalars — gradient noise accumulates.
          </p>
        </div>

        <div className="mhd-results">
          {resp ? (
            <>
              <div className="mhd-metrics">
                <Metric label="Final ∇·B  Clifford"
                        value={resp.div_B_clifford[resp.div_B_clifford.length - 1].toExponential(2)}
                        good />
                <Metric label="Final ∇·B  Naive"
                        value={resp.div_B_naive[resp.div_B_naive.length - 1].toExponential(2)}
                        good={false} />
                <Metric label="Ratio"
                        value={finalRatio != null && Number.isFinite(finalRatio)
                          ? finalRatio.toExponential(1) + '×'
                          : '∞'} />
                <Metric label="Grid" value={`${resp.N}²`} />
              </div>

              <DivergenceChart resp={resp} />

              {snap && (
                <>
                  <div className="mhd-snap-bar">
                    <span>Snapshot t = {snap.time.toFixed(3)} (step {snap.step})</span>
                    <input type="range" min={0} max={resp.snapshots.length - 1} value={snapIdx}
                           onChange={(e) => setSnapIdx(Number(e.target.value))} />
                  </div>
                  <div className="mhd-heatmaps">
                    <Heatmap label="|v|" data={snap.v_mag} cmap="phosphor" />
                    <Heatmap label="|B|  Clifford" data={snap.B_mag_clifford} cmap="violet" />
                    <Heatmap label="|B|  Naive" data={snap.B_mag_naive} cmap="amber" />
                    <Heatmap label="vorticity ω" data={snap.vorticity} cmap="diverging" />
                    <Heatmap label="current j_z" data={snap.current_jz} cmap="diverging" />
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="mhd-empty">Press <strong>Run Orszag-Tang</strong> to evolve the plasma.</div>
          )}
        </div>
      </div>
      <Styles />
    </DemoFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mhd-field"><span className="mhd-field-label">{label}</span>{children}</label>;
}

function Metric({ label, value, good }: { label: string; value: string; good?: boolean }) {
  const color = good === true ? 'var(--phosphor)' : good === false ? '#e35a5a' : 'var(--phosphor)';
  return (
    <div className="mhd-metric">
      <span className="mhd-metric-label">{label}</span>
      <span className="mhd-metric-value" style={{ color }}>{value}</span>
    </div>
  );
}

function DivergenceChart({ resp }: { resp: RunResp }) {
  const W = 560; const H = 220; const pad = 44;
  // log-y for the divergence: both traces can span 18 orders of magnitude
  const all = [...resp.div_B_clifford, ...resp.div_B_naive].filter((v) => v > 0);
  if (!all.length) return null;
  const logmin = Math.log10(Math.max(Math.min(...all), 1e-18));
  const logmax = Math.log10(Math.max(...all, 1));
  const xScale = (i: number) => pad + (i / Math.max(resp.div_B_clifford.length - 1, 1)) * (W - 2 * pad);
  const yScale = (v: number) => H - pad - ((Math.log10(Math.max(v, 1e-30)) - logmin) / Math.max(logmax - logmin, 1e-9)) * (H - 2 * pad);
  const path = (ys: number[]) =>
    ys.map((y, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(y)}`).join(' ');
  return (
    <svg className="mhd-curve" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--rule)" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--rule)" />
      {/* log-decade gridlines */}
      {Array.from({ length: Math.ceil(logmax - logmin) + 1 }).map((_, i) => {
        const v = logmin + i;
        if (v > logmax) return null;
        const y = yScale(Math.pow(10, v));
        return (
          <g key={i}>
            <line x1={pad} y1={y} x2={W - pad} y2={y} stroke="var(--rule)" strokeDasharray="2 3" opacity={0.3} />
            <text x={pad - 4} y={y + 3} fontFamily="var(--mono)" fontSize="9" fill="var(--bone-dim)" textAnchor="end">
              10^{Math.round(v)}
            </text>
          </g>
        );
      })}
      <path d={path(resp.div_B_clifford)} fill="none" stroke="var(--phosphor)" strokeWidth={1.5} />
      <path d={path(resp.div_B_naive)} fill="none" stroke="#e35a5a" strokeWidth={1.5} />
      <text x={W - pad} y={pad + 12} fontFamily="var(--mono)" fontSize="10"
            fill="var(--bone-dim)" textAnchor="end">
        <tspan fill="var(--phosphor)">— Clifford</tspan>
        <tspan dx="12" fill="#e35a5a">— Naive</tspan>
      </text>
      <text x={W / 2} y={H - 6} fontFamily="var(--mono)" fontSize="10" fill="var(--bone-dim)"
            textAnchor="middle">timestep   ·   y: max |∇·B| (log)</text>
    </svg>
  );
}

type CMap = 'phosphor' | 'violet' | 'amber' | 'diverging';
function colorFor(t: number, cmap: CMap): string {
  // t ∈ [0, 1]
  if (cmap === 'diverging') {
    // -1 → red, 0 → ink, +1 → mint
    const u = (t - 0.5) * 2;
    if (u >= 0) {
      const g = Math.round(60 + 195 * u);
      const r = Math.round(40 + 80 * (1 - u));
      return `rgb(${r},${g},${100 + 50 * u})`;
    }
    const r = Math.round(40 + 200 * -u);
    return `rgb(${r},${40},${40})`;
  }
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  if (cmap === 'phosphor') return `rgb(${lerp(15, 130)},${lerp(20, 255)},${lerp(30, 180)})`;
  if (cmap === 'violet') return `rgb(${lerp(20, 176)},${lerp(15, 141)},${lerp(40, 255)})`;
  /* amber */ return `rgb(${lerp(20, 245)},${lerp(15, 185)},${lerp(20, 74)})`;
}

function Heatmap({ label, data, cmap }: { label: string; data: number[][]; cmap: CMap }) {
  const rows = data.length;
  const cols = data[0]?.length ?? 0;
  if (!rows || !cols) return null;
  const cell = 6;
  let lo = Infinity, hi = -Infinity;
  for (const row of data) for (const v of row) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (cmap === 'diverging') {
    const m = Math.max(Math.abs(lo), Math.abs(hi));
    lo = -m; hi = m;
  }
  const span = Math.max(hi - lo, 1e-12);
  return (
    <div className="mhd-heat">
      <span className="mhd-heat-label">{label}</span>
      <svg viewBox={`0 0 ${cols * cell} ${rows * cell}`}>
        {data.flatMap((row, y) =>
          row.map((v, x) => (
            <rect key={`${x}-${y}`} x={x * cell} y={y * cell}
                  width={cell} height={cell}
                  fill={colorFor((v - lo) / span, cmap)} />
          ))
        )}
      </svg>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .mhd-grid { display: grid; grid-template-columns: minmax(220px,260px) 1fr; gap: 1.5rem; }
      @media (max-width: 760px) { .mhd-grid { grid-template-columns: 1fr; } }
      .mhd-controls { display: flex; flex-direction: column; gap: 0.75rem; }
      .mhd-field { display: flex; flex-direction: column; gap: 0.25rem; }
      .mhd-field-label {
        font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.1em;
        text-transform: uppercase; color: var(--bone-dim);
      }
      .mhd-field input[type="number"] {
        background: var(--ink); color: var(--bone); border: 1px solid var(--rule);
        padding: 0.35rem 0.5rem; font-family: var(--mono);
      }
      .mhd-btn {
        background: var(--phosphor); color: var(--ink); border: 0;
        padding: 0.6rem 1.1rem; font-family: var(--mono); font-size: 0.78rem;
        letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;
      }
      .mhd-btn:disabled { opacity: 0.4; }
      .mhd-note {
        font-family: var(--display); font-size: 0.85rem;
        color: var(--bone-dim); font-style: italic; line-height: 1.45;
      }
      .mhd-results { display: flex; flex-direction: column; gap: 0.75rem; }
      .mhd-metrics {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 0.5rem;
      }
      .mhd-metric { border: 1px solid var(--rule); padding: 0.4rem 0.6rem; }
      .mhd-metric-label {
        display: block; font-family: var(--mono); font-size: 0.65rem;
        letter-spacing: 0.1em; text-transform: uppercase; color: var(--bone-dim);
      }
      .mhd-metric-value { font-family: var(--mono); font-size: 1rem; }
      .mhd-curve { width: 100%; height: auto; background: var(--ink); border: 1px solid var(--rule); }
      .mhd-snap-bar {
        display: flex; gap: 0.75rem; align-items: center;
        font-family: var(--mono); font-size: 0.78rem; color: var(--bone-dim);
      }
      .mhd-snap-bar input { flex: 1; }
      .mhd-heatmaps {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.5rem;
      }
      .mhd-heat {
        display: flex; flex-direction: column; gap: 0.2rem;
        border: 1px solid var(--rule); background: var(--ink); padding: 0.3rem;
      }
      .mhd-heat-label {
        font-family: var(--mono); font-size: 0.7rem; color: var(--bone-dim);
        letter-spacing: 0.08em;
      }
      .mhd-heat svg { width: 100%; aspect-ratio: 1; display: block; }
      .mhd-empty {
        padding: 2rem; text-align: center; border: 1px dashed var(--rule);
        font-family: var(--mono); font-size: 0.85rem; color: var(--bone-dim);
      }
    `}</style>
  );
}
