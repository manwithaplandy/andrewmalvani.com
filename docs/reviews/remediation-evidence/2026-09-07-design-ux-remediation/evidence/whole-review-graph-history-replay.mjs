// Focused replay helper recorded after the review's executed browser check.
// Serve the already checked out/ directory locally first; this does not build.
// This helper was recorded for implementer replay and was not rerun for archiving.
import {chromium} from '@playwright/test';
const origin = 'http://127.0.0.1:3100';
const browser = await chromium.launch();
const context = await browser.newContext({reducedMotion: 'reduce', serviceWorkers: 'block'});
await context.route('**/*', route => {
  const request = route.request();
  return request.method() === 'GET' && new URL(request.url()).origin === origin
    ? route.continue() : route.abort();
});
const page = await context.newPage();
const observations = [];
async function snapshot(label) {
  observations.push({label, url: page.url(),
    state: await page.evaluate(() => history.state),
    graph: await page.getByRole('button', {name: 'Text view', exact: true}).count(),
    contact: await page.locator('#contact').count(),
    marker: await page.evaluate(() => window.__historyReviewMarker)});
}
try {
  await page.goto(origin + '/graph?view=list');
  await page.getByRole('button', {name: 'Text view', exact: true}).waitFor();
  await page.waitForURL(/#node=/);
  await page.evaluate(() => {window.__historyReviewMarker = 'same-document';});
  await snapshot('graph ready');
  await page.getByRole('link', {name: 'Classic resume', exact: true}).click();
  await page.locator('#contact').waitFor({state: 'attached'});
  await snapshot('after Classic resume');
  await page.goBack();
  await page.waitForTimeout(1200);
  await snapshot('after browser Back settled');
  console.log(JSON.stringify(observations, null, 2));
} finally { await context.close(); await browser.close(); }
