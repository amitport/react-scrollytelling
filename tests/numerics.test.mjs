import test from 'node:test';
import assert from 'node:assert/strict';
import { lowRankWeightBits, paretoFrontier, uniformQuantize } from '../dist/numerics.js';

test('Pareto filtering supports every direction pair and preserves order and ties', () => {
  for (const first of ['min', 'max']) {
    for (const second of ['min', 'max']) {
      const points = [
        [2, 1], [1, 2], [3, 3], [2, 1], [2, 2], [1, 3], [3, 1],
      ].map(([x, y]) => Object.freeze({
        x: first === 'min' ? x : -x,
        y: second === 'min' ? y : -y,
      }));
      Object.freeze(points);
      const objectives = [
        { value: point => point.x, direction: first },
        { value: point => point.y, direction: second },
      ];
      const frontier = paretoFrontier(points, objectives);
      assert.deepEqual(frontier, [points[0], points[1], points[3]]);
      assert.equal(frontier[0], points[0]);
      assert.deepEqual(paretoFrontier([], objectives), []);
      assert.deepEqual(paretoFrontier([points[0]], objectives), [points[0]]);
    }
  }
});

test('Pareto objectives accept negative and zero values and evaluate once per item', () => {
  const points = [[-1, 0], [0, -1], [0, 0], [-1, 0], [-1, 0]];
  let calls = 0;
  const objectives = [0, 1].map(coordinate => ({
    value: point => { calls++; return point[coordinate]; },
    direction: 'min',
  }));
  assert.deepEqual(paretoFrontier(points, objectives), [
    points[0], points[1], points[3], points[4],
  ]);
  assert.equal(calls, points.length * 2);
});

test('Pareto filtering validates both objectives, even for dominated candidates', () => {
  const objectives = [0, 1].map(coordinate => ({
    value: point => point[coordinate], direction: 'min',
  }));
  for (const invalid of [NaN, Infinity, -Infinity, '1']) {
    for (const point of [[invalid, 1], [1, invalid]]) {
      assert.throws(() => paretoFrontier([[0, 0], point], objectives), RangeError);
    }
  }
  assert.throws(() => paretoFrontier([], [objectives[0]]), RangeError);
  assert.throws(() => paretoFrontier([], [...objectives, objectives[0]]), RangeError);
  assert.throws(() => paretoFrontier([], [
    objectives[0], { value: point => point, direction: 'up' },
  ]), RangeError);
  assert.throws(() => paretoFrontier([], [
    objectives[0], { value: 1, direction: 'min' },
  ]), TypeError);
});

test('uniform quantization preserves endpoint-inclusive grid and clips finite inputs', () => {
  assert.deepEqual(uniformQuantize(-1, 2), { value: -1, step: 2 / 3, index: 0, levels: 4 });
  assert.deepEqual(uniformQuantize(1, 2), { value: 1, step: 2 / 3, index: 3, levels: 4 });
  assert.equal(uniformQuantize(-Number.MAX_VALUE, 2).value, -1);
  assert.equal(uniformQuantize(Number.MAX_VALUE, 2).value, 1);
  assert.equal(uniformQuantize(0.42, 2).value, -1 + 2 * (2 / 3));
  assert.deepEqual(uniformQuantize(2, 2, 2, 5), { value: 2, step: 1, index: 0, levels: 4 });
  assert.deepEqual(uniformQuantize(5, 2, 2, 5), { value: 5, step: 1, index: 3, levels: 4 });
  assert.equal(uniformQuantize(0, 16).levels, 65536);
  assert.equal(uniformQuantize(1, 16).index, 65535);
});

test('uniform quantization rounds exact ties toward positive infinity, not even or zero', () => {
  assert.equal(uniformQuantize(0, 1).value, 1);
  assert.equal(uniformQuantize(-Number.EPSILON, 1).value, -1);
  assert.equal(uniformQuantize(Number.EPSILON, 1).value, 1);
  for (const [value, expected] of [[-1.5, -1], [-0.5, 0], [0.5, 1]]) {
    assert.equal(uniformQuantize(value, 2, -2, 1).value, expected);
  }
  assert.equal(uniformQuantize(-0.5 - Number.EPSILON, 2, -2, 1).value, -1);
  assert.equal(uniformQuantize(-0.5 + Number.EPSILON, 2, -2, 1).value, 0);
});

test('uniform quantization rejects invalid bit widths, bounds, and unrepresentable grids', () => {
  for (const bits of [0, -1, 1.5, 17, NaN, Infinity, -Infinity, '2']) {
    assert.throws(() => uniformQuantize(0, bits), RangeError);
  }
  for (const invalid of [NaN, Infinity, -Infinity, '0']) {
    assert.throws(() => uniformQuantize(invalid, 2), RangeError);
    assert.throws(() => uniformQuantize(0, 2, invalid, 1), RangeError);
    assert.throws(() => uniformQuantize(0, 2, -1, invalid), RangeError);
  }
  assert.throws(() => uniformQuantize(0, 2, 1, 1), RangeError);
  assert.throws(() => uniformQuantize(0, 2, 1, -1), RangeError);
  assert.throws(() => uniformQuantize(0, 2, -Number.MAX_VALUE, Number.MAX_VALUE), RangeError);
  assert.throws(() => uniformQuantize(0, 16, 0, Number.MIN_VALUE), RangeError);
  assert.equal(uniformQuantize(Number.MIN_VALUE, 1, 0, Number.MIN_VALUE).value, Number.MIN_VALUE);
});

test('low-rank bit accounting assigns precisions to the correct rectangular factor shapes', () => {
  assert.equal(lowRankWeightBits(7, 11, 3, 4, 8), 3 * (11 * 4 + 7 * 8));
  assert.equal(lowRankWeightBits(7, 11, 3, 8, 4), 3 * (11 * 8 + 7 * 4));
  assert.equal(lowRankWeightBits(4, 4, 4, 8, 8), 2 * 4 * 4 * 8);
  assert.equal(lowRankWeightBits(1, 1, 1, 1, 1), 2);
  assert.equal(lowRankWeightBits(1, 1, 1, Number.MAX_SAFE_INTEGER - 1, 1), Number.MAX_SAFE_INTEGER);
});

test('low-rank bit accounting rejects invalid parameters, excessive rank, and unsafe totals', () => {
  for (let index = 0; index < 5; index++) {
    for (const invalid of [0, -1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '1']) {
      const args = [7, 11, 3, 4, 8];
      args[index] = invalid;
      assert.throws(() => lowRankWeightBits(...args), RangeError);
    }
  }
  assert.throws(() => lowRankWeightBits(7, 11, 8, 4, 8), RangeError);
  assert.throws(() => lowRankWeightBits(11, 7, 8, 4, 8), RangeError);
  assert.throws(() => lowRankWeightBits(1, 1, 1, Number.MAX_SAFE_INTEGER, 1), RangeError);
  assert.throws(() => lowRankWeightBits(2, 2, 2, Number.MAX_SAFE_INTEGER, 1), RangeError);
  assert.throws(() => lowRankWeightBits(
    Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER,
  ), RangeError);
});
