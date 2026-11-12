import { useState } from 'react';
import { useMotionValue } from 'framer-motion';
import { MatrixPlot, QuantizationPlot, SpectrumPlot, TradeOffPlot } from '@amitport/react-scrollytelling/plots';
import { uniformQuantize, lowRankWeightBits } from '@amitport/react-scrollytelling/numerics';

const values = [-1.4, -0.4, 0.15, 0.6];
const points = [
  { id: 'A', x: 1, y: 4 }, { id: 'B', x: 2, y: 2 },
  { id: 'C', x: 3, y: 3 }, { id: 'D', x: 4, y: 1 },
];

export function PlotExamples() {
  const [rank, setRank] = useState(2);
  const [bits, setBits] = useState(2);
  const [residual, setResidual] = useState(false);
  const [logarithmic, setLogarithmic] = useState(false);
  const [amount, setAmount] = useState(1);
  const progress = useMotionValue(1);
  return <main style={{ maxWidth: 900, margin: 'auto', padding: 16, fontFamily: 'system-ui', color: '#0f172a' }}>
    <h1>Scientific illustration primitives</h1>
    <p>Supplied synthetic data, not benchmark results. The plots import only the optional package entry points.</p>
    <p><a href="./">Scroll-driven example</a></p>
    <label>Reveal progress <input aria-label="Reveal progress" type="range" min="0" max="1" step="0.01"
      value={amount} onChange={event => { const next = Number(event.target.value); setAmount(next); progress.set(next); }} /></label>
    <section>
      <h2>Matrix and residual</h2>
      <label><input type="checkbox" checked={residual} onChange={event => setResidual(event.target.checked)} /> Show residual</label>
      <MatrixPlot title="Supplied matrix" values={[[2, -1], [0, 0.5]]}
        referenceValues={residual ? [[1.5, -0.75], [0, 0.5]] : undefined}
        colorDomain={[-2, 2]} highlightedRows={[0]} retainedRank={1} progress={progress} />
      <p>Ideal factor storage: <output>{lowRankWeightBits(4, 6, 2, 4, 8)}</output> bits; no metadata.</p>
    </section>
    <section>
      <h2>Quantization and clipping</h2>
      <label>Bit width <input aria-label="Bit width" type="range" min="1" max="4" value={bits}
        onChange={event => setBits(Number(event.target.value))} /></label>
      <QuantizationPlot title="Supplied uniform-grid reconstruction" values={values} range={[-1, 1]}
        reconstructedValues={values.map(value => uniformQuantize(value, bits).value)}
        levels={Array.from({ length: 2 ** bits }, (_, i) => -1 + 2 * i / (2 ** bits - 1))}
        progress={progress} />
    </section>
    <section>
      <h2>Rank truncation</h2>
      <label>Retained rank <input aria-label="Retained rank" type="range" min="0" max="4" value={rank}
        onChange={event => setRank(Number(event.target.value))} /></label>
      <SpectrumPlot title="Supplied singular values" values={[4, 3, 1, 0.5]} retainedRank={rank} progress={progress} />
    </section>
    <section>
      <h2>Trade-offs</h2>
      <label><input type="checkbox" checked={logarithmic} onChange={event => setLogarithmic(event.target.checked)} /> Logarithmic axes</label>
      <TradeOffPlot title="Memory and local error" points={points} selectedId="B" showPareto progress={progress}
        xAxis={{ label: 'Memory', unit: 'MiB', scale: logarithmic ? 'log' : 'linear', direction: 'min' }}
        yAxis={{ label: 'Error', scale: logarithmic ? 'log' : 'linear', direction: 'min' }} />
    </section>
  </main>;
}
