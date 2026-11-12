import { expect, test } from '@playwright/test';

test('packed plot exports use supplied data and controlled numerical settings', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?view=plots');
  await expect(page.getByRole('img', { name: /^Supplied matrix / })).toBeVisible();
  await expect(page.locator('[data-matrix-cell]')).toHaveCount(4);
  await expect(page.locator('[data-matrix-cell="0"]')).toHaveAttribute('data-value', '2');
  await page.getByLabel('Show residual', { exact: true }).check();
  await expect(page.locator('[data-matrix-cell="0"]')).toHaveAttribute('data-value', '0.5');
  await expect(page.locator('[data-matrix-cell="3"]')).toHaveAttribute('data-value', '0');
  await expect(page.locator('[data-quantization-level]')).toHaveCount(4);
  await expect(page.locator('[data-original="-1.4"]')).toHaveAttribute('data-clipped', 'true');
  await page.getByRole('slider', { name: 'Bit width', exact: true }).fill('3');
  await expect(page.locator('[data-quantization-level]')).toHaveCount(8);
  await expect(page.locator('[data-squared-residual]')).toHaveAttribute('data-squared-residual', '1.25');
  await expect(page.locator('[data-squared-residual] .katex')).toBeVisible();
  await expect(page.locator('[data-spectrum-energy-definition] .katex')).toBeVisible();
  await expect(page.locator('[data-spectrum-energy-definition] math mfrac')).toHaveCount(1);
  await expect(page.locator('.katex-error')).toHaveCount(0);
  await page.getByRole('slider', { name: 'Retained rank', exact: true }).fill('0');
  await expect(page.locator('[data-squared-residual]')).toHaveAttribute('data-squared-residual', '26.25');
  await expect(page.locator('[data-retained-energy]')).toHaveAttribute('data-retained-energy', '0');
  await expect(page.locator('[data-tradeoff-point][data-frontier="true"]')).toHaveCount(3);
  await expect(page.locator('[data-tradeoff-point="B"]')).toHaveAttribute('data-selected', 'true');
  await page.getByLabel('Logarithmic axes', { exact: true }).check();
  await expect(page.locator('[data-tradeoff-point="C"]')).toHaveAttribute('data-frontier', 'false');
  expect(errors).toEqual([]);
});

test('default spectrum markers remain distinct over bars and on the plot background', async ({ page }) => {
  await page.goto('/?view=plots');
  const marker = page.locator('[data-spectrum-energy-point="0"]');
  const appearance = await marker.evaluate(element => {
    const style = getComputedStyle(element);
    const bar = element.parentElement!.querySelector('[data-spectrum-bar]')!;
    const background = element.closest('svg')!.querySelector('rect')!;
    const pointBounds = element.getBoundingClientRect();
    const barBounds = bar.getBoundingClientRect();
    return {
      fill: style.fill, outline: style.stroke, outlineWidth: parseFloat(style.strokeWidth),
      radius: Number(element.getAttribute('r')),
      bar: getComputedStyle(bar).fill, background: getComputedStyle(background).fill,
      overlapsBar: pointBounds.top >= barBounds.top && pointBounds.bottom <= barBounds.bottom,
    };
  });
  const luminance = (color: string) => {
    const [r, g, b] = (color.match(/[\d.]+/g) ?? []).map(Number).map(channel => {
      const linear = channel / 255;
      return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
    });
    if (r === undefined || g === undefined || b === undefined) throw new Error(`Not an RGB color: ${color}`);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const first = luminance(a), second = luminance(b);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  };
  expect(appearance.overlapsBar).toBe(true);
  expect(appearance.radius).toBeGreaterThanOrEqual(6);
  expect(appearance.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(contrast(appearance.fill, appearance.outline)).toBeGreaterThanOrEqual(3);
  expect(contrast(appearance.outline, appearance.bar)).toBeGreaterThanOrEqual(3);
  expect(contrast(appearance.fill, appearance.background)).toBeGreaterThanOrEqual(4.5);
});

test('packed plots follow MotionValue progress and settle for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?view=plots');
  await page.evaluate(() => document.fonts.ready);
  const point = page.locator('[data-quantized-point="3"]');
  const settled = await point.evaluate(element => element.getBoundingClientRect().x);
  await page.getByRole('slider', { name: 'Reveal progress', exact: true }).fill('0');
  await expect.poll(async () => Math.abs(await point.evaluate(element => element.getBoundingClientRect().x) - settled)).toBeGreaterThan(2);
  await page.getByRole('slider', { name: 'Reveal progress', exact: true }).fill('1');
  await expect.poll(async () => Math.abs(await point.evaluate(element => element.getBoundingClientRect().x) - settled)).toBeLessThan(0.1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  const reducedSettled = await point.evaluate(element => element.getBoundingClientRect().x);
  await page.getByRole('slider', { name: 'Reveal progress', exact: true }).fill('0');
  await expect.poll(async () => Math.abs(await point.evaluate(element => element.getBoundingClientRect().x) - reducedSettled)).toBeLessThan(0.1);
});

test('standalone plots retain readable, reachable content on mobile', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?view=plots');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('[data-plot-scroll]')).toHaveCount(4);
    for (const wrapper of await page.locator('[data-plot-scroll]').all()) {
      await expect(wrapper).toHaveAttribute('tabindex', '0');
      expect(await wrapper.locator('text').evaluateAll(elements => elements.every(element =>
        Number.parseFloat(getComputedStyle(element).fontSize) >= 12))).toBe(true);
      expect(await wrapper.locator('foreignObject .katex-html').evaluateAll(elements => elements.every(element => {
        const formula = element.getBoundingClientRect();
        const row = element.closest('foreignObject')!.getBoundingClientRect();
        return formula.left >= row.left && formula.right <= row.right
          && formula.top >= row.top && formula.bottom <= row.bottom;
      })), 'typeset formulas fit inside their SVG rows').toBe(true);
      await wrapper.evaluate(element => { element.scrollLeft = element.scrollWidth; });
      expect(await wrapper.evaluate(element => Math.abs(element.scrollLeft + element.clientWidth - element.scrollWidth))).toBeLessThanOrEqual(1);
    }
    if (width === 1440) await page.screenshot({ path: testInfo.outputPath('research-plots.png'), fullPage: true });
  }
});
