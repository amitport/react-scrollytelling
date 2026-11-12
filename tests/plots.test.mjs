import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { motionValue } from 'framer-motion';
import { MatrixPlot, QuantizationPlot, SpectrumPlot, TradeOffPlot } from '../dist/plots.js';

const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const attribute = (html, name) => [...html.matchAll(new RegExp(`${name}="([^"]*)"`, 'g'))].map(match => match[1]);

test('matrix residuals preserve raw values and shared color domains; masks keep labels visible', () => {
  const props = {
    values: [[-2, 0, 3], [0.25, 2, 1]],
    referenceValues: [[-1, 0, 2], [0, 1, 1]],
    colorDomain: [-3, 3], retainedRank: 1,
  };
  const html = render(MatrixPlot, props);
  assert.deepEqual(attribute(html, 'data-value'), ['-1', '0', '1', '0.25', '1', '0']);
  assert.deepEqual(attribute(html, 'data-retained'), ['true', 'false', 'false', 'false', 'false', 'false']);
  assert.equal(attribute(html, 'data-matrix-cell').length, 6);
  assert.match(html, /values minus referenceValues/);
  assert.match(html, /Color range \[-3, 3\]/);
  assert.match(html, />0.25<\/text>/);
  assert.doesNotMatch(render(MatrixPlot, { ...props, compact: true }), /Color range/);
  for (const invalid of [
    { values: [] }, { values: [[1], [1, 2]] }, { values: [[NaN]] },
    { values: [[1]], referenceValues: [[1, 2]] },
    { values: [[1]], retainedRank: 2 }, { values: [[1]], colorDomain: [1, 2] },
    { values: [[1]], highlightedRows: [-1] },
  ]) assert.throws(() => render(MatrixPlot, invalid), RangeError);
  assert.doesNotMatch(render(MatrixPlot, { values: [[0, 0], [0, 0]] }), /NaN|Infinity/);
});

test('quantization handles endpoints, clipping, nonuniform levels and coincident points', () => {
  const props = {
    values: [-2, 0, 0, 1], reconstructedValues: [-1, 0, 0.25, 1],
    levels: [-1, 0, 0.25, 1], range: [-1, 1],
  };
  const html = render(QuantizationPlot, props);
  assert.deepEqual(attribute(html, 'data-clipped'), ['true', 'false', 'false', 'false']);
  assert.deepEqual(attribute(html, 'data-rounding-error'), ['0', '0', '0.25', '0']);
  assert.equal(attribute(html, 'data-quantized-point').length, 4);
  assert.equal(attribute(html, 'data-quantization-level').length, 4);
  assert.match(html, /Total error: 1/);
  assert.match(html, /clipped to -1/);
  const start = render(QuantizationPlot, { ...props, progress: motionValue(0) });
  const end = render(QuantizationPlot, { ...props, progress: 1 });
  assert.notDeepEqual(attribute(start, 'd'), attribute(end, 'd'));
  const reduced = render(QuantizationPlot, { ...props, progress: 0, reducedMotion: true });
  assert.deepEqual(attribute(reduced, 'd'), attribute(end, 'd'));
  assert.match(start, /Rounding error: 0.25/);
  for (const invalid of [
    { reconstructedValues: [0] }, { range: [1, 1] }, { levels: [2] },
    { reconstructedValues: [-2, 0, 0, 1] }, { values: [Infinity, 0, 0, 1] },
  ]) assert.throws(() => render(QuantizationPlot, { ...props, ...invalid }), RangeError);
});

test('spectrum squared energy and Frobenius residual include zero and boundary ranks', () => {
  const partial = render(SpectrumPlot, { values: [4, 3, 0], retainedRank: 1, progress: 0 });
  assert.deepEqual(attribute(partial, 'data-cumulative-energy'), ['0.64', '1', '1']);
  assert.deepEqual(attribute(partial, 'data-retained-energy'), ['0.64']);
  assert.deepEqual(attribute(partial, 'data-squared-residual'), ['9']);
  assert.equal((partial.match(/class="katex"/g) ?? []).length, 2);
  assert.match(partial, /<mfrac>/);
  assert.doesNotMatch(partial, /katex-error/);
  assert.match(partial, />3<\/text>/);
  assert.equal(attribute(partial, 'data-spectrum-bar').length, 3);
  assert.deepEqual(attribute(render(SpectrumPlot, { values: [4, 3], retainedRank: 0 }), 'data-squared-residual'), ['25']);
  assert.deepEqual(attribute(render(SpectrumPlot, { values: [4, 3], retainedRank: 2 }), 'data-squared-residual'), ['0']);
  const zero = render(SpectrumPlot, { values: [0, 0], retainedRank: 1 });
  assert.deepEqual(attribute(zero, 'data-cumulative-energy'), ['0', '0']);
  assert.deepEqual(attribute(zero, 'data-retained-energy'), ['0']);
  assert.deepEqual(attribute(zero, 'data-squared-residual'), ['0']);
  assert.doesNotMatch(zero, /NaN|Infinity/);
  assert.doesNotMatch(zero, /<mfrac>/);
  for (const invalid of [
    { values: [1, 2] }, { values: [-1] }, { values: [NaN] },
    { values: [1], retainedRank: -1 }, { values: [1], retainedRank: 2 },
    { values: [1], retainedRank: 0.5 },
  ]) assert.throws(() => render(SpectrumPlot, invalid), RangeError);
});

test('spectrum progress prunes discarded bars without moving bars, energy points or labels', () => {
  const props = { values: [4, 3], retainedRank: 1 };
  const start = render(SpectrumPlot, { ...props, progress: motionValue(0) });
  const end = render(SpectrumPlot, { ...props, progress: 1 });
  assert.deepEqual(attribute(start, 'opacity'), ['1', '1']);
  assert.deepEqual(attribute(end, 'opacity'), ['1', '0.12']);
  assert.deepEqual(attribute(start, 'height'), attribute(end, 'height'));
  assert.deepEqual(attribute(start, 'cy'), attribute(end, 'cy'));
  assert.match(end, />3<\/text>/);
  const reduced = render(SpectrumPlot, { ...props, progress: 0, reducedMotion: true });
  assert.deepEqual(attribute(reduced, 'opacity'), attribute(end, 'opacity'));
});

test('tradeoff computes frontier on raw mixed-direction metrics independent of log transforms', () => {
  const props = {
    points: [{ id: 'a', x: 1, y: 1 }, { id: 'b', x: 2, y: 4 }, { id: 'tie', x: 2, y: 4 }, { id: 'c', x: 3, y: 2 }],
    xAxis: { label: 'Memory', unit: 'bits', direction: 'min' },
    yAxis: { label: 'Quality', direction: 'max' },
    showPareto: true, selectedId: 'b',
  };
  const html = render(TradeOffPlot, props);
  assert.deepEqual(attribute(html, 'data-frontier'), ['true', 'true', 'true', 'false']);
  assert.deepEqual(attribute(html, 'data-selected'), ['false', 'true', 'false', 'false']);
  const logged = render(TradeOffPlot, { ...props, xAxis: { ...props.xAxis, scale: 'log' } });
  assert.deepEqual(attribute(logged, 'data-frontier'), attribute(html, 'data-frontier'));
  assert.match(html, /Memory \(bits\) · min/);
  for (const points of [[], [{ id: 'zero', x: 0, y: 0 }], [{ id: 'one', x: 1, y: 1 }]]) {
    assert.doesNotMatch(render(TradeOffPlot, { ...props, points }), /NaN|Infinity/);
  }
  for (const invalid of [
    { points: [{ id: 'x', x: 0, y: 1 }], xAxis: { label: 'X', scale: 'log' } },
    { points: [{ id: 'x', x: Infinity, y: 1 }] },
    { xAxis: { label: 'X', domain: [2, 1] } },
    { xAxis: { label: 'X', domain: [1, 1] } },
    { xAxis: { label: 'X', scale: 'log', domain: [0, 1] } },
    { points: [{ id: 'x', x: 1, y: 1 }, { id: 'x', x: 2, y: 2 }] },
  ]) assert.throws(() => render(TradeOffPlot, { ...props, ...invalid }), RangeError);
});

test('tradeoff highlighting reveals every point by default; pruning is explicit', () => {
  const props = {
    points: [{ id: 'frontier', x: 1, y: 1 }, { id: 'dominated', x: 2, y: 2 }],
    xAxis: { label: 'X' }, yAxis: { label: 'Y' }, showPareto: true, selectedId: 'dominated',
  };
  const highlighted = render(TradeOffPlot, props);
  assert.deepEqual(attribute(highlighted, 'opacity'), ['1', '1']);
  assert.deepEqual(attribute(highlighted, 'data-frontier'), ['true', 'false']);
  assert.deepEqual(attribute(render(TradeOffPlot, { ...props, progress: 0 }), 'opacity'), ['0', '0']);
  const start = render(TradeOffPlot, { ...props, pruneDominated: true, progress: 0 });
  const end = render(TradeOffPlot, { ...props, pruneDominated: true, progress: motionValue(1) });
  assert.deepEqual(attribute(start, 'opacity'), ['1', '1']);
  assert.deepEqual(attribute(end, 'opacity'), ['1', '0']);
  const dominatedGroup = end.match(/<g data-tradeoff-point="dominated"[^>]*>[\s\S]*?<\/g>/)?.[0];
  assert.ok(dominatedGroup);
  assert.match(dominatedGroup, /^<g [^>]*opacity="0"/);
  assert.equal((dominatedGroup.match(/<circle /g) ?? []).length, 2);
  assert.match(dominatedGroup, />dominated<\/text>/);
  const reduced = render(TradeOffPlot, { ...props, pruneDominated: true, progress: 0, reducedMotion: true });
  assert.deepEqual(attribute(reduced, 'opacity'), attribute(end, 'opacity'));
  const revealStart = render(TradeOffPlot, { ...props, showPareto: false, progress: 0 });
  assert.deepEqual(attribute(revealStart, 'opacity'), ['0', '0']);
  const impliedFrontier = render(TradeOffPlot, { ...props, showPareto: false, pruneDominated: true });
  assert.deepEqual(attribute(impliedFrontier, 'data-frontier'), ['true', 'false']);
  assert.deepEqual(attribute(impliedFrontier, 'opacity'), ['1', '0']);
});
