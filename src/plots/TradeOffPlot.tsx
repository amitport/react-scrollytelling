import { paretoFrontier } from '../numerics.js'
import { colors, domain, finite, formatNumber, Frame, linearFraction, usePlotProgress } from './shared.js'
import type { PlotProps } from './shared.js'

export interface PlotAxis {
  label: string
  unit?: string
  /** Strictly increasing finite raw-data bounds; positive for a log axis. */
  domain?: readonly [number, number]
  scale?: 'linear' | 'log'
  /** Optimization direction only; does not reverse display coordinates. Defaults to min. */
  direction?: 'min' | 'max'
}

export interface TradeOffPoint {
  id: string
  x: number
  y: number
  label?: string
}

export interface TradeOffPlotProps extends PlotProps {
  /** With pruneDominated, fade dominated groups 1→0; otherwise reveal all groups 0→1. */
  progress?: PlotProps['progress']
  /** Labels are not truncated. Use a sparse set of labeled points to avoid label collisions. */
  points: readonly TradeOffPoint[]
  xAxis: PlotAxis
  yAxis: PlotAxis
  selectedId?: string
  highlightedIds?: readonly string[]
  /** Strict Pareto dominance on raw values. All ties and duplicate coordinates survive. */
  showPareto?: boolean
  /** Fade dominated groups 1→0 instead of revealing all points. Implies showPareto. */
  pruneDominated?: boolean
}

function axisModel(axis: PlotAxis, values: readonly number[]) {
  if (axis.scale !== undefined && axis.scale !== 'linear' && axis.scale !== 'log') {
    throw new RangeError('axis scale must be linear or log')
  }
  if (axis.direction !== undefined && axis.direction !== 'min' && axis.direction !== 'max') {
    throw new RangeError('axis direction must be min or max')
  }
  const logarithmic = axis.scale === 'log'
  values.forEach((value) => {
    finite(value, `${axis.label} coordinate`)
    if (logarithmic && value <= 0) throw new RangeError('log axis coordinates must be positive')
  })
  let limits = axis.domain
  if (!limits) {
    let minimum = values.reduce((result, value) => Math.min(result, value), Infinity)
    let maximum = values.reduce((result, value) => Math.max(result, value), -Infinity)
    if (!values.length) [minimum, maximum] = logarithmic ? [1, 10] : [0, 1]
    else if (minimum === maximum) {
      if (logarithmic) {
        minimum = minimum / 2 || minimum
        maximum = maximum * 2
        if (!Number.isFinite(maximum)) maximum = values[0]
      } else {
        const padding = Math.abs(minimum) * 0.1 || (minimum === 0 ? 1 : Number.MIN_VALUE)
        minimum -= padding
        maximum += padding
        if (!Number.isFinite(minimum)) minimum = values[0]
        if (!Number.isFinite(maximum)) maximum = values[0]
      }
    }
    limits = [minimum, maximum]
  }
  domain(limits, `${axis.label} domain`)
  if (logarithmic && limits[0] <= 0) throw new RangeError('log axis domain must be positive')
  const transform = logarithmic ? Math.log : (value: number) => value
  const lower = transform(limits[0])
  const upper = transform(limits[1])
  if (lower === upper) throw new RangeError('axis domain is indistinguishable after the scale transform')
  const normalize = (value: number) => Math.max(0, Math.min(1, linearFraction(transform(value), lower, upper)))
  const ticks = Array.from({ length: 5 }, (_, i) => {
    const fraction = i / 4
    return logarithmic
      ? Math.exp(lower * (1 - fraction) + upper * fraction)
      : limits[0] * (1 - fraction) + limits[1] * fraction
  })
  return { limits, normalize, ticks }
}

function axisLabel(axis: PlotAxis) {
  return `${axis.label}${axis.unit ? ` (${axis.unit})` : ''} · ${axis.direction ?? 'min'}`
}

export function TradeOffPlot({
  points, xAxis, yAxis, selectedId, highlightedIds = [], showPareto = false, pruneDominated = false,
  progress, reducedMotion, title = 'Trade-off plot', description, ...frame
}: TradeOffPlotProps) {
  const p = usePlotProgress(progress, reducedMotion)
  const ids = new Set(points.map((point) => point.id))
  if (ids.size !== points.length) throw new RangeError('point ids must be unique')
  const x = axisModel(xAxis, points.map((point) => point.x))
  const y = axisModel(yAxis, points.map((point) => point.y))
  const highlightPareto = showPareto || pruneDominated
  const frontier = highlightPareto ? paretoFrontier(points, [
    { value: (point) => point.x, direction: xAxis.direction ?? 'min' },
    { value: (point) => point.y, direction: yAxis.direction ?? 'min' },
  ]) : []
  const frontierIds = new Set(frontier.map((point) => point.id))
  const labelWidth = points.reduce((maximum, point) => Math.max(maximum, (point.label ?? point.id).length * 9), 0)
  const viewWidth = Math.max(640, labelWidth * 2 + 200, axisLabel(xAxis).length * 9 + 150, title.length * 12 + 48)
  const viewHeight = Math.max(360, axisLabel(yAxis).length * 9 + 150)
  const right = viewWidth - 60
  const bottom = viewHeight - 86
  const middle = (90 + right) / 2
  const summary = points.map((point) => `${point.label ?? point.id}: ${xAxis.label} ${formatNumber(point.x)}, ${yAxis.label} ${formatNumber(point.y)}${frontierIds.has(point.id) ? ', Pareto frontier' : ''}${point.id === selectedId ? ', selected' : ''}`).join('; ')
  const seen = new Map<string, number>()
  return (
    <Frame {...frame} title={title} viewWidth={viewWidth} viewHeight={viewHeight}
      description={description ?? `${axisLabel(xAxis)}; ${axisLabel(yAxis)}. ${highlightPareto ? 'Pareto dominance is computed on raw values before display transforms; all ties survive. ' : ''}Coordinates outside explicit domains are drawn at the boundary. ${summary}`}>
      <text x={24} y={55} fill={colors.muted} fontSize={14}>
        {highlightPareto ? 'Teal: Pareto frontier · Ring: selected/highlighted' : 'Blue: supplied points · Ring: selected/highlighted'}
      </text>
      {x.ticks.map((tick, i) => {
        const position = 90 + i / 4 * (right - 90)
        return (
          <g key={i}>
            <line x1={position} x2={position} y1={85} y2={bottom} stroke={colors.line} strokeDasharray="3 5" />
            <text x={position} y={bottom + 21} textAnchor="middle" fill={colors.muted} fontSize={14}>{formatNumber(tick)}</text>
          </g>
        )
      })}
      {y.ticks.map((tick, i) => {
        const position = bottom - i / 4 * (bottom - 85)
        return (
          <g key={i}>
            <line x1={90} x2={right} y1={position} y2={position} stroke={colors.line} strokeDasharray="3 5" />
            <text x={79} y={position + 5} textAnchor="end" fill={colors.muted} fontSize={14}>{formatNumber(tick)}</text>
          </g>
        )
      })}
      <line x1={90} x2={right} y1={bottom} y2={bottom} stroke={colors.ink} />
      <line x1={90} x2={90} y1={85} y2={bottom} stroke={colors.ink} />
      <text x={middle} y={viewHeight - 31} textAnchor="middle" fill={colors.ink}>{axisLabel(xAxis)}</text>
      <text transform={`translate(22 ${(85 + bottom) / 2}) rotate(-90)`} textAnchor="middle" fill={colors.ink}>{axisLabel(yAxis)}</text>
      {points.map((point) => {
        const px = 90 + x.normalize(point.x) * (right - 90)
        const py = bottom - y.normalize(point.y) * (bottom - 85)
        const coordinate = `${px},${py}`
        const duplicate = seen.get(coordinate) ?? 0
        seen.set(coordinate, duplicate + 1)
        const isFrontier = frontierIds.has(point.id)
        const highlighted = selectedId === point.id || highlightedIds.includes(point.id)
        const opacity = pruneDominated ? (isFrontier ? 1 : 1 - p) : p
        const labelRight = px <= middle
        const labelOffset = py < 120 ? 21 : -12
        return (
          <g key={point.id} data-tradeoff-point={point.id} data-frontier={isFrontier} opacity={opacity}
            data-selected={selectedId === point.id} data-x={point.x} data-y={point.y}>
            <title>{`${point.label ?? point.id}: ${xAxis.label} ${formatNumber(point.x)}, ${yAxis.label} ${formatNumber(point.y)}`}</title>
            <circle cx={px} cy={py} r={6 + duplicate * 3} fill={duplicate ? 'none' : isFrontier ? colors.teal : colors.blue}
              stroke={isFrontier ? colors.teal : colors.blue} strokeWidth={2} />
            {highlighted && <circle cx={px} cy={py} r={11 + duplicate * 3} fill="none" stroke={colors.ink} strokeWidth={2} />}
            <text x={px + (labelRight ? 10 : -10)} y={py + labelOffset + duplicate * 17 * (labelOffset > 0 ? 1 : -1)}
              textAnchor={labelRight ? 'start' : 'end'} fill={colors.ink} fontSize={14}
              paintOrder="stroke" stroke={colors.white} strokeWidth={3}>
              {point.label ?? point.id}
            </text>
          </g>
        )
      })}
    </Frame>
  )
}
