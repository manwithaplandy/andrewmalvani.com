import {chromium} from '@playwright/test';

const evidenceDirectory =
  '/Users/andrew/Scripts/react-resume/.worktrees/design-ux-remediation/.superpowers/sdd/2026-09-07-design-ux-remediation/evidence';
const baseOrigin = 'http://127.0.0.1:3100';
const cors = {
  'access-control-allow-origin': baseOrigin,
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

let releasePending;
const pendingGate = new Promise(resolve => {
  releasePending = resolve;
});
let posts = 0;

const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 320, height: 844}});
await context.route('**/*', async route => {
  const requestUrl = new URL(route.request().url());
  if (requestUrl.origin === baseOrigin) {
    await route.continue();
    return;
  }
  await route.abort();
});

const page = await context.newPage();
await page.route('**/api/contact', async route => {
  if (route.request().method() === 'OPTIONS') {
    await route.fulfill({status: 204, headers: cors});
    return;
  }
  if (route.request().method() !== 'POST') {
    throw new Error(`Unexpected contact method: ${route.request().method()}`);
  }
  posts += 1;
  if (posts === 1) {
    await pendingGate;
    await route.fulfill({status: 200, headers: cors, contentType: 'text/plain', body: 'accepted'});
    return;
  }
  await route.abort('failed');
});

await page.goto(`${baseOrigin}/#contact`);
await page.locator('#contact').scrollIntoViewIfNeeded();

const placeholderMeasurement = await page.locator('#contact-message').evaluate(element => {
  const parse = value => {
    const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
    return {r: channels[0], g: channels[1], b: channels[2], a: channels[3] ?? 1};
  };
  const composite = (foreground, background, opacity) => {
    const alpha = foreground.a * opacity;
    return {
      r: foreground.r * alpha + background.r * (1 - alpha),
      g: foreground.g * alpha + background.g * (1 - alpha),
      b: foreground.b * alpha + background.b * (1 - alpha),
    };
  };
  const luminance = color => {
    const linear = channel => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
  };
  const inputStyle = getComputedStyle(element);
  const placeholderStyle = getComputedStyle(element, '::placeholder');
  const background = parse(inputStyle.backgroundColor);
  const foreground = parse(placeholderStyle.color);
  const opacity = Number(placeholderStyle.opacity);
  const renderedForeground = composite(foreground, background, opacity);
  const lighter = Math.max(luminance(renderedForeground), luminance(background));
  const darker = Math.min(luminance(renderedForeground), luminance(background));
  return {
    background: inputStyle.backgroundColor,
    contrastRatio: Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2)),
    foreground: placeholderStyle.color,
    opacity,
    placeholder: element.getAttribute('placeholder'),
    renderedForeground,
  };
});

const name = page.locator('#contact-name');
const email = page.locator('#contact-email');
const message = page.locator('#contact-message');
await name.fill('Synthetic Visitor');
await email.fill('visitor@example.test');
await message.fill('A synthetic intercepted message.');
await page.getByRole('button', {name: 'Send Message', exact: true}).click();
const pendingStatus = page.getByText('Sending your message. Fields are temporarily read-only.', {exact: true});
await pendingStatus.waitFor();
const pendingBusyAncestor = await pendingStatus.evaluate(element =>
  element.closest('[aria-busy="true"]')?.tagName ?? null,
);
await page.locator('#contact').screenshot({path: `${evidenceDirectory}/c2-contact-pending-320.png`});

releasePending();
await page.getByText(/Message sent — thank you/).waitFor();
await name.fill('Synthetic Visitor');
await email.fill('visitor@example.test');
await message.fill('A synthetic intercepted message.');
await page.getByRole('button', {name: 'Send Message', exact: true}).click();
const uncertaintyStatus = page.getByText(/Delivery could not be confirmed/);
await uncertaintyStatus.waitFor();
const uncertaintyPrecedesFields = await uncertaintyStatus.evaluate(element => {
  const firstField = document.getElementById('contact-name');
  return Boolean(firstField && element.compareDocumentPosition(firstField) & Node.DOCUMENT_POSITION_FOLLOWING);
});
await page.locator('#contact').screenshot({path: `${evidenceDirectory}/c2-contact-uncertainty-320.png`});

console.log(
  JSON.stringify(
    {
      externalTrafficPolicy: 'all non-local traffic blocked; contact OPTIONS and POST intercepted',
      pendingBusyAncestor,
      placeholderMeasurement,
      posts,
      uncertaintyPrecedesFields,
      viewport: page.viewportSize(),
    },
    null,
    2,
  ),
);
await browser.close();
