import {expect, test} from './fixtures';

for (const width of [320, 390, 430]) {
  test(`homepage fits ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 844});
    await page.goto('/');
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(1);
    for (const link of await page.locator('#hero a').all()) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
  });
}

test('homepage fits with 200% text', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await page.goto('/');
  await page.locator('html').evaluate(element => {
    element.style.fontSize = '200%';
  });

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1);
});

for (const width of [320, 390, 430]) {
  test(`homepage rows remain readable at ${width}px with 200% text`, async ({page}, testInfo) => {
    await page.setViewportSize({width, height: 844});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto('/');
    const originalText = await page.locator('#about, #resume, #contact').allTextContents();
    await page.locator('html').evaluate(element => {
      element.style.fontSize = '200%';
    });
    await page.evaluate(() => document.fonts.ready);

    const layout = await page.evaluate(() => {
      const failures: string[] = [];
      const check = (element: Element, boundary: Element, label: string) => {
        const box = element.getBoundingClientRect();
        const limit = boundary.getBoundingClientRect();
        if (box.left < limit.left - 1 || box.right > limit.right + 1) failures.push(label);
      };
      // Check each row's content, not only document width: another overflowing
      // row can mask the amount by which a skill indicator escapes its card.
      for (const row of document.querySelectorAll('#about li, #contact dd, #resume h3 + div')) {
        const limit = row.getBoundingClientRect();
        const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const text = walker.currentNode;
          if (!text.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(text);
          for (const box of range.getClientRects()) {
            if (box.left < limit.left - 1 || box.right > limit.right + 1) failures.push(text.textContent.trim());
          }
        }
      }
      for (const label of document.querySelectorAll('#resume span')) {
        if (!['Expert', 'Proficient', 'Familiar'].includes(label.textContent ?? '')) continue;
        const group = label.parentElement!;
        const row = group.parentElement!;
        check(group, row, `${row.textContent?.trim()}: tier and indicators`);
        for (const child of group.children) check(child, group, `${label.textContent}: tier content`);
      }
      // A fitting element box does not prove its glyphs fit: long technical
      // terms and badge-constrained credential columns can still clip text.
      for (const section of document.querySelectorAll('#about, #resume, #contact')) {
        const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const text = walker.currentNode;
          let boundary = text.parentElement;
          if (!text.textContent?.trim() || boundary?.closest('.sr-only, [aria-hidden="true"]')) continue;
          while (boundary && getComputedStyle(boundary).display === 'inline') boundary = boundary.parentElement;
          if (!boundary) continue;
          const limit = boundary.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(text);
          for (const box of range.getClientRects()) {
            if (box.left < limit.left - 1 || box.right > limit.right + 1) failures.push(text.textContent.trim());
          }
        }
      }
      return {
        failures,
        fontSize: getComputedStyle(document.documentElement).fontSize,
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    await testInfo.attach('enlarged-row-layout', {
      body: JSON.stringify(layout, null, 2),
      contentType: 'application/json',
    });
    expect(layout.fontSize).toBe('32px');
    expect(await page.locator('#about, #resume, #contact').allTextContents()).toEqual(originalText);
    expect.soft(layout.failures).toEqual([]);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport + 1);
    await expect(page.locator('#contact a[href="mailto:andrewrmalvani@gmail.com"]')).toBeVisible();
  });
}
