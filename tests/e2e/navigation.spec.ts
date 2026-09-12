import {expect, test} from './fixtures';

test('campaign links retain one homepage identity', async ({page}) => {
  await page.goto('/?utm_source=review#portfolio');

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://andrewmalvani.com/');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://andrewmalvani.com/');
});

test('graph state retains one graph page identity', async ({page}) => {
  await page.goto('/graph?view=list#node=skill%3Apython');

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://andrewmalvani.com/graph');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://andrewmalvani.com/graph');
});

test('the architecture card opens a real local image', async ({page, request}) => {
  await page.goto('/#portfolio');
  const link = page.getByRole('link', {name: /Site architecture/});
  const href = await link.getAttribute('href');
  expect(href).not.toBeNull();
  expect(href).not.toContain('[object Object]');

  const destination = new URL(href!, page.url());
  expect(destination.origin).toBe('http://127.0.0.1:3100');
  const response = await request.get(destination.toString(), {maxRedirects: 0});
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^image\//);

  const [imagePage] = await Promise.all([page.waitForEvent('popup'), link.click()]);
  await imagePage.waitForLoadState('load');
  expect(imagePage.url()).toBe(destination.toString());
  await expect(imagePage.locator('img')).toBeVisible();
});

test('portfolio keeps project destinations usable without publishing unapproved disclosures', async ({page}) => {
  await page.goto('/#portfolio');
  const sourceLink = page.getByRole('link', {name: /Source for this site/});
  const rolefitLink = page.getByRole('link', {name: /Rolefit/});

  await expect(sourceLink).toHaveAttribute('href', 'https://github.com/manwithaplandy/react-resume');
  await expect(rolefitLink).toHaveAttribute('href', 'https://jobs.andrewmalvani.com');
  await expect(sourceLink).toHaveAttribute('target', '_blank');
  await expect(rolefitLink).toHaveAttribute('target', '_blank');
  await expect(page.locator('#portfolio details')).toHaveCount(0);
});

test('homepage separates experience navigation from the PDF download', async ({page}) => {
  await page.goto('/');

  await expect(page.getByRole('link', {name: 'Experience', exact: true})).toHaveAttribute('href', '/#resume');
  const downloadLink = page.getByRole('link', {name: 'Download résumé PDF', exact: true});
  await expect(downloadLink).toHaveAttribute('download', 'Andrew-Malvani-Resume.pdf');

  const [download] = await Promise.all([page.waitForEvent('download'), downloadLink.click()]);
  expect(await download.failure()).toBeNull();
});

test('graph offers the same named PDF download', async ({page}) => {
  await page.goto('/graph?view=list');
  const downloadLink = page.getByRole('link', {name: 'Download résumé PDF', exact: true});
  await expect(downloadLink).toHaveAttribute('download', 'Andrew-Malvani-Resume.pdf');

  const [download] = await Promise.all([page.waitForEvent('download'), downloadLink.click()]);
  expect(await download.failure()).toBeNull();
});

for (const route of ['/', '/stats']) {
  test(`${route} footer returns to the current page's top`, async ({page}) => {
    await page.goto(route);
    const backToTop = page.getByRole('link', {name: 'Back to top', exact: true});
    await backToTop.scrollIntoViewIfNeeded();
    await expect(backToTop).toHaveAttribute('href', '#top');
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await backToTop.click();

    await expect(page).toHaveURL(new RegExp(`http://127\\.0\\.0\\.1:3100${route === '/' ? '/' : route}#top$`));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
  });
}
