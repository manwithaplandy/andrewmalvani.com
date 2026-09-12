import {Locator, Page} from '@playwright/test';

import {expect, test} from './fixtures';

const captureAfterFrames = (canvas: Locator) =>
  canvas.evaluate(async node => {
    for (let frame = 0; frame < 6; frame += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    return (node as HTMLCanvasElement).toDataURL();
  });

const isClear = (canvas: Locator) =>
  canvas.evaluate(node => {
    const canvas = node as HTMLCanvasElement;
    return !canvas
      .getContext('2d')!
      .getImageData(0, 0, canvas.width, canvas.height)
      .data.some(value => value !== 0);
  });

async function expectInstantMenu(page: Page) {
  await page.getByRole('button', {name: 'Open menu', exact: true}).click();
  const menu = page.locator('#mobileMenu');
  await expect(menu).toBeVisible();
  const frames = await menu.evaluate(async node => {
    const samples = [];
    for (let frame = 0; frame < 6; frame += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      samples.push({x: node.getBoundingClientRect().x, duration: getComputedStyle(node).transitionDuration});
    }
    return samples;
  });
  expect(frames.every(sample => sample.x === 0 && sample.duration === '0s')).toBe(true);
  await expect(menu.getByRole('link', {name: 'Experience', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Close menu', exact: true}).click();
  await expect(menu).toBeHidden();
}

test('particles clear on live reduction and resume with one draw per frame', async ({page}) => {
  // Observe real canvas draws without replacing the animation or its scheduling.
  await page.addInitScript(() => {
    let currentFrame: number | undefined;
    const requestFrame = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback =>
      requestFrame(timestamp => {
        currentFrame = timestamp;
        try {
          callback(timestamp);
        } finally {
          currentFrame = undefined;
        }
      });
    const draws = new Map<number, number>();
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.closest('#hero') && currentFrame !== undefined) {
        draws.set(currentFrame, (draws.get(currentFrame) ?? 0) + 1);
        this.canvas.dataset.maxDrawsPerFrame = String(Math.max(...draws.values()));
      }
      clear.apply(this, args);
    };
  });
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/');
  const canvas = page.locator('#hero canvas');
  await expect(canvas).toBeInViewport();
  const moving = await captureAfterFrames(canvas);
  await expect.poll(() => captureAfterFrames(canvas)).not.toBe(moving);

  for (let toggle = 0; toggle < 3; toggle += 1) {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await expect.poll(() => isClear(canvas)).toBe(true);
    const still = await captureAfterFrames(canvas);
    expect(await captureAfterFrames(canvas)).toBe(still);
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await expect.poll(() => captureAfterFrames(canvas)).not.toBe(still);
  }
  await expect(canvas).toHaveAttribute('data-max-draws-per-frame', '1');
  const detachedCanvas = await canvas.elementHandle();
  await page.getByRole('link', {name: 'analytics', exact: true}).click();
  await expect(page).toHaveURL(/\/stats$/);
  await expect.poll(() => detachedCanvas!.evaluate(node => node.isConnected)).toBe(false);
  const afterUnmount = await detachedCanvas!.evaluate(node => (node as HTMLCanvasElement).toDataURL());
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.evaluate(async () => {
    for (let frame = 0; frame < 6; frame += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
  });
  expect(await detachedCanvas!.evaluate(node => (node as HTMLCanvasElement).toDataURL())).toBe(afterUnmount);
});

test('an initially reduced visit keeps particles clear and menu usable without sliding', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  const canvas = page.locator('#hero canvas');
  await expect(canvas).toBeInViewport();
  expect(await isClear(canvas)).toBe(true);
  await expectInstantMenu(page);
  const reveal = page.locator('#portfolio .grid > div').first();
  await expect(reveal).toHaveCSS('opacity', '1');
  await expect(reveal).toHaveCSS('transition-duration', '0s');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await expect.poll(() => isClear(canvas)).toBe(false);
});

test('live reduction immediately exposes pending reveals and disables menu movement', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/', {waitUntil: 'domcontentloaded'});
  const reveal = page.locator('#portfolio .grid > div').first();
  await expect(reveal).toHaveCSS('opacity', '0');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(reveal).toHaveCSS('opacity', '1', {timeout: 500});
  await expect(reveal).toHaveCSS('transition-duration', '0s');
  await expect(reveal).toHaveCSS('transition-delay', '0s');
  const transform = await reveal.evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m42);
  expect(transform).toBe(0);
  await expectInstantMenu(page);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.getByRole('button', {name: 'Open menu', exact: true}).click();
  await expect
    .poll(() => page.locator('#mobileMenu').evaluate(node => getComputedStyle(node).transitionDuration))
    .toBe('0.3s');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(page.locator('#mobileMenu')).toHaveCSS('transition-duration', '0s');
  await expect.poll(() => page.locator('#mobileMenu').evaluate(node => node.getBoundingClientRect().x)).toBe(0);
  await page.getByRole('button', {name: 'Close menu', exact: true}).click();
  await expect(page.locator('#mobileMenu')).toBeHidden();
});

test('particles retain offscreen and background visibility gates across preference changes', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/');
  const canvas = page.locator('#hero canvas');
  await page.locator('#portfolio').scrollIntoViewIfNeeded();
  await expect(canvas).not.toBeInViewport();
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const offscreen = await captureAfterFrames(canvas);
  expect(await captureAfterFrames(canvas)).toBe(offscreen);
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await expect(canvas).toBeInViewport();
  await expect.poll(() => captureAfterFrames(canvas)).not.toBe(offscreen);

  // Synthetic Page Visibility event: headless tabs do not reliably background.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable: true, value: true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = await captureAfterFrames(canvas);
  expect(await captureAfterFrames(canvas)).toBe(hidden);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const hiddenAfterToggle = await captureAfterFrames(canvas);
  expect(await captureAfterFrames(canvas)).toBe(hiddenAfterToggle);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => captureAfterFrames(canvas)).not.toBe(hiddenAfterToggle);
});
