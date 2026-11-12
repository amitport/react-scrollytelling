import { colors, domain, finite, formatNumber, Frame, labelsMatch, linearFraction, usePlotProgress } from './shared.js'
import type { PlotProps } from './shared.js'

export interface QuantizationPlotProps extends PlotProps {
  values: readonly number[]
  /** Supplied reconstructions; no particular quantizer or codebook is assumed. */
  reconstructedValues: readonly number[]
  levels?: readonly number[]
  /** Clipping/display range. Original out-of-range points are drawn at its boundary. */
  range: readonly [number, number]
  labels?: readonly string[]
  formatValue?: (value: number) => string
}

export function QuantizationPlot({
  values, reconstructedValues, levels = [], range, labels, formatValue = formatNumber,
  progress, reducedMotion, title = 'Quantization', description, ...frame
}: QuantizationPlotProps) {
  const p = usePlotProgress(progress, reducedMotion)
  domain(range, 'range')
  if (values.length !== reconstructedValues.length) throw new RangeError('reconstructedValues must match values length')
  labelsMatch(labels, values.length, 'labels')
  values.forEach((value) => finite(value, 'values'))
  for (const [items, name] of [[reconstructedValues, 'reconstructedValues'], [levels, 'levels']] as const) {
    items.forEach((value) => {
      finite(value, name)
      if (value < range[0] || value > range[1]) throw new RangeError(`${name} must lie within range`)
    })
  }
  const clamp = (value: number) => Math.max(range[0], Math.min(range[1], value))
  const rowLabels = values.map((value, i) => `${labels?.[i] ?? `Value ${i + 1}`}: ${formatValue(value)} → ${formatValue(reconstructedValues[i])}${value !== clamp(value) ? ` · clipped to ${formatValue(clamp(value))}` : ''}`)
  const viewWidth = Math.max(640, title.length * 12 + 48, ...rowLabels.map((label) => label.length * 9 + 48))
  const right = viewWidth - 64
  const position = (value: number) => 64 + linearFraction(clamp(value), range[0], range[1]) * (right - 64)
  const viewHeight = Math.max(360, 160 + values.length * 82)
  const summary = values.map((value, i) => `${labels?.[i] ?? `Value ${i + 1}`}: original ${formatValue(value)}, reconstructed ${formatValue(reconstructedValues[i])}${value !== clamp(value) ? ', clipped' : ''}`).join('; ')
  return (
    <Frame {...frame} title={title} viewHeight={viewHeight} viewWidth={viewWidth}
      description={description ?? `Supplied quantizer results. Blue circles are originals, orange diamonds are reconstructions. Out-of-range originals are marked clipped at the range boundary. Rounding error is reconstruction minus clipped original; total error is reconstruction minus original. ${summary}`}>
      <text x={24} y={57} fill={colors.blue}>● Original</text>
      <text x={160} y={57} fill={colors.orange}>◆ Reconstruction</text>
      <text x={360} y={57} fill={colors.muted}>Ticks: supplied levels</text>
      {values.map((value, i) => {
        const reconstructed = reconstructedValues[i]
        const clipped = clamp(value)
        const roundingError = reconstructed - clipped
        const totalError = reconstructed - value
        finite(roundingError, 'rounding error')
        finite(totalError, 'total error')
        const y = 110 + i * 82
        const originalX = position(value)
        const targetX = position(reconstructed)
        const animatedX = originalX * (1 - p) + targetX * p
        return (
          <g key={i} data-original={value} data-reconstructed={reconstructed} data-clipped={clipped !== value}>
            <text x={24} y={y - 28} fill={colors.ink} fontSize={15}>
              {rowLabels[i]}
            </text>
            <line x1={64} x2={right} y1={y} y2={y} stroke={colors.line} />
            {levels.map((level, index) => (
              <line key={index} x1={position(level)} x2={position(level)} y1={y - 7} y2={y + 7} stroke={colors.muted}>
                <title>{`Level ${formatValue(level)}`}</title>
              </line>
            ))}
            <line x1={originalX} x2={animatedX} y1={y - 8} y2={y + 8} stroke={colors.orange} strokeWidth={2} />
            <circle cx={originalX} cy={y - 8} r={6} fill={colors.blue} stroke={colors.white} strokeWidth={2}>
              <title>{`Original ${formatValue(value)}${value !== clipped ? ' (clipped)' : ''}`}</title>
            </circle>
            <path data-quantized-point={i} d={`M ${animatedX} ${y + 1} l 7 7 l -7 7 l -7 -7 Z`}
              fill={colors.orange} stroke={colors.white} strokeWidth={2}>
              <title>{`Reconstruction ${formatValue(reconstructed)}`}</title>
            </path>
            <text x={64} y={y + 36} fill={colors.muted} fontSize={14} data-rounding-error={roundingError}>
              Rounding error: {formatValue(roundingError)}{clipped !== value ? ` · Total error: ${formatValue(totalError)}` : ''}
            </text>
          </g>
        )
      })}
      <line x1={64} x2={right} y1={viewHeight - 68} y2={viewHeight - 68} stroke={colors.ink} />
      {levels.map((level, index) => {
        const x = position(level)
        const hasRoom = x > 105 && x < right - 41 && !levels.slice(0, index).some((other) => Math.abs(position(other) - x) < 44)
        return (
          <g key={index} data-quantization-level={index} data-value={level}>
            <title>{`Level ${formatValue(level)}`}</title>
            <line x1={x} x2={x} y1={viewHeight - 74} y2={viewHeight - 62} stroke={colors.ink} />
            {hasRoom && <text x={x} y={viewHeight - 42} fill={colors.ink} textAnchor="middle" fontSize={14}>{formatValue(level)}</text>}
          </g>
        )
      })}
      <text x={64} y={viewHeight - 42} fill={colors.ink}>{formatValue(range[0])}</text>
      <text x={right} y={viewHeight - 42} fill={colors.ink} textAnchor="end">{formatValue(range[1])}</text>
      <text x={24} y={viewHeight - 15} fill={colors.muted} fontSize={14}>
        Rounding error = reconstruction − clipped original. Labels show final values.
      </text>
    </Frame>
  )
}
