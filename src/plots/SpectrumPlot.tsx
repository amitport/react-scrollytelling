import { colors, finite, formatNumber, Frame, labelsMatch, rank, usePlotProgress } from './shared.js'
import type { PlotProps } from './shared.js'

export interface SpectrumPlotProps extends PlotProps {
  /** Fade discarded bars from opacity 1 to 0.12; retained bars and labels stay visible. */
  progress?: PlotProps['progress']
  /** Supplied singular values, finite, nonnegative, and descending. No solver is run. */
  values: readonly number[]
  retainedRank?: number
  labels?: readonly string[]
  formatValue?: (value: number) => string
}

export function SpectrumPlot({
  values, retainedRank = values.length, labels, formatValue = formatNumber,
  progress, reducedMotion, title = 'Singular-value spectrum', description, ...frame
}: SpectrumPlotProps) {
  const p = usePlotProgress(progress, reducedMotion)
  values.forEach((value, i) => {
    finite(value, 'values')
    if (value < 0 || (i > 0 && value > values[i - 1])) throw new RangeError('values must be nonnegative and descending')
  })
  rank(retainedRank, values.length)
  labelsMatch(labels, values.length, 'labels')
  const maximum = values[0] ?? 0
  const scaledSquares = values.map((value) => maximum === 0 ? 0 : (value / maximum) ** 2)
  const scaledTotal = scaledSquares.reduce((sum, value) => sum + value, 0)
  let cumulative = 0
  const energies = scaledSquares.map((value) => {
    cumulative += value
    return scaledTotal === 0 ? 0 : cumulative / scaledTotal
  })
  const energy = retainedRank === 0 ? 0 : energies[retainedRank - 1]
  const residual = values.slice(retainedRank).reduce((sum, value) => sum + value * value, 0)
  finite(residual, 'squared Frobenius residual')
  const labelWidth = (labels ?? []).reduce((maximum, label) => Math.max(maximum, label.length * 8 + 14), 62)
  const valueWidth = values.reduce((maximum, value) => Math.max(maximum, formatValue(value).length * 8 + 14), 62)
  const viewWidth = Math.max(640, 120 + values.length * Math.max(labelWidth, valueWidth))
  const plotWidth = viewWidth - 120
  const step = plotWidth / Math.max(1, values.length)
  const barWidth = Math.min(44, step - 10)
  const summary = `Retained rank ${retainedRank} of ${values.length}. Cumulative squared energy ${formatValue(energy * 100)} percent. Squared Frobenius truncation residual ${formatValue(residual)}. ${maximum === 0 ? 'Zero spectrum: energy fractions are defined as zero and residual is zero. ' : ''}Supplied singular values: ${values.map(formatValue).join(', ')}.`
  return (
    <Frame {...frame} title={title} viewWidth={viewWidth}
      description={description ?? `${summary} These are matrix approximation metrics, not model accuracy.`}>
      <text x={24} y={57} fill={colors.muted}>Bar: singular value σᵢ · Teal point: cumulative squared energy</text>
      <line x1={64} x2={viewWidth - 56} y1={246} y2={246} stroke={colors.line} />
      <text x={52} y={247} textAnchor="end" fill={colors.muted} fontSize={14}>0</text>
      <text x={52} y={100} textAnchor="end" fill={colors.muted} fontSize={14}>{formatValue(maximum)}</text>
      <text x={viewWidth - 48} y={100} fill={colors.teal} fontSize={14}>100%</text>
      <text x={viewWidth - 48} y={247} fill={colors.teal} fontSize={14}>0%</text>
      {values.map((value, i) => {
        const x = 64 + (i + 0.5) * step
        const height = maximum === 0 ? 0 : value / maximum * 140
        return (
          <g key={i} data-index={i} data-value={value} data-retained={i < retainedRank} data-cumulative-energy={energies[i]}>
            <rect data-spectrum-bar={i} x={x - barWidth / 2} y={246 - height} width={barWidth} height={height}
              fill={colors.blue} opacity={i < retainedRank ? 1 : 1 - 0.88 * p} rx={3} />
            <circle cx={x} cy={246 - energies[i] * 140} r={4} fill={colors.teal} />
            <text x={x} y={85} textAnchor="middle" fill={colors.ink} fontSize={14}>{formatValue(value)}</text>
            <text x={x} y={267} textAnchor="middle" fill={colors.ink} fontSize={14}>{labels?.[i] ?? `σ${i + 1}`}</text>
          </g>
        )
      })}
      <text x={24} y={299} fill={colors.ink} data-retained-energy={energy}>
        Rank {retainedRank}/{values.length} · Cumulative squared energy: {formatValue(energy * 100)}%
      </text>
      <text x={24} y={324} fill={colors.ink} data-squared-residual={residual}>
        Squared Frobenius residual ‖A − Aᵣ‖²_F = Σᵢ&gt;ᵣ σᵢ² = {formatValue(residual)}
      </text>
      <text x={24} y={347} fill={colors.muted} fontSize={13}>
        {maximum === 0 ? 'Zero spectrum: energy fraction defined as 0; residual = 0.' : 'Energy = Σᵢ≤ᵣ σᵢ² / Σᵢ σᵢ². Matrix approximation metrics, not model accuracy.'}
      </text>
    </Frame>
  )
}
