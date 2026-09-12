import {chromium} from '@playwright/test';

const browser = await chromium.launch({headless: true});
const page = await browser.newPage({viewport: {width: 320, height: 844}});
await page.goto('http://127.0.0.1:3100/', {waitUntil: 'networkidle'});

const pageFit = await page.evaluate(() => ({
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
}));
const skill = page.getByText('Javascript & Typescript (Node, React)', {exact: true});
const credential = page.getByRole('heading', {name: 'AWS Solutions Architect Associate', exact: true});
const waitForSettledReveal = async locator => {
  const handle = await locator.elementHandle();
  await page.waitForFunction(
    element => {
      let current = element;
      while (current) {
        const style = getComputedStyle(current);
        if (Number(style.opacity) < 0.99) return false;
        current = current.parentElement;
      }
      return true;
    },
    handle,
  );
};
await skill.scrollIntoViewIfNeeded();
await waitForSettledReveal(skill);
const skillBox = await skill.boundingBox();
const skillCard = skill.locator('xpath=../../..');
await skillCard.screenshot({
  path: '.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-skills-320.png',
});
await credential.scrollIntoViewIfNeeded();
await waitForSettledReveal(credential);
const credentialBox = await credential.boundingBox();
const credentialCard = credential.locator('xpath=../..');
await credentialCard.screenshot({
  path: '.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-credentials-320.png',
});
const settled = {
  credentialOpacity: await credentialCard.evaluate(element => getComputedStyle(element).opacity),
  skillOpacity: await skillCard.evaluate(element => getComputedStyle(element).opacity),
};
const schema = await page.locator('script[type="application/ld+json"]').first().textContent();
await page.screenshot({
  fullPage: true,
  path: '.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-homepage-320.png',
});

await page.goto('http://127.0.0.1:3100/graph?view=list', {waitUntil: 'networkidle'});
const graphIntro = (await page.locator('header').innerText()).split('\n').slice(0, 3);
const graphFit = await page.evaluate(() => ({
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
}));
await page.screenshot({
  fullPage: false,
  path: '.superpowers/sdd/2026-09-07-design-ux-remediation/evidence/a3-graph-320.png',
});

console.log(JSON.stringify({pageFit, skillBox, credentialBox, settled, schema: JSON.parse(schema), graphFit, graphIntro}, null, 2));
await browser.close();
