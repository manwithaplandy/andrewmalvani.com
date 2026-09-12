import {chromium} from '@playwright/test';

const evidenceDir = '.superpowers/sdd/2026-09-07-design-ux-remediation/evidence';
const browser = await chromium.launch({headless: true});
const results = {};

for (const viewport of [
  {name: 'desktop', width: 1440, height: 1000},
  {name: '320', width: 320, height: 844},
]) {
  const errors = [];
  const page = await browser.newPage({viewport});
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  await page.goto('http://127.0.0.1:3100/#portfolio', {waitUntil: 'networkidle'});

  const cards = page.locator('#portfolio article');
  for (let index = 0; index < (await cards.count()); index += 1) {
    const card = cards.nth(index);
    await card.scrollIntoViewIfNeeded();
    const handle = await card.elementHandle();
    await page.waitForFunction(
      element => {
        let current = element;
        while (current) {
          if (Number(getComputedStyle(current).opacity) < 0.99) return false;
          current = current.parentElement;
        }
        return true;
      },
      handle,
    );
  }

  const portfolio = page.locator('#portfolio');
  await portfolio.scrollIntoViewIfNeeded();
  const cardData = await cards.evaluateAll(elements =>
    elements.map(element => {
      const image = element.querySelector('img');
      const heading = element.querySelector('h3');
      const link = element.querySelector('a');
      const imageBox = image?.getBoundingClientRect();
      return {
        title: heading?.textContent?.trim(),
        href: link?.getAttribute('href'),
        objectFit: image ? getComputedStyle(image).objectFit : null,
        imageWidth: imageBox?.width,
        imageHeight: imageBox?.height,
      };
    }),
  );
  const pageFit = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  const opacity = await cards.evaluateAll(elements =>
    elements.map(element => {
      let current = element;
      let minimum = 1;
      while (current) {
        minimum = Math.min(minimum, Number(getComputedStyle(current).opacity));
        current = current.parentElement;
      }
      return minimum;
    }),
  );

  await portfolio.screenshot({path: `${evidenceDir}/a4-portfolio-${viewport.name}.png`});
  results[viewport.name] = {
    viewport: {width: viewport.width, height: viewport.height},
    pageFit,
    cardCount: await cards.count(),
    disclosureCount: await page.locator('#portfolio details').count(),
    cardData,
    minimumAncestorOpacityByCard: opacity,
    errors,
  };
  await page.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
