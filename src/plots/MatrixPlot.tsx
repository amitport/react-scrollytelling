import { colors, domain, finite, formatNumber, Frame, labelsMatch, rank, usePlotProgress } from './shared.js'
import type { PlotProps } from './shared.js'

export interface MatrixPlotProps extends PlotProps {
  /** Omit visible heading/legend and default index labels for small nested SVGs. */
  compact?: boolean
  values: readonly (readonly number[])[]
  /** Display the elementwise residual values - referenceValues; shapes must match. */
  referenceValues?: readonly (readonly number[])[]
  /** Shared signed color scale. Must contain zero and have increasing finite endpoints. */
  colorDomain?: readonly [number, number]
  rowLabels?: readonly string[]
  columnLabels?: readonly string[]
  formatValue?: (value: number) => string
  highlightedRows?: readonly number[]
  highlightedColumns?: readonly number[]
  /** Visual leading-r rows/columns mask only; does not compute a rank-r approximation. */
  retainedRank?: number
}

function shape(values: readonly (readonly number[])[], name: string) {
  const columns = values[0]?.length ?? 0
  if (!values.length || !columns) throw new RangeError(`${name} must be a nonempty rectangular matrix`)
  values.forEach((row) => {
    if (row.length !== columns) throw new RangeError(`${name} must be rectangular`)
    row.forEach((value) => finite(value, name))
  })
  return columns
}

function heatColor(value: number, [minimum, maximum]: readonly [number, number]) {
  const intensity = Math.min(1, Math.max(0, value < 0 ? value / minimum : value / maximum || 0))
  const endpoint = value < 0 ? [37, 99, 235] : [194, 65, 12]
  return `rgb(${endpoint.map((channel) => Math.round(255 + (channel - 255) * intensity * 0.48)).join(',')})`
}

export function MatrixPlot({
  values, referenceValues, colorDomain, rowLabels, columnLabels, formatValue = formatNumber,
  highlightedRows = [], highlightedColumns = [], retainedRank, progress, reducedMotion,
  title = referenceValues ? 'Matrix residual' : 'Matrix', description, compact = false, ...frame
}: MatrixPlotProps) {
  const p = usePlotProgress(progress, reducedMotion)
  const columns = shape(values, 'values')
  const rows = values.length
  if (referenceValues && (shape(referenceValues, 'referenceValues') !== columns || referenceValues.length !== rows)) {
    throw new RangeError('referenceValues must have the same shape as values')
  }
  labelsMatch(rowLabels, rows, 'rowLabels')
  labelsMatch(columnLabels, columns, 'columnLabels')
  if (retainedRank !== undefined) rank(retainedRank, Math.min(rows, columns))
  for (const [indices, maximum, name] of [
    [highlightedRows, rows, 'highlightedRows'], [highlightedColumns, columns, 'highlightedColumns'],
  ] as const) {
    if (indices.some((index) => !Number.isInteger(index) || index < 0 || index >= maximum)) {
      throw new RangeError(`${name} must contain valid zero-based indices`)
    }
  }
  const displayed = values.map((row, i) => row.map((value, j) => {
    const result = value - (referenceValues?.[i][j] ?? 0)
    finite(result, 'residual')
    return result
  }))
  const extent = displayed.reduce((max, row) => row.reduce((m, value) => Math.max(m, Math.abs(value)), max), 0) || 1
  const limits = colorDomain ?? [-extent, extent] as const
  domain(limits, 'colorDomain')
  if (limits[0] > 0 || limits[1] < 0) throw new RangeError('colorDomain must contain zero')
  const labelWidth = (columnLabels ?? []).reduce((maximum, label) => Math.max(maximum, label.length * 9 + 12), 0)
  const valueWidth = displayed.reduce((maximum, row) => row.reduce((max, value) => Math.max(max, formatValue(value).length * 10 + 12), maximum), 0)
  const rowLabelWidth = (rowLabels ?? []).reduce((maximum, label) => Math.max(maximum, label.length * 9 + 20), 0)
  const cellWidth = Math.max(64, Math.min(100, 440 / columns), labelWidth, valueWidth)
  const cellHeight = Math.max(42, Math.min(58, 210 / rows))
  const left = Math.max(compact ? (rowLabels ? 76 : 8) : 112, rowLabelWidth)
  const top = compact ? (columnLabels ? 30 : 8) : 86
  const viewWidth = compact ? left + columns * cellWidth + 8 : Math.max(640, left + 44 + columns * cellWidth)
  const viewHeight = compact ? top + rows * cellHeight + 8 : Math.max(360, 140 + rows * cellHeight)
  const summary = displayed.map((row, i) => `${rowLabels?.[i] ?? `Row ${i + 1}`}: ${row.map(formatValue).join(', ')}`).join('; ')
  return (
    <Frame {...frame} title={title} viewWidth={viewWidth} viewHeight={viewHeight} compact={compact}
      description={description ?? `${rows} by ${columns} ${referenceValues ? 'elementwise residual, values minus referenceValues' : 'matrix'}. Negative values are blue; positive values are orange. ${retainedRank === undefined ? '' : `Leading ${retainedRank} rows and columns highlighted; this is a visual mask, not a computed low-rank approximation. `}${summary}`}>
      {(!compact || columnLabels) && Array.from({ length: columns }, (_, j) => (
        <text key={j} x={left + (j + 0.5) * cellWidth} y={top - 14} textAnchor="middle" fill={colors.ink}>
          {columnLabels?.[j] ?? j + 1}
        </text>
      ))}
      {displayed.map((row, i) => (
        <g key={i}>
          {(!compact || rowLabels) && <text x={left - 12} y={top + (i + 0.5) * cellHeight + 5} textAnchor="end" fill={colors.ink}>
            {rowLabels?.[i] ?? i + 1}
          </text>}
          {row.map((value, j) => {
            const retained = retainedRank === undefined || (i < retainedRank && j < retainedRank)
            const highlighted = highlightedRows.includes(i) || highlightedColumns.includes(j)
            return (
              <g key={j} data-matrix-cell={i * columns + j} data-row={i} data-column={j} data-value={value} data-retained={retained}>
                <rect x={left + j * cellWidth} y={top + i * cellHeight} width={cellWidth - 3} height={cellHeight - 3}
                  rx={4} fill={heatColor(value, limits)} fillOpacity={(retained ? 1 : 0.2) * p}
                  stroke={highlighted ? colors.blue : colors.line} strokeWidth={highlighted ? 3 : 1} />
                <text x={left + (j + 0.5) * cellWidth - 1.5} y={top + (i + 0.5) * cellHeight + 4}
                  textAnchor="middle" fill={colors.ink} fontSize={17}>{formatValue(value)}</text>
              </g>
            )
          })}
        </g>
      ))}
      {!compact && <text x={24} y={viewHeight - 40} fill={colors.muted}>
        Blue: negative · Orange: positive · Color range [{formatValue(limits[0])}, {formatValue(limits[1])}]
      </text>}
      {!compact && <text x={24} y={viewHeight - 16} fill={colors.muted} fontSize={14}>
        {referenceValues ? 'Residual = values − referenceValues. ' : ''}
        {retainedRank !== undefined ? `Leading ${retainedRank} × ${retainedRank} visual mask (no rank approximation computed).` : 'Labels show supplied values, independent of reveal progress.'}
      </text>}
    </Frame>
  )
}
