/**
 * Amplituhedron demo. POST /polytope returns moment-curve vertices,
 * minors, and interior samples for n in [4..9]. We render a 2D
 * projection (always available) + a 3D wireframe when d ≥ 3 (using
 * a simple orthographic projection), and dump the minor table.
 */

import { useState } from 'react';
import { MODAL } from '../../lib/config';
import { jsonPost } from '../../lib/modal-client';
import DemoFrame, { type DemoStatus } from './DemoFrame';

type Resp = {
  n: number;
  dimension: number;
  vertices: number[][];
  simplices: number[][];
  volume: number;
  cyclic_positivity: boolean;
  minors: { indices: number[]; minor: number }[];
  interior_samples: number[][];
  face_counts?: {
    f_0_vertices: number;
    edges: number | null;
    f_facets: number;
    neighborly_order: number;
  };
  note?: string;
};

const ENDPOINT = MODAL.amplituhedron;

export default function AmplituhedronDemo() {
  const [n, setN] = useState(6);
  const [samplePts, setSamplePts] = useState(120);
  const [seed, setSeed] = useState(11);
  const [view, setView] = useState<'2d' | '3d' | 'table'>('2d');
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<Resp | null>(null);

  const run = async () => {
    setStatus('loading');
    setError(null);
    try {
      const r = await jsonPost<Resp>(ENDPOINT, '/polytope', { n, sample_pts: samplePts, seed });
      setResp(r);
      setStatus('done');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  };

  return (
    <DemoFrame title="Cyclic-polytope amplituhedron" status={status} error={error}>
      <div className="amp-grid">
        <div className="amp-controls">
          <Field label={`n particles = ${n}`}>
            <input type="range" min={4} max={9} value={n} onChange={(e) => setN(Number(e.target.value))} />
          </Field>
          <Field label={`Interior samples = ${samplePts}`}>
            <input type="range" min={0} max={500} value={samplePts}
                   onChange={(e) => setSamplePts(Number(e.target.value))} />
          </Field>
          <Field label="Seed">
            <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
          </Field>
          <Field label="View">
            <div className="amp-views">
              {(['2d', '3d', 'table'] as const).map((v) => (
                <button key={v} type="button"
                        className={`amp-view ${view === v ? 'active' : ''}`}
                        onClick={() => setView(v)}>{v.toUpperCase()}</button>
              ))}
            </div>
          </Field>
          <button type="button" className="amp-btn" onClick={run} disabled={status === 'loading'}>
            {status === 'loading' ? 'Building…' : 'Build polytope'}
          </button>
        </div>

        <div className="amp-results">
          {resp ? (
            <>
              <div className="amp-metrics">
                <Metric label="Vertices" value={String(resp.n)} />
                <Metric label="Dimension" value={String(resp.dimension)} />
                <Metric label="Volume" value={resp.volume.toFixed(3)} />
                <Metric
                  label="Cyclic positivity"
                  value={resp.cyclic_positivity ? '✓ All minors > 0' : '✗ Violation'}
                  good={resp.cyclic_positivity}
                />
                {resp.face_counts && (
                  <>
                    <Metric label="Facets (UBT)" value={String(resp.face_counts.f_facets)} />
                    {resp.face_counts.edges !== null && (
                      <Metric label="Edges (2-neighborly)" value={String(resp.face_counts.edges)} />
                    )}
                    <Metric label={`Neighborly order`}
                            value={`⌊d/2⌋ = ${resp.face_counts.neighborly_order}`} />
                  </>
                )}
              </div>
              {resp.note && (
                <p style={{
                  fontFamily: 'var(--display)', fontStyle: 'italic',
                  color: 'var(--bone-dim)', fontSize: '0.9rem',
                }}>{resp.note}</p>
              )}
              {view === '2d' && <Plot2D resp={resp} />}
              {view === '3d' && resp.dimension >= 3 && <Plot3D resp={resp} />}
              {view === '3d' && resp.dimension < 3 && (
                <div className="amp-empty">d = {resp.dimension} — need n ≥ 5 for 3D view.</div>
              )}
              {view === 'table' && <MinorTable minors={resp.minors} />}
            </>
          ) : (
            <div className="amp-empty">Pick n, then <strong>Build polytope</strong>.</div>
          )}
        </div>
      </div>
      <Styles />
    </DemoFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="amp-field"><span className="amp-field-label">{label}</span>{children}</label>;
}

function Metric({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="amp-metric">
      <span className="amp-metric-label">{label}</span>
      <span className="amp-metric-value" style={good !== undefined
        ? { color: good ? 'var(--phosphor)' : '#e35a5a' } : undefined}>{value}</span>
    </div>
  );
}

function Plot2D({ resp }: { resp: Resp }) {
  const W = 520; const H = 360; const pad = 30;
  const verts = resp.vertices.map((v) => [v[0], v[1] ?? 0]);
  const pts = resp.interior_samples.map((v) => [v[0], v[1] ?? 0]);
  const all = [...verts, ...pts];
  if (!all.length) return null;
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys), ymax = Math.max(...ys);
  const xScale = (x: number) => pad + ((x - xmin) / Math.max(xmax - xmin, 1e-9)) * (W - 2 * pad);
  const yScale = (y: number) => H - pad - ((y - ymin) / Math.max(ymax - ymin, 1e-9)) * (H - 2 * pad);
  const poly = [...verts, verts[0]].map(([x, y]) => `${xScale(x)},${yScale(y)}`).join(' ');
  return (
    <svg className="amp-plot" viewBox={`0 0 ${W} ${H}`}>
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--rule)" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="var(--rule)" />
      <polyline points={poly} fill="rgba(176,141,255,0.08)" stroke="var(--phosphor)" strokeWidth={1.5} />
      {pts.map(([x, y], i) => (
        <circle key={`p-${i}`} cx={xScale(x)} cy={yScale(y)} r={2}
                fill="var(--amber, #f5b94a)" opacity={0.6} />
      ))}
      {verts.map(([x, y], i) => (
        <g key={`v-${i}`}>
          <circle cx={xScale(x)} cy={yScale(y)} r={5} fill="var(--phosphor)" />
          <text x={xScale(x) + 8} y={yScale(y) + 4} fontFamily="var(--mono)" fontSize="10"
                fill="var(--bone)">v{i + 1}</text>
        </g>
      ))}
      <text x={W / 2} y={H - 6} fontFamily="var(--mono)" fontSize="10" fill="var(--bone-dim)"
            textAnchor="middle">2D projection (t, t²)</text>
    </svg>
  );
}

function Plot3D({ resp }: { resp: Resp }) {
  const W = 520; const H = 380;
  // Orthographic project from 3D onto an isometric-style 2D view.
  const project = ([x, y, z]: number[]) => [x * 0.7 - z * 0.7, y - 0.4 * x - 0.4 * z];
  const verts = resp.vertices.map((v) => project([v[0], v[1] ?? 0, v[2] ?? 0]));
  const pts = resp.interior_samples.map((v) => project([v[0], v[1] ?? 0, v[2] ?? 0]));
  const all = [...verts, ...pts];
  if (!all.length) return null;
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys), ymax = Math.max(...ys);
  const xScale = (x: number) => 30 + ((x - xmin) / Math.max(xmax - xmin, 1e-9)) * (W - 60);
  const yScale = (y: number) => H - 30 - ((y - ymin) / Math.max(ymax - ymin, 1e-9)) * (H - 60);
  // wireframe — connect consecutive vertices on the moment curve
  const wire = verts.map(([x, y], i) =>
    `${i === 0 ? 'M' : 'L'} ${xScale(x)} ${yScale(y)}`).join(' ');
  return (
    <svg className="amp-plot" viewBox={`0 0 ${W} ${H}`}>
      {pts.map(([x, y], i) => (
        <circle key={`p-${i}`} cx={xScale(x)} cy={yScale(y)} r={1.5}
                fill="var(--amber, #f5b94a)" opacity={0.4} />
      ))}
      <path d={wire} fill="none" stroke="var(--phosphor)" strokeWidth={1.5} />
      {verts.map(([x, y], i) => (
        <g key={`v-${i}`}>
          <circle cx={xScale(x)} cy={yScale(y)} r={5} fill="var(--phosphor)" />
          <text x={xScale(x) + 6} y={yScale(y) - 4} fontFamily="var(--mono)" fontSize="9"
                fill="var(--bone)">v{i + 1}</text>
        </g>
      ))}
    </svg>
  );
}

function MinorTable({ minors }: { minors: { indices: number[]; minor: number }[] }) {
  return (
    <div className="amp-tablewrap">
      <table className="amp-table">
        <thead><tr><th>indices</th><th>minor</th></tr></thead>
        <tbody>
          {minors.map((m, i) => (
            <tr key={i}>
              <td className="amp-mono">{m.indices.map((j) => j + 1).join(',')}</td>
              <td className="amp-mono" style={{ color: m.minor > 0 ? 'var(--phosphor)' : '#e35a5a' }}>
                {m.minor.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .amp-grid { display: grid; grid-template-columns: minmax(220px,260px) 1fr; gap: 1.5rem; }
      @media (max-width: 760px) { .amp-grid { grid-template-columns: 1fr; } }
      .amp-controls { display: flex; flex-direction: column; gap: 0.75rem; }
      .amp-field { display: flex; flex-direction: column; gap: 0.25rem; }
      .amp-field-label {
        font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.1em;
        text-transform: uppercase; color: var(--bone-dim);
      }
      .amp-field input[type="number"] {
        background: var(--ink); color: var(--bone); border: 1px solid var(--rule);
        padding: 0.35rem 0.5rem; font-family: var(--mono);
      }
      .amp-views { display: flex; gap: 0.25rem; }
      .amp-view {
        flex: 1; background: transparent; border: 1px solid var(--rule);
        color: var(--bone-dim); padding: 0.3rem; font-family: var(--mono);
        font-size: 0.72rem; cursor: pointer;
      }
      .amp-view.active { background: var(--phosphor); color: var(--ink); border-color: var(--phosphor); }
      .amp-btn {
        background: var(--phosphor); color: var(--ink); border: 0;
        padding: 0.6rem 1.1rem; font-family: var(--mono); font-size: 0.78rem;
        letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;
      }
      .amp-btn:disabled { opacity: 0.4; }
      .amp-results { display: flex; flex-direction: column; gap: 0.75rem; }
      .amp-metrics {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr));
        gap: 0.5rem;
      }
      .amp-metric { border: 1px solid var(--rule); padding: 0.4rem 0.6rem; }
      .amp-metric-label {
        display: block; font-family: var(--mono); font-size: 0.65rem;
        letter-spacing: 0.1em; text-transform: uppercase; color: var(--bone-dim);
      }
      .amp-metric-value { font-family: var(--mono); font-size: 1rem; color: var(--phosphor); }
      .amp-plot { width: 100%; height: auto; background: var(--ink); border: 1px solid var(--rule); }
      .amp-empty {
        padding: 2rem; text-align: center; border: 1px dashed var(--rule);
        font-family: var(--mono); font-size: 0.85rem; color: var(--bone-dim);
      }
      .amp-tablewrap { max-height: 400px; overflow: auto; border: 1px solid var(--rule); }
      .amp-table {
        width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 0.82rem;
      }
      .amp-table th, .amp-table td {
        border-bottom: 1px solid var(--rule); padding: 0.3rem 0.6rem; text-align: left;
      }
      .amp-table th {
        position: sticky; top: 0; background: var(--ink-2); color: var(--bone-dim);
        font-weight: 400; font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase;
      }
      .amp-mono { color: var(--bone); }
    `}</style>
  );
}
