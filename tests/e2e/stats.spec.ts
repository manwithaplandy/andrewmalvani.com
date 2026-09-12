import type {Page} from '@playwright/test';

import current from '../fixtures/stats-v2-current.json';
import legacy from '../fixtures/stats-v1.json';
import {expect, test} from './fixtures';

const FIXED_NOW = '2026-09-08T12:00:00.000Z';

async function fixBrowserCalendar(page: Page, isoNow = FIXED_NOW) {
  await page.addInitScript(fixedIso => {
    const NativeDate = Date;
    const fixedStart = NativeDate.parse(fixedIso);
    const realStart = NativeDate.now();
    class AdvancingFixedDate extends NativeDate {
      constructor(value?: string | number) {
        super(value === undefined ? fixedStart + (NativeDate.now() - realStart) : value);
      }

      static now() {
        return fixedStart + (NativeDate.now() - realStart);
      }
    }
    window.Date = AdvancingFixedDate as DateConstructor;
  }, isoNow);
}

async function fulfillStats(page: Page, payload: unknown) {
  await page.route('**/stats.json', route =>
    route.fulfill({body: JSON.stringify(payload), contentType: 'application/json', status: 200}),
  );
}

test('legacy payload keeps its uncertainty visible and excludes today', async ({page}) => {
  await fixBrowserCalendar(page);
  await fulfillStats(page, legacy);
  await page.goto('/stats');

  await expect(page.getByText('Observed document requests', {exact: true})).toBeVisible();
  await expect(page.getByText('Daily unique visits (sum)', {exact: true})).toBeVisible();
  await expect(page.getByText('Requests by country', {exact: true})).toBeVisible();
  await expect(page.getByText('Legacy source — freshness unavailable', {exact: true})).toHaveCount(2);
  await expect(page.getByText('Legacy data: zero daily values may mean missing data.', {exact: true})).toBeVisible();

  await page.getByText('Daily values and status', {exact: true}).click();
  await expect(page.getByRole('cell', {name: 'September 6, 2026', exact: true})).toBeVisible();
  await expect(page.getByRole('cell', {name: 'September 7, 2026', exact: true})).toBeVisible();
  await expect(page.getByRole('cell', {name: 'September 8, 2026', exact: true})).toHaveCount(0);
  await expect(page.getByRole('cell', {name: 'Missing', exact: true})).toBeVisible();
});

test('v2 payload shows measured zero, separate periods, gaps and provisional data', async ({page}) => {
  await fixBrowserCalendar(page);
  await fulfillStats(page, current);
  await page.goto('/stats');

  await expect(page.getByText('CloudFront coverage: September 1–7, 2026 · Current', {exact: true})).toBeVisible();
  await expect(page.getByText('Cloudflare coverage: September 2–7, 2026 · Current', {exact: true})).toBeVisible();
  await expect(page.getByText('September 7, 2026: 0 requests, provisional', {exact: true})).toBeVisible();
  await expect(page.locator('[data-chart-segment]')).toHaveCount(3);

  await page.getByText('Daily values and status', {exact: true}).click();
  const september7 = page
    .getByRole('row')
    .filter({has: page.getByRole('cell', {name: 'September 7, 2026', exact: true})});
  await expect(september7.getByRole('cell', {name: '0', exact: true})).toBeVisible();
  await expect(september7.getByRole('cell', {name: 'Provisional', exact: true})).toBeVisible();
  await expect(page.getByText(/same person can count on several days/i)).toBeVisible();
  await expect(page.getByText(/countries count requests across the measured Cloudflare zone/i)).toBeVisible();
});

test('valid document zero remains visible while an unavailable edge source does not become zero', async ({page}) => {
  const missingEdge = {
    ...structuredClone(current),
    countries: [],
    sources: {
      ...current.sources,
      cloudflare: {
        lastSuccessfulUpdate: null,
        scope: 'zone-requests',
        since: null,
        status: 'unavailable',
        through: null,
      },
    },
    dailyObservations: current.dailyObservations.map(point => ({...point, status: 'missing', views: null})),
    topPages: [],
    topReferrers: [],
    totalViews: 0,
    uniqueVisitors: 0,
  };

  await fixBrowserCalendar(page);
  await fulfillStats(page, missingEdge);
  await page.goto('/stats');

  const documentCard = page.locator('[data-testid="document-requests"]');
  const uniquesCard = page.locator('[data-testid="daily-unique-visits"]');
  await expect(documentCard.getByText('0', {exact: true})).toBeVisible();
  await expect(uniquesCard.getByText('Unavailable', {exact: true})).toBeVisible();
  await expect(page.getByText('Cloudflare source unavailable', {exact: true})).toBeVisible();
  await expect(page.getByText('Country request data is unavailable.', {exact: true})).toBeVisible();
  await expect(page.getByText('No observations available for this period', {exact: true})).toBeVisible();
});

test('frozen sources become visibly stale on a later fixed calendar day', async ({page}) => {
  await fixBrowserCalendar(page, '2026-09-12T12:00:00.000Z');
  await fulfillStats(page, current);
  await page.goto('/stats');

  await expect(page.getByText('CloudFront coverage: September 1–7, 2026 · Stale', {exact: true})).toBeVisible();
  await expect(page.getByText('Cloudflare coverage: September 2–7, 2026 · Stale', {exact: true})).toBeVisible();
});

test('malformed data offers Retry and a valid retry recovers', async ({page}) => {
  let requests = 0;
  await fixBrowserCalendar(page);
  await page.route('**/stats.json', route => {
    requests += 1;
    const payload = requests === 1 ? {...legacy, lastUpdated: '2026-02-30'} : current;
    return route.fulfill({body: JSON.stringify(payload), contentType: 'application/json', status: 200});
  });
  await page.goto('/stats');

  await expect(page.getByRole('button', {name: 'Retry', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Retry', exact: true}).click();
  await expect(page.getByText('Observed document requests', {exact: true})).toBeVisible();
  expect(requests).toBe(2);
});

test('a stalled request times out and a deliberate retry recovers', async ({page}) => {
  test.setTimeout(30_000);
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let requests = 0;
  await fixBrowserCalendar(page);
  await page.route('**/stats.json', async route => {
    requests += 1;
    if (requests === 1) {
      await gate;
      await route.abort('timedout').catch(() => undefined);
      return;
    }
    await route.fulfill({body: JSON.stringify(current), contentType: 'application/json', status: 200});
  });
  await page.goto('/stats');

  try {
    await expect(page.getByRole('button', {name: 'Retry', exact: true})).toBeVisible({timeout: 13_000});
    expect(requests).toBe(1);
    release();
    await page.getByRole('button', {name: 'Retry', exact: true}).click();
    await expect(page.getByText('Observed document requests', {exact: true})).toBeVisible();
    expect(requests).toBe(2);
  } finally {
    release();
  }
});

test('SPA navigation cancels a pending stats request on unmount', async ({page}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let requests = 0;
  await page.addInitScript(() => {
    const observedWindow = window as Window & {d1Marker?: string; d1StatsSignal?: AbortSignal};
    const nativeFetch = window.fetch;
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith('/stats.json') && init?.signal) {
        observedWindow.d1StatsSignal = init.signal;
      }
      return nativeFetch(input, init);
    };
  });
  await fixBrowserCalendar(page);
  await page.route('**/stats.json', async route => {
    requests += 1;
    await gate;
    await route.fulfill({body: JSON.stringify(current), contentType: 'application/json', status: 200}).catch(() => undefined);
  });
  await page.goto('/stats');
  await expect.poll(() => requests).toBe(1);
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & {d1StatsSignal?: AbortSignal}).d1StatsSignal))).toBe(true);
  await page.evaluate(() => {
    (window as Window & {d1Marker?: string}).d1Marker = 'same-document';
  });

  try {
    await page.getByRole('link', {name: 'Career graph', exact: true}).click();
    await expect(page).toHaveURL(/\/graph(?:#|$)/);
    expect(await page.evaluate(() => (window as Window & {d1Marker?: string}).d1Marker)).toBe('same-document');
    await expect
      .poll(() => page.evaluate(() => (window as Window & {d1StatsSignal?: AbortSignal}).d1StatsSignal?.aborted))
      .toBe(true);
  } finally {
    release();
  }
});

test('sparse calendar dates use real spacing and break paths across absent days', async ({page}) => {
  const sparse = {
    ...structuredClone(current),
    dailyObservations: [
      {date: '2026-09-01', status: 'observed', views: 2},
      {date: '2026-09-02', status: 'missing', views: null},
      {date: '2026-09-04', status: 'observed', views: 5},
      {date: '2026-09-07', status: 'provisional', views: 0},
    ],
  };
  await fixBrowserCalendar(page);
  await fulfillStats(page, sparse);
  await page.goto('/stats');

  const chart = page.getByRole('img', {name: '7 requests across 3 measured days; 4 missing and 1 provisional'});
  await expect(chart).toBeVisible();
  const xPositions = await chart.locator('circle').evaluateAll(circles =>
    circles.map(circle => Number(circle.getAttribute('cx'))),
  );
  expect(xPositions).toHaveLength(3);
  expect(xPositions[0]).toBeCloseTo(4, 1);
  expect(xPositions[1]).toBeCloseTo(150, 1);
  expect(xPositions[2]).toBeCloseTo(296, 1);
  for (const path of await chart.locator('[data-chart-segment]').all()) {
    await expect(path).not.toHaveAttribute('d', /L/);
  }

  await page.getByText('Daily values and status', {exact: true}).click();
  await expect(page.getByRole('row')).toHaveCount(5);
});

test('stats presentation reflows at 320 pixels', async ({page}) => {
  await page.setViewportSize({height: 844, width: 320});
  await fixBrowserCalendar(page);
  await fulfillStats(page, current);
  await page.goto('/stats');

  await expect(page.getByText('Observed document requests', {exact: true})).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByText('Daily values and status', {exact: true}).click();
  const disclosure = page.locator('section').filter({hasText: 'Daily document request observations'});
  await expect.poll(() => disclosure.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await expect(disclosure.getByRole('cell', {name: 'Provisional', exact: true})).toBeVisible();
});
