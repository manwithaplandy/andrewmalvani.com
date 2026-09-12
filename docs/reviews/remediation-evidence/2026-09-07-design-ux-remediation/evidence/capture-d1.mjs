import {readFileSync, writeFileSync} from 'node:fs';

import {chromium} from '@playwright/test';

const evidenceDirectory =
  '/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/.superpowers/sdd/2026-09-07-design-ux-remediation/evidence';
const baseOrigin = 'http://127.0.0.1:3100';
const current = JSON.parse(readFileSync(new URL('../../../../tests/fixtures/stats-v2-current.json', import.meta.url)));

const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 320, height: 844}});
await context.addInitScript(() => {
  const NativeDate = Date;
  const fixedStart = NativeDate.parse('2026-09-08T12:00:00.000Z');
  const realStart = NativeDate.now();
  class AdvancingFixedDate extends NativeDate {
    constructor(value) {
      super(value === undefined ? fixedStart + (NativeDate.now() - realStart) : value);
    }

    static now() {
      return fixedStart + (NativeDate.now() - realStart);
    }
  }
  window.Date = AdvancingFixedDate;
});
await context.route('**/*', async route => {
  const requestUrl = new URL(route.request().url());
  if (requestUrl.origin === baseOrigin) {
    await route.continue();
    return;
  }
  await route.abort();
});

async function capture(name, payload, prepare) {
  const page = await context.newPage();
  await page.route('**/stats.json', route =>
    route.fulfill({body: JSON.stringify(payload), contentType: 'application/json', status: 200}),
  );
  await page.goto(`${baseOrigin}/stats`);
  await page.getByRole('heading', {name: 'Site statistics'}).waitFor();
  if (prepare) {
    await prepare(page);
  }
  await page.screenshot({fullPage: true, path: `${evidenceDirectory}/${name}.png`});
  return page;
}

const currentPage = await capture('d1-current-320', current);
await currentPage.getByText('Daily values and status', {exact: true}).click();
await currentPage.locator('section').filter({hasText: 'Daily document request observations'}).screenshot({
  path: `${evidenceDirectory}/d1-current-disclosure-320.png`,
});

const measureContrast = async (locator, label) =>
  locator.evaluate(
    (element, measurementLabel) => {
      const parse = value => {
        const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
        return {a: channels[3] ?? 1, b: channels[2], g: channels[1], r: channels[0]};
      };
      const composite = (foreground, background, alpha) => ({
        b: foreground.b * alpha + background.b * (1 - alpha),
        g: foreground.g * alpha + background.g * (1 - alpha),
        r: foreground.r * alpha + background.r * (1 - alpha),
      });
      const luminance = color => {
        const linear = channel => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
      };

      let background = {a: 1, b: 0, g: 0, r: 0};
      let opacity = 1;
      let node = element;
      while (node instanceof Element) {
        const style = getComputedStyle(node);
        opacity *= Number(style.opacity);
        const candidate = parse(style.backgroundColor);
        if (candidate.a > 0) {
          background = candidate;
          break;
        }
        node = node.parentElement;
      }
      const style = getComputedStyle(element);
      const foreground = parse(style.color);
      const renderedForeground = composite(foreground, background, foreground.a * opacity);
      const lighter = Math.max(luminance(renderedForeground), luminance(background));
      const darker = Math.min(luminance(renderedForeground), luminance(background));
      return {
        background: `rgb(${background.r}, ${background.g}, ${background.b})`,
        contrastRatio: Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2)),
        fontSize: style.fontSize,
        foreground: style.color,
        label: measurementLabel,
        opacity,
        sample: element.textContent?.trim().slice(0, 180),
      };
    },
    label,
  );

const contrast = [];
contrast.push(
  await measureContrast(
    currentPage.locator('[data-testid="document-requests"] .text-xs.text-neutral-400').first(),
    'source coverage caption',
  ),
);
contrast.push(await measureContrast(currentPage.locator('figure figcaption'), 'observation date range'));
contrast.push(await measureContrast(currentPage.locator('details summary'), 'daily disclosure summary'));
contrast.push(await measureContrast(currentPage.locator('#methodology p').first(), 'methodology text'));
await currentPage.close();

const zeroUnavailable = {
  ...current,
  countries: [],
  dailyObservations: current.dailyObservations.map(point => ({...point, status: 'missing', views: null})),
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
  topPages: [],
  topReferrers: [],
  totalViews: 0,
  uniqueVisitors: 0,
};
await (await capture('d1-zero-unavailable-320', zeroUnavailable)).close();

const sparse = {
  ...current,
  dailyObservations: [
    {date: '2026-09-01', status: 'observed', views: 2},
    {date: '2026-09-02', status: 'missing', views: null},
    {date: '2026-09-04', status: 'observed', views: 5},
    {date: '2026-09-07', status: 'provisional', views: 0},
  ],
};
await (await capture('d1-sparse-calendar-320', sparse)).close();

const stale = {
  ...current,
  sources: {
    cloudflare: {...current.sources.cloudflare, status: 'stale'},
    cloudfront: {...current.sources.cloudfront, status: 'stale'},
  },
};
await (await capture('d1-stale-320', stale)).close();
await (await capture('d1-error-320', {...current, lastUpdated: '2026-02-30'})).close();

writeFileSync(
  `${evidenceDirectory}/d1-rendered-evidence.json`,
  `${JSON.stringify(
    {
      contrast,
      externalTrafficPolicy: 'all non-local HTTP requests blocked; stats payloads fulfilled with synthetic fixtures',
      fixedCalendar: '2026-09-08T12:00:00.000Z with elapsed real time preserved',
      viewport: {height: 844, width: 320},
    },
    null,
    2,
  )}\n`,
);

await browser.close();
