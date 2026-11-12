export interface ParetoObjective<T> {
  readonly value: (item: T) => number;
  readonly direction: 'min' | 'max';
}

export type ParetoObjectives<T> = readonly [ParetoObjective<T>, ParetoObjective<T>];

export interface UniformQuantizationResult {
  value: number;
  step: number;
  index: number;
  levels: number;
}

/**
 * Returns nondominated items in input order, retaining every tied item.
 * Dominance requires being no worse on both objectives and strictly better on
 * at least one. Selectors run once per item per objective and must return finite
 * numbers. The input is not modified; this direct comparison takes O(n²) time.
 */
export function paretoFrontier<T>(items: readonly T[], objectives: ParetoObjectives<T>): T[] {
  if (objectives.length !== 2) {
    throw new RangeError('Exactly two objectives are required.');
  }
  for (const objective of objectives) {
    if (objective.direction !== 'min' && objective.direction !== 'max') {
      throw new RangeError('Objective direction must be "min" or "max".');
    }
    if (typeof objective.value !== 'function') {
      throw new TypeError('Objective value must be a function.');
    }
  }
  const coordinates = items.map(item => objectives.map(objective => {
    const value = objective.value(item);
    if (!Number.isFinite(value)) {
      throw new RangeError('Objective values must be finite numbers.');
    }
    return objective.direction === 'min' ? value : -value;
  }));
  return items.filter((_, index) => !coordinates.some(other =>
    other[0] <= coordinates[index][0] && other[1] <= coordinates[index][1] &&
    (other[0] < coordinates[index][0] || other[1] < coordinates[index][1])));
}

/**
 * Quantizes onto 2^bits endpoint-inclusive, uniformly spaced levels.
 * Clips to [minimum, maximum] and uses Math.round on the nonnegative grid
 * coordinate: exact halfway ties go toward +Infinity (the higher level).
 * This is not a signed-integer or zero-point quantizer; zero need not be a level.
 * Values and bounds must be finite, bits an integer in [1, 16], and the increasing
 * range must have a finite span and a representable positive step.
 * Results retain JavaScript floating-point precision without display rounding.
 */
export function uniformQuantize(
  value: number,
  bits: number,
  minimum = -1,
  maximum = 1,
): UniformQuantizationResult {
  if (!Number.isInteger(bits) || bits < 1 || bits > 16) {
    throw new RangeError('Bit-width must be an integer between 1 and 16.');
  }
  if (![value, minimum, maximum].every(Number.isFinite) || minimum >= maximum) {
    throw new RangeError('Quantization needs finite values and an increasing range.');
  }
  const levels = 2 ** bits;
  const intervals = levels - 1;
  const step = (maximum - minimum) / intervals;
  if (!Number.isFinite(step) || step <= 0) {
    throw new RangeError('Quantization range must have a finite, positive representable step.');
  }
  const clipped = Math.max(minimum, Math.min(maximum, value));
  const index = Math.max(0, Math.min(intervals, Math.round((clipped - minimum) / step)));
  return {
    value: index === 0 ? minimum : index === intervals ? maximum : minimum + index * step,
    step,
    index,
    levels,
  };
}

/**
 * Ideal packed weight bits for A[output, rank] at aBits and B[rank, input]
 * at bBits: rank * (output * aBits + input * bBits).
 * Excludes scales, zero-points, padding, metadata, and all non-weight storage.
 * Dimensions, rank, and precisions must be positive safe integers, rank cannot
 * exceed either dimension, and the total must remain a safe integer.
 */
export function lowRankWeightBits(
  input: number,
  output: number,
  rank: number,
  aBits: number,
  bBits: number,
): number {
  for (const [name, value] of Object.entries({ input, output, rank, aBits, bBits })) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive safe integer.`);
    }
  }
  if (rank > Math.min(input, output)) {
    throw new RangeError('Rank cannot exceed the smaller matrix dimension.');
  }
  const total = rank * (output * aBits + input * bBits);
  if (!Number.isSafeInteger(total)) {
    throw new RangeError('Total weight bits must be a safe integer.');
  }
  return total;
}
