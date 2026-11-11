import { expect, test } from '@playwright/test';

test('packed consumer renders equations and animates continuously within a pinned chapter', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.katex-error')).toHaveCount(0);
  expect(await page.evaluate(() => document.fonts.check('16px KaTeX_Main'))).toBe(true);
  const scroll = (fraction: number) => page.evaluate(fraction => {
    const track = document.querySelector<HTMLElement>('.scrolly-chapter-track')!;
    const top = parseFloat(getComputedStyle(track.firstElementChild!).top);
    const bounds = track.getBoundingClientRect();
    window.scrollTo({ top: bounds.top + scrollY - top + fraction * bounds.height, behavior: 'instant' });
  }, fraction);
  await scroll(0.1);
  await expect.poll(async () => Number(await page.locator('[data-ellipse]').getAttribute('rx'))).toBeLessThan(90);
  const before = await page.locator('[data-chapter="0"]').boundingBox();
  await scroll(0.45);
  await expect.poll(async () => Number(await page.locator('[data-ellipse]').getAttribute('rx'))).toBeGreaterThan(130);
  const after = await page.locator('[data-chapter="0"]').boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);
  await page.mouse.move(1430, 800);
  const height = await page.locator('.scrolly-chapter-track').first().evaluate(element => element.getBoundingClientRect().height);
  await page.mouse.wheel(0, height * 0.9);
  await expect(page.locator('.scrolly-stage-track button').nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('[data-scroll-scene="1"]')).toHaveCSS('opacity', '1');
  await scroll(0.1);
  await expect.poll(async () => Number(await page.locator('[data-ellipse]').getAttribute('rx'))).toBeLessThan(90);
  expect(errors).toEqual([]);
});

test('packed consumer preserves mobile pinning, reduced motion, and section navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start walkthrough' }).click();
    for (let index = 0; index < 2; index++) {
      await page.locator('.scrolly-stage-track button').nth(index).click();
      await expect(page.locator(`[data-scroll-scene="${index}"]`)).toHaveCSS('opacity', '1');
      const card = await page.locator(`[data-chapter="${index}"]`).boundingBox();
      const canvas = await page.locator('.scrolly-canvas-col').boundingBox();
      if (width < 1000) expect(card!.y).toBeGreaterThanOrEqual(canvas!.y + canvas!.height);
      expect(card!.y + card!.height).toBeLessThanOrEqual(844);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await page.locator('.scrolly-stage-track a').click();
    await expect(page.locator('#sources h2')).toBeInViewport();
    await expect(page.locator('.scrolly-stage-track a')).toHaveAttribute('aria-current', 'location');
    await page.locator('.scrolly-topbar-brand-btn').click();
    await expect(page.locator('h1')).toBeInViewport();
  }
  await page.goto('/#sources');
  await expect(page.locator('#sources h2')).toBeInViewport();
});
