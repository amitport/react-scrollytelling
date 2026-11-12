import { useCallback, useId, useSyncExternalStore } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { MotionValue } from 'framer-motion'

/**
 * Standalone plots keep their natural SVG size inside a keyboard-scrollable container
 * on narrow screens, rather than shrinking text. Explicit geometry returns a bare SVG
 * for nesting; the caller then owns readable sizing and label density.
 */
export interface PlotProps {
  title?: string
  description?: string
  /** Externally driven reveal/interpolation, clamped to [0, 1]. Defaults to 1. */
  progress?: number | MotionValue<number>
  /** Settle reveal/interpolation at 1. Defaults to the system preference. */
  reducedMotion?: boolean
  x?: number | string
  y?: number | string
  /** Explicit dimensions/position opt out of the standalone horizontal scroll container. */
  width?: number | string
  height?: number | string
  className?: string
  style?: CSSProperties
}

export const colors = {
  ink: '#16324f',
  muted: '#4b647b',
  blue: '#2563eb',
  teal: '#0f766e',
  line: '#b8cbdc',
  pale: '#eff6ff',
  white: '#ffffff',
}

export function finite(value: number, name: string) {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`)
}

export function domain(values: readonly [number, number], name: string) {
  if (values.length !== 2) throw new RangeError(`${name} must contain exactly two endpoints`)
  finite(values[0], `${name}[0]`)
  finite(values[1], `${name}[1]`)
  if (values[0] >= values[1]) throw new RangeError(`${name} must be strictly increasing`)
}

export function linearFraction(value: number, minimum: number, maximum: number) {
  const span = maximum - minimum
  return Number.isFinite(span)
    ? (value - minimum) / span
    : (value / 2 - minimum / 2) / (maximum / 2 - minimum / 2)
}

export function rank(value: number, maximum: number) {
  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    throw new RangeError(`retainedRank must be an integer between 0 and ${maximum}`)
  }
}

export function labelsMatch(labels: readonly string[] | undefined, length: number, name: string) {
  if (labels && labels.length !== length) throw new RangeError(`${name} must match the data length`)
}

export function formatNumber(value: number) {
  if (value === 0) return '0'
  if (Math.abs(value) >= 10000 || Math.abs(value) < 0.001) return value.toExponential(2)
  return String(Number(value.toPrecision(4)))
}

const subscribePreference = (notify: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
const getPreference = () => typeof window !== 'undefined'
  && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function usePlotProgress(progress: PlotProps['progress'] = 1, reducedMotion?: boolean) {
  const subscribe = useCallback((notify: () => void) => (
    typeof progress === 'number' ? () => {} : progress.on('change', notify)
  ), [progress])
  const snapshot = useCallback(() => typeof progress === 'number' ? progress : progress.get(), [progress])
  const value = useSyncExternalStore(subscribe, snapshot, snapshot)
  const systemReduced = useSyncExternalStore(subscribePreference, getPreference, () => false)
  finite(value, 'progress')
  return (reducedMotion ?? systemReduced) ? 1 : Math.max(0, Math.min(1, value))
}

interface FrameProps extends PlotProps {
  title: string
  description: string
  children: ReactNode
  viewWidth?: number
  viewHeight?: number
  compact?: boolean
}

export function Frame({
  title, description, x, y, width, height, className, style,
  children, viewWidth = 640, viewHeight = 360, compact = false,
}: FrameProps) {
  const id = useId()
  const standalone = x === undefined && y === undefined && width === undefined && height === undefined && !compact
  const svg = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x={x} y={y} width={width ?? '100%'} height={height ?? viewHeight}
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      role="img" aria-labelledby={`${id}-title ${id}-description`}
      className={className}
      style={{
        display: 'block', ...(height === undefined ? { height: 'auto', aspectRatio: `${viewWidth} / ${viewHeight}` } : {}),
        ...(standalone ? { minWidth: viewWidth } : {}),
        fontFamily: 'system-ui, sans-serif', fontSize: 16, ...style,
      }}
    >
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-description`}>{description}</desc>
      <rect width={viewWidth} height={viewHeight} rx={12} fill={colors.white} />
      {!compact && <text x={24} y={30} fill={colors.ink} fontSize={20} fontWeight={650}>{title}</text>}
      {children}
    </svg>
  )
  return standalone
    ? <div data-plot-scroll="" style={{ maxWidth: '100%', overflowX: 'auto' }} tabIndex={0} role="region" aria-label={`${title} (scroll horizontally on narrow screens)`}>{svg}</div>
    : svg
}
