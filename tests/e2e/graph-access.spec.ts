import type {Page} from '@playwright/test';

import {expect, test} from './fixtures';

const list = (page: Page) => page.getByRole('navigation', {name: 'Career graph, list view'});
const textView = (page: Page) => page.getByRole('button', {name: 'Text view', exact: true});
const threeView = (page: Page) => page.getByRole('button', {name: '3D view', exact: true});

async function expectResumeLinks(page: Page) {
  await expect(page.getByRole('link', {name: 'Classic resume', exact: true})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Download résumé PDF', exact: true})).toBeVisible();
}

async function expectThreeDimensionalView(page: Page) {
  await expect(
    page.getByRole('application'),
    'Environment problem: Chromium must initialize real WebGL for the 3D keyboard regression',
  ).toBeVisible();
  await expect(page.locator('canvas'), 'Environment problem: real 3D canvas did not initialize').toBeVisible();
}

async function expectVisibleFocus(page: Page) {
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  await expect
    .poll(() =>
      focused.evaluate(element => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          box.width > 1 &&
          box.height > 1 &&
          box.top >= 0 &&
          box.bottom <= innerHeight + 1 &&
          style.clip !== 'rect(0px, 0px, 0px, 0px)' &&
          (style.boxShadow !== 'none' || (style.outlineStyle !== 'none' && style.outlineWidth !== '0px'))
        );
      }),
    )
    .toBe(true);
}

for (const hash of ['#node=%', '#node=%E0%A4%A', '#node=unknown', '#other']) {
  test(`invalid graph link remains usable: ${hash}`, async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/graph${hash}`);
    await expectResumeLinks(page);
    await textView(page).click();
    await expect(list(page)).toBeVisible();
    await expect(list(page).locator('button[aria-current="true"]')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}

test('valid deep link survives view switches without mount history entries', async ({page}) => {
  await page.goto('/');
  await page.goto('/graph#node=skill%3Apython');
  await expectThreeDimensionalView(page);
  await expect(page.getByRole('heading', {name: 'Python', exact: true})).toBeVisible();
  await textView(page).click();
  await expect(textView(page)).toBeFocused();
  await expect(textView(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/view=list#node=skill%3Apython$/);
  await expect(list(page).getByRole('button', {name: 'Python', exact: true})).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('canvas')).toHaveCount(0);
  await threeView(page).click();
  await expect(threeView(page)).toBeFocused();
  await expectThreeDimensionalView(page);
  await expect(list(page)).toHaveCount(0);
  await expect(page).toHaveURL(/view=3d#node=skill%3Apython$/);
  await page.goBack();
  await expect(list(page)).toBeVisible();
  await page.goBack();
  await expectThreeDimensionalView(page);
  await page.goBack();
  await expect(page).toHaveURL('/');
  await page.goForward();
  await expect(page.getByRole('heading', {name: 'Python', exact: true})).toBeVisible();
});

test('chosen text view exposes ordinary keyboard-operable disclosures and connection navigation', async ({page}) => {
  await page.goto('/graph?view=list#node=skill%3Apython');
  await expectResumeLinks(page);
  await expect(list(page)).toBeVisible();
  await expect(list(page)).not.toContainText("Your browser can't");
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('tree')).toHaveCount(0);
  const python = list(page).getByRole('button', {name: 'Python', exact: true});
  await python.focus();
  await page.keyboard.press('Tab');
  await expectVisibleFocus(page);
  const connection = page.locator(':focus');
  await expect(connection).toContainText('connection 1 of');
  await page.keyboard.press('Enter');
  await expect(python).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator(':focus')).toHaveAttribute('aria-current', 'true');
  const selected = list(page).locator('button[aria-current="true"]');
  await expect(selected).toHaveAttribute('aria-expanded', 'true');
  const detailId = await selected.getAttribute('aria-controls');
  expect(detailId).toBeTruthy();
  await expect(page.locator(`[id="${detailId}"]`)).toBeVisible();
  await page.goBack();
  await expect(python).toHaveAttribute('aria-expanded', 'true');
  await page.goForward();
  await expect(python).toHaveAttribute('aria-expanded', 'false');
});

test('3D tab order contains visible entry and connection controls, with no hidden list', async ({page}) => {
  await page.goto('/graph?view=3d#node=skill%3Apython');
  await expectThreeDimensionalView(page);
  await expect(list(page)).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expectVisibleFocus(page);
  await expect(page.locator(':focus')).toContainText('Skip 3D graph');
  let reachedNext = false;
  for (let stop = 0; stop < 20; stop++) {
    await page.keyboard.press('Tab');
    await expectVisibleFocus(page);
    if ((await page.locator(':focus').getAttribute('aria-label')) === 'Next connection') {
      reachedNext = true;
      await page.keyboard.press('Enter');
      await page.keyboard.press('Tab');
      await expectVisibleFocus(page);
      await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Go to /);
      await page.keyboard.press('Enter');
      break;
    }
  }
  expect(reachedNext).toBe(true);
  await expect(page).not.toHaveURL(/#node=skill%3Apython$/);
});

for (const operation of ['getItem', 'setItem', 'removeItem', 'getter']) {
  test(`denied hint storage ${operation} remains recoverable`, async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(operation => {
      if (operation === 'getter') {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new Error('Storage denied');
          },
        });
      } else {
        Storage.prototype[operation as 'getItem'] = () => {
          throw new Error('Storage denied');
        };
      }
    }, operation);
    await page.goto('/graph?view=3d#node=skill%3Apython');
    await expectThreeDimensionalView(page);
    await page.getByRole('button', {name: 'Dismiss hint', exact: true}).click();
    const help = page.locator('details').filter({has: page.getByText('How to explore', {exact: true})});
    await expect(help).not.toHaveAttribute('open', '');
    await help.locator('summary').click();
    await expect(page.getByRole('button', {name: 'Dismiss hint', exact: true})).toBeVisible();
    await textView(page).click();
    await expect(list(page).getByRole('button', {name: 'Python', exact: true})).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expectResumeLinks(page);
    expect(errors).toEqual([]);
  });
}

test('unavailable WebGL overrides an explicit 3D request and preserves selection', async ({page}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, ...args) {
      if (String(type).startsWith('webgl')) return null;
      return getContext.apply(this, [type, ...args] as Parameters<typeof getContext>);
    } as typeof getContext;
  });
  await page.goto('/graph?view=3d#node=skill%3Apython');
  await expect(list(page)).toBeVisible();
  await expect(list(page)).toContainText("Your browser can't");
  await expect(list(page).getByRole('button', {name: 'Python', exact: true})).toHaveAttribute('aria-expanded', 'true');
  await threeView(page).click();
  await expect(list(page)).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expectResumeLinks(page);
});

test('unknown view values use the supported default', async ({page}) => {
  await page.goto('/graph?view=unknown');
  await expectThreeDimensionalView(page);
  await expect(threeView(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(list(page)).toHaveCount(0);
});

test('browser mode navigation moves focus out of the view being removed', async ({page}) => {
  await page.goto('/graph?view=3d#node=skill%3Apython');
  await expectThreeDimensionalView(page);
  await textView(page).click();
  await list(page).getByRole('button', {name: 'Python', exact: true}).focus();
  await page.goBack();
  await expectThreeDimensionalView(page);
  await expect(threeView(page)).toBeFocused();
  await page.getByRole('button', {name: 'Next connection', exact: true}).focus();
  await page.goForward();
  await expect(list(page)).toBeVisible();
  await expect(textView(page)).toBeFocused();
});

test.describe('mobile graphics', () => {
  test.use({hasTouch: true});

  test('slow graphics falls back to text with the selected content and persistent focus', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.addInitScript(() => {
      // Exercise the real canvas FPS probe with slow animation frames.
      window.requestAnimationFrame = callback => window.setTimeout(() => callback(performance.now()), 90);
      window.cancelAnimationFrame = id => window.clearTimeout(id);
    });
    await page.goto('/graph?view=3d#node=skill%3Apython');
    await expectThreeDimensionalView(page);
    await page.getByRole('application').focus();
    await expect(list(page)).toBeVisible({timeout: 15000});
    await expect(list(page)).toContainText('running slowly');
    await expect(list(page).getByRole('button', {name: 'Python', exact: true})).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(threeView(page)).toBeFocused();
    await expectResumeLinks(page);
  });
});

test('unescaped valid deep links do not add a history entry during mount', async ({page}) => {
  await page.goto('/');
  await page.goto('/graph?view=list#node=skill:python');
  await expect(list(page).getByRole('button', {name: 'Python', exact: true})).toHaveAttribute('aria-expanded', 'true');
  await page.goBack();
  await expect(page).toHaveURL('/');
});

for (const {id, detail} of [
  {id: 'skill:python', detail: 'Hands-on depth: Expert'},
  {id: 'job:tillster-it-strategic-analyst', detail: 'Tillster, Inc. · October 2021 - February 2023'},
]) {
  test(`text view preserves selected detail: ${id}`, async ({page}) => {
    await page.goto(`/graph?view=list#node=${encodeURIComponent(id)}`);
    await expect(list(page)).toContainText(detail);
  });
}

test('selection-only history recovers focus from disappearing text connections', async ({page}) => {
  await page.goto('/graph?view=list#node=skill%3Apython');
  const python = list(page).getByRole('button', {name: 'Python', exact: true});
  const bash = list(page).getByRole('button', {name: 'Bash', exact: true});
  await bash.click();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toContainText('connection 1 of');
  await page.goBack();
  await expect(python).toHaveAttribute('aria-expanded', 'true');
  await expect(textView(page)).toBeFocused();
  await expectVisibleFocus(page);

  await python.focus();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toContainText('connection 1 of');
  await page.goForward();
  await expect(bash).toHaveAttribute('aria-expanded', 'true');
  await expect(textView(page)).toBeFocused();
  await expectVisibleFocus(page);
});

test('selection-only history recovers text connection focus when deselecting', async ({page}) => {
  await page.goto('/graph?view=3d#node=skill%3Apython');
  await expectThreeDimensionalView(page);
  await page.getByRole('button', {name: 'Deselect node', exact: true}).click();
  await textView(page).click();
  await expect(page).toHaveURL(/view=list$/);
  const python = list(page).getByRole('button', {name: 'Python', exact: true});
  await python.click();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toContainText('connection 1 of');
  await page.goBack();
  await expect(list(page).locator('button[aria-current="true"]')).toHaveCount(0);
  await expect(textView(page)).toBeFocused();
  await expectVisibleFocus(page);
});

for (const control of ['entry', 'mode']) {
  test(`selection-only history keeps focus on a persistent ${control} control`, async ({page}) => {
    await page.goto('/graph?view=list#node=skill%3Apython');
    const python = list(page).getByRole('button', {name: 'Python', exact: true});
    const bash = list(page).getByRole('button', {name: 'Bash', exact: true});
    await bash.click();
    const persistentControl = control === 'entry' ? python : textView(page);
    await persistentControl.focus();
    await page.goBack();
    await expect(python).toHaveAttribute('aria-expanded', 'true');
    await expect(persistentControl).toBeFocused();
    await page.goForward();
    await expect(bash).toHaveAttribute('aria-expanded', 'true');
    await expect(persistentControl).toBeFocused();
  });
}

for (const entry of ['initial selection', 'changed selection', 'changed view'] as const) {
  test(`cross-page history restores graph after ${entry}`, async ({page}, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const initial = '/graph?view=list#node=job%3Aga-lead-ai-ml-engineer';
    const python = '/graph?view=list#node=skill%3Apython';
    const threePython = '/graph?view=3d#node=skill%3Apython';
    await page.goto(entry === 'changed view' ? threePython : '/graph?view=list');
    if (entry === 'changed view') {
      await expectThreeDimensionalView(page);
      await textView(page).click();
    } else {
      await expect(list(page)).toBeVisible();
      if (entry === 'changed selection') {
        await list(page).getByRole('button', {name: 'Python', exact: true}).click();
      }
    }
    const graphUrl = entry === 'initial selection' ? initial : python;
    const selectedName = entry === 'initial selection' ? 'Lead AI/ML Engineer' : 'Python';
    const expectRestoredGraph = async () => {
      await expect(page).toHaveURL(graphUrl);
      await expect(list(page)).toBeVisible();
      await expect(textView(page)).toHaveAttribute('aria-pressed', 'true');
      await expect(list(page).getByRole('button', {name: selectedName, exact: true})).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      await expect(page.locator('#contact')).toHaveCount(0);
    };
    await expectRestoredGraph();
    // A marker proves Classic resume and history exercise the same document's
    // actual page router, rather than passing through full-page reloads.
    await page.evaluate(() => (document.documentElement.dataset.historyJourney = 'graph-resume'));
    await page.getByRole('link', {name: 'Classic resume', exact: true}).click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('#contact')).toBeVisible();
    await expect(list(page)).toHaveCount(0);
    await page.goBack();
    await expectRestoredGraph();
    await page.screenshot({path: testInfo.outputPath('graph-restored-after-resume.png')});

    if (entry !== 'initial selection') {
      await page.goBack();
      if (entry === 'changed view') {
        await expect(page).toHaveURL(threePython);
        await expectThreeDimensionalView(page);
        await expect(threeView(page)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByRole('heading', {name: 'Python', exact: true})).toBeVisible();
        await expect(list(page)).toHaveCount(0);
      } else {
        await expect(page).toHaveURL(initial);
        await expect(list(page).getByRole('button', {name: 'Lead AI/ML Engineer', exact: true})).toHaveAttribute(
          'aria-expanded',
          'true',
        );
      }
      await page.goForward();
      await expectRestoredGraph();
    }
    await page.goForward();
    await expect(page).toHaveURL('/');
    await expect(page.locator('#contact')).toBeVisible();
    await expect(list(page)).toHaveCount(0);
    await page.goBack();
    await expectRestoredGraph();
    await expect(page.locator('html')).toHaveAttribute('data-history-journey', 'graph-resume');
    expect(errors).toEqual([]);
  });
}
