import {execFileSync} from 'node:child_process';
import path from 'node:path';

import {normalizeStatsPayload} from '../../src/utils/statsPayload';
import {expect, test} from './fixtures';

for (const scenario of ['stale', 'current', 'zero']) {
  test(`actual producer output is compatible with the reader: ${scenario}`, async ({page}, testInfo) => {
    const payload: unknown = JSON.parse(
      execFileSync(
        process.env.STATS_TEST_PYTHON ?? 'python3',
        [path.resolve('tests/stats/export_fixture.py'), scenario],
        {
          encoding: 'utf8',
          env: {PATH: process.env.PATH, PYTHONNOUSERSITE: '1', AWS_EC2_METADATA_DISABLED: 'true'},
        },
      ),
    );
    const model = normalizeStatsPayload(payload, '2026-09-08');
    expect(model).not.toBeNull();
    expect(model?.observations).toHaveLength(30);
    expect(model?.observations.at(-1)).toEqual({date: '2026-09-07', status: 'provisional', views: 0});
    expect(model?.documentRequests).toBe(10);
    expect(model?.dailyUniqueVisits).toBe(scenario === 'zero' ? 0 : 2);
    expect(model?.topPages).toEqual([
      {label: '/', value: 6},
      {label: 'Other', value: 4},
    ]);
    expect(model?.edgeSource.status).toBe(scenario === 'stale' ? 'stale' : 'current');
    await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
    await page.route('**/stats.json', route => route.fulfill({json: payload}));
    if (scenario === 'stale') await page.setViewportSize({width: 320, height: 900});
    await page.goto('/stats');
    const card = page.getByTestId('daily-unique-visits');
    await expect(card.getByText(scenario === 'zero' ? '0' : '2', {exact: true})).toBeVisible();
    await expect(card).toContainText(scenario === 'stale' ? 'Stale' : 'Current');
    await expect(card).toContainText(
      scenario === 'stale' ? 'Last successful update: Unavailable' : 'September 8, 2026',
    );
    await expect(page.getByTestId('document-requests')).toContainText('Current');
    await page.screenshot({path: testInfo.outputPath(`producer-${scenario}.png`), fullPage: true});
    await page.getByText('Daily values and status', {exact: true}).click();
    await expect(page.getByRole('cell', {name: 'September 7, 2026', exact: true})).toBeVisible();
    await expect(page.getByRole('cell', {name: 'September 8, 2026', exact: true})).toHaveCount(0);
  });
}

for (const scenario of ['partial-prior', 'partial-empty']) {
  test(`partial source storage keeps the accepted dataset: ${scenario}`, async ({page}, testInfo) => {
    const payload: unknown = JSON.parse(
      execFileSync(
        process.env.STATS_TEST_PYTHON ?? 'python3',
        [path.resolve('tests/stats/export_fixture.py'), scenario],
        {encoding: 'utf8', env: {PATH: process.env.PATH, PYTHONNOUSERSITE: '1', AWS_EC2_METADATA_DISABLED: 'true'}},
      ),
    );
    const prior = scenario === 'partial-prior';
    const model = normalizeStatsPayload(payload, '2026-09-08');
    expect(model?.documentRequests).toBe(10);
    expect(model?.dailyUniqueVisits).toBe(prior ? 1 : null);
    expect(model?.countries).toEqual(prior ? [{label: 'US', value: 7}] : []);
    expect(model?.edgeSource).toEqual({
      status: prior ? 'stale' : 'unavailable',
      scope: 'zone-requests',
      since: prior ? '2026-09-02' : null,
      through: prior ? '2026-09-02' : null,
      lastSuccessfulUpdate: prior ? '2026-09-03' : null,
    });
    await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
    await page.setViewportSize({width: 320, height: 900});
    await page.route('**/stats.json', route => route.fulfill({json: payload}));
    await page.goto('/stats');
    const card = page.getByTestId('daily-unique-visits');
    await expect(card).toContainText(prior ? 'Stale' : 'Unavailable');
    if (prior) {
      await expect(card.getByText('1', {exact: true})).toBeVisible();
      await expect(card).toContainText('September 3, 2026');
    }
    await expect(page.getByTestId('document-requests')).toContainText('Current');
    await page.screenshot({path: testInfo.outputPath(`${scenario}.png`), fullPage: true});
  });
}
