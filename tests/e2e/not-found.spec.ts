import {expect, test} from './fixtures';

test('an unknown static path returns a useful non-indexed 404 page', async ({page}) => {
  const response = await page.goto('/missing-e1-route');

  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle('Page not found | Andrew Malvani');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.getByRole('heading', {level: 1, name: 'Page not found'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Return to the résumé'})).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', {name: 'Contact Andrew'})).toHaveAttribute('href', '/#contact');
});

test('the missing-page recovery fits a 320-pixel viewport', async ({page}) => {
  await page.setViewportSize({height: 720, width: 320});
  const response = await page.goto('/another-missing-e1-route');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', {level: 1, name: 'Page not found'})).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
