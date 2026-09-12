import {writeFile} from 'node:fs/promises';

import type {Locator, Page, TestInfo} from '@playwright/test';

import {expect, test} from './fixtures';

const viewports = [
  {height: 720, label: '320x720', width: 320},
  {height: 844, label: '390x844', width: 390},
  {height: 390, label: '844x390', width: 844},
  {height: 900, label: '1280x900', width: 1280},
] as const;

const graphUrl = '/graph?view=3d#node=education%3Agatech-ms-cs';
const selectedTitle = 'M.S. Computer Science, Georgia Tech';

const disclosure = (page: Page, name: string) =>
  page.locator('details').filter({has: page.getByText(name, {exact: true})});

async function openDisclosure(page: Page, name: string) {
  const container = disclosure(page, name);
  const summary = container.locator('summary');
  await expect(summary).toHaveAccessibleName(name);
  if (!(await container.evaluate(element => (element as HTMLDetailsElement).open))) {
    await summary.click();
  }
  await expect(container).toHaveAttribute('open', '');
}

async function expectUncovered(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  expect(
    await locator.evaluate(element => {
      const box = element.getBoundingClientRect();
      const x = Math.max(0, Math.min(innerWidth - 1, box.left + box.width / 2));
      const y = Math.max(0, Math.min(innerHeight - 1, box.top + box.height / 2));
      const top = document.elementFromPoint(x, y);
      return top === element || element.contains(top) || Boolean(top?.contains(element));
    }),
  ).toBe(true);
  await locator.click({trial: true});
}

async function expectCanvasFitsContainer(page: Page) {
  const application = page.getByRole('application');
  const canvas = page.locator('canvas');
  await expect(application).toBeVisible();
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => {
      const appBox = await application.boundingBox();
      const canvasBox = await canvas.boundingBox();
      if (!appBox || !canvasBox) return false;
      return Math.abs(appBox.width - canvasBox.width) <= 1 && Math.abs(appBox.height - canvasBox.height) <= 1;
    })
    .toBe(true);
}

async function renderedContrast(locator: Locator) {
  return locator.evaluate(element => {
    type Color = [number, number, number, number];
    const parse = (value: string): Color => {
      const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
      return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
    };
    const composite = (front: Color, back: Color): Color => {
      const alpha = front[3] + back[3] * (1 - front[3]);
      if (alpha === 0) return [0, 0, 0, 0];
      return [
        (front[0] * front[3] + back[0] * back[3] * (1 - front[3])) / alpha,
        (front[1] * front[3] + back[1] * back[3] * (1 - front[3])) / alpha,
        (front[2] * front[3] + back[2] * back[3] * (1 - front[3])) / alpha,
        alpha,
      ];
    };
    const layers: Element[] = [];
    for (let current: Element | null = element; current; current = current.parentElement) layers.push(current);
    let background: Color = [255, 255, 255, 1];
    for (const layer of layers.reverse()) {
      background = composite(parse(getComputedStyle(layer).backgroundColor), background);
    }
    const foreground = composite(parse(getComputedStyle(element).color), background);
    const luminance = (color: Color) => {
      const channel = (value: number) => {
        const normalized = value / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2]);
    };
    const lighter = Math.max(luminance(foreground), luminance(background));
    const darker = Math.min(luminance(foreground), luminance(background));
    return {
      background: `rgb(${background
        .slice(0, 3)
        .map(value => Math.round(value))
        .join(', ')})`,
      color: getComputedStyle(element).color,
      ratio: (lighter + 0.05) / (darker + 0.05),
    };
  });
}

async function captureSettled(page: Page, testInfo: TestInfo) {
  await page.screenshot({animations: 'disabled', fullPage: true, path: testInfo.outputPath('settled.png')});
}

for (const viewport of viewports) {
  test(`graph controls and selected details remain usable at ${viewport.label}`, async ({page}, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto(graphUrl);
    await expect(page.locator('canvas'), 'Environment problem: B2 layout requires real WebGL').toBeVisible();

    await expect(page.getByRole('toolbar', {name: 'Career graph controls'})).toBeVisible();
    await openDisclosure(page, 'How to explore');
    await openDisclosure(page, 'Legend');

    const textView = page.getByRole('button', {name: 'Text view', exact: true});
    await textView.click();
    const list = page.getByRole('navigation', {name: 'Career graph, list view'});
    const item = list.getByRole('button', {name: selectedTitle, exact: true});
    await item.click();
    await expect(item).toHaveAttribute('aria-expanded', 'true');
    await expect(list).toContainText('M.S. in Computer Science at Georgia Tech (expected 2028)');

    const threeView = page.getByRole('button', {name: '3D view', exact: true});
    await threeView.click();
    await expect(threeView).toHaveAttribute('aria-pressed', 'true');
    await expectCanvasFitsContainer(page);

    const panel = page.getByRole('region', {name: 'Selected career item'});
    const title = panel.getByRole('heading', {name: selectedTitle, exact: true});
    await title.scrollIntoViewIfNeeded();
    await expect(title).toBeVisible();
    expect(await title.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    await panel.getByRole('button', {name: 'Show more', exact: true}).click();
    await expect(panel).toContainText('formalizing the theory behind the production AI engineering practiced daily');
    if (viewport.width <= 390) {
      await page.getByRole('application').scrollIntoViewIfNeeded();
      await expect(page.locator('canvas')).toBeInViewport();
      const canvasBox = await page.locator('canvas').boundingBox();
      if (canvasBox) await page.mouse.move(canvasBox.x + 5, canvasBox.y + canvasBox.height - 5);
      await page.waitForTimeout(1200);
      await page.screenshot({
        animations: 'disabled',
        path: testInfo.outputPath('settled-canvas.png'),
      });
    }
    await captureSettled(page, testInfo);

    await expectUncovered(page.getByRole('link', {name: 'Classic resume', exact: true}));
    await expectUncovered(page.getByRole('link', {name: 'Download résumé PDF', exact: true}));
    await expectUncovered(textView);
  });
}

test('a long achievement heading wraps completely in phone 3D view', async ({page}) => {
  await page.setViewportSize({height: 844, width: 390});
  await page.goto('/graph?view=3d#node=responsibility%3Acompliance-audits');
  await expect(page.locator('canvas'), 'Environment problem: long-heading coverage requires real WebGL').toBeVisible();
  const title = page
    .getByRole('region', {name: 'Selected career item'})
    .getByRole('heading', {name: 'Compliance audits (100+ clients, $1M+ sales)', exact: true});
  await title.scrollIntoViewIfNeeded();
  await expect(title).toBeVisible();
  expect(await title.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
});

test('the real canvas follows the space left by disclosures and viewport changes', async ({page}) => {
  await page.setViewportSize({height: 900, width: 1280});
  await page.goto(graphUrl);
  await expectCanvasFitsContainer(page);
  const application = page.getByRole('application');
  const before = await application.boundingBox();
  expect(before).not.toBeNull();

  await openDisclosure(page, 'How to explore');
  await openDisclosure(page, 'Legend');
  await expect.poll(async () => (await application.boundingBox())?.height).toBeLessThan((before?.height ?? 0) - 20);
  await expectCanvasFitsContainer(page);

  await page.setViewportSize({height: 390, width: 844});
  await expectCanvasFitsContainer(page);
  const landscape = await application.boundingBox();
  expect(landscape?.height).toBeGreaterThanOrEqual(320);
  expect(landscape?.width).toBeGreaterThan(400);
});

test('200% text keeps graph navigation readable and reachable at 320 CSS pixels', async ({page}) => {
  await page.setViewportSize({height: 720, width: 320});
  await page.goto(graphUrl);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px';
  });
  await openDisclosure(page, 'How to explore');
  await openDisclosure(page, 'Legend');
  const overflowing = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('body *')]
      .filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.left < -1 || box.right > innerWidth + 1);
      })
      .map(element => ({
        className: element.className,
        tag: element.tagName,
        text: element.textContent?.trim().slice(0, 80),
      })),
  );
  expect(overflowing).toEqual([]);
  await expectUncovered(page.getByRole('link', {name: 'Classic resume', exact: true}));
  await expectUncovered(page.getByRole('link', {name: 'Download résumé PDF', exact: true}));
  await expectUncovered(page.getByRole('button', {name: 'Text view', exact: true}));
});

test('small graph information meets contrast on its rendered surfaces', async ({page}, testInfo) => {
  await page.goto(graphUrl);
  await openDisclosure(page, 'How to explore');
  await openDisclosure(page, 'Legend');
  const evidence: Record<string, {background: string; color: string; ratio: number}> = {};
  const recordContrast = async (samples: Array<[string, Locator]>) => {
    for (const [name, locator] of samples) {
      await expect(locator).toBeVisible();
      const measurement = await renderedContrast(locator);
      evidence[name] = {...measurement, ratio: Number(measurement.ratio.toFixed(2))};
      expect(measurement.ratio, `${name} contrast`).toBeGreaterThanOrEqual(4.5);
    }
  };
  await recordContrast([
    [
      'introduction',
      page.getByText('Each node is a role, skill, or certification — explore how they connect.', {exact: true}),
    ],
    ['help', disclosure(page, 'How to explore').locator('p').first()],
    ['legend', disclosure(page, 'Legend').locator('dd').first()],
  ]);

  await page.getByRole('button', {name: 'Text view', exact: true}).click();
  const list = page.getByRole('navigation', {name: 'Career graph, list view'});
  await list.getByRole('button', {name: selectedTitle, exact: true}).click();
  await recordContrast([
    ['text-view guidance', list.locator(':scope > p')],
    ['text-view category', list.getByRole('heading').first()],
    [
      'text-view connection kind',
      page.locator('[id="graph-details-education:gatech-ms-cs"] span[aria-hidden="true"]').last(),
    ],
  ]);

  await page.getByRole('button', {name: '3D view', exact: true}).click();
  const panel = page.getByRole('region', {name: 'Selected career item'});
  await panel.getByRole('button', {name: 'Previous connection'}).click();
  await panel.getByRole('button', {name: 'Next connection'}).click();
  await recordContrast([
    ['selected metadata', panel.getByText('Georgia Tech · Expected 2028', {exact: true})],
    ['selected wrapped state', panel.getByText('· wrapped', {exact: false})],
  ]);
  const evidencePath = testInfo.outputPath('rendered-contrast.json');
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
  await testInfo.attach('rendered-contrast.json', {contentType: 'application/json', path: evidencePath});
});

for (const reduction of ['system', 'manual'] as const) {
  test(`${reduction} reduced motion reveals selected details without panel translation`, async ({page}) => {
    if (reduction === 'system') await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto(graphUrl);
    if (reduction === 'manual') await page.getByRole('button', {name: 'Reduce motion', exact: true}).click();
    await page.getByRole('button', {name: 'Text view', exact: true}).click();
    await page
      .getByRole('navigation', {name: 'Career graph, list view'})
      .getByRole('button', {
        name: selectedTitle,
        exact: true,
      })
      .click();
    await page.getByRole('button', {name: '3D view', exact: true}).click();
    const panel = page.getByRole('region', {name: 'Selected career item'});
    await expect(panel).toBeVisible();
    const motion = await panel.evaluate(element => {
      const style = getComputedStyle(element);
      return {duration: style.transitionDuration, transform: style.transform};
    });
    expect(motion).toEqual({duration: '0s', transform: 'none'});
  });
}

test.describe('mobile performance focus recovery', () => {
  test.use({hasTouch: true});

  test('performance fallback preserves focus outside the disappearing graph experience', async ({page}) => {
    await page.setViewportSize({height: 844, width: 390});
    await page.addInitScript(() => {
      window.requestAnimationFrame = callback => window.setTimeout(() => callback(performance.now()), 90);
      window.cancelAnimationFrame = id => window.clearTimeout(id);
    });
    await page.goto(graphUrl);
    await expect(page.locator('canvas'), 'Environment problem: focus containment requires real WebGL').toBeVisible();
    const exit = page.getByRole('link', {name: 'Classic resume', exact: true});
    await exit.focus();
    await expect(page.getByRole('navigation', {name: 'Career graph, list view'})).toBeVisible({timeout: 15000});
    await expect(exit).toBeFocused();
  });

  test('vertical scrolling on selected details does not scan connections', async ({page}) => {
    await page.goto(graphUrl);
    const panel = page.getByRole('region', {name: 'Selected career item'});
    const dive = panel.getByRole('button', {name: 'Go to highlighted connection', exact: true});
    await expect(dive).toBeDisabled();
    await panel.evaluate(element => {
      element.firstElementChild?.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          touches: [new Touch({clientX: 80, clientY: 100, identifier: 1, target: element})],
        }),
      );
      element.firstElementChild?.dispatchEvent(
        new TouchEvent('touchend', {
          bubbles: true,
          changedTouches: [new Touch({clientX: 130, clientY: 220, identifier: 1, target: element})],
        }),
      );
    });
    await expect(dive).toBeDisabled();
  });
});
