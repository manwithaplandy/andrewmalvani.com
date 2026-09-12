import {chromium} from '@playwright/test';

const evidenceDirectory =
  '/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/.superpowers/sdd/2026-09-07-design-ux-remediation/evidence';
const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 320, height: 844}});
await context.route('**/*', async route => {
  const requestUrl = new URL(route.request().url());
  if (requestUrl.origin === 'http://127.0.0.1:3100') {
    await route.continue();
  } else {
    await route.abort();
  }
});

const page = await context.newPage();
await page.goto('http://127.0.0.1:3100/#contact');
await page.locator('#contact').scrollIntoViewIfNeeded();

const counter = page.locator('#contact-message-counter');
await counter.screenshot({path: `${evidenceDirectory}/c1-counter-ordinary.png`});
const ordinary = await counter.evaluate(element => ({
  color: getComputedStyle(element).color,
  text: element.textContent,
}));

await page.getByRole('button', {name: 'Send Message', exact: true}).click();
await page.locator('#contact-message').fill('m'.repeat(1800));
await page.getByRole('button', {name: 'Send Message', exact: true}).click();

await counter.screenshot({path: `${evidenceDirectory}/c1-counter-near-limit.png`});
const nearLimit = await counter.evaluate(element => ({
  color: getComputedStyle(element).color,
  text: element.textContent,
}));
const focusId = await page.evaluate(() => document.activeElement?.id);
const summaryText = await page.getByRole('alert', {name: /errors to fix/}).innerText();
await page.locator('#contact').screenshot({
  path: `${evidenceDirectory}/c1-contact-summary-320.png`,
});

console.log(JSON.stringify({focusId, nearLimit, ordinary, summaryText, viewport: page.viewportSize()}, null, 2));
await browser.close();
