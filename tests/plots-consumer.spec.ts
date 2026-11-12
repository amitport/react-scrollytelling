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
