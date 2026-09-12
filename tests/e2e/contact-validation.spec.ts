import type {Page} from '@playwright/test';

import {expect, test} from './fixtures';

const CONTACT_ENDPOINT_PATH = '/api/contact';

async function openContactForm(page: Page) {
  const contactRequests: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === CONTACT_ENDPOINT_PATH) {
      contactRequests.push(request.url());
    }
  });

  await page.goto('/#contact');
  return contactRequests;
}

test('invalid send explains errors and focuses the first field', async ({page}) => {
  const contactRequests = await openContactForm(page);

  await page.getByRole('button', {name: 'Send Message', exact: true}).focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('#contact-name')).toBeFocused();
  await expect(page.getByRole('alert', {name: /errors to fix/})).toContainText('3');
  await expect(page.locator('#contact-name-error')).toHaveText('Please enter your name.');
  await expect(page.locator('#contact-email')).toHaveAttribute('aria-invalid', 'true');
  expect(contactRequests).toEqual([]);
});

test('whitespace-only fields and an invalid email remain invalid', async ({page}) => {
  const contactRequests = await openContactForm(page);

  await page.locator('#contact-name').fill('   ');
  await page.locator('#contact-email').fill('not-an-email');
  await page.locator('#contact-message').fill('\n\t ');
  await page.getByRole('button', {name: 'Send Message', exact: true}).click();

  await expect(page.locator('#contact-name')).toBeFocused();
  await expect(page.locator('#contact-name-error')).toHaveText('Please enter your name.');
  await expect(page.locator('#contact-email-error')).toHaveText('Please enter a valid email address.');
  await expect(page.locator('#contact-message-error')).toHaveText('Please enter a message.');
  expect(contactRequests).toEqual([]);
});

test('correction preserves other errors and repeated submit announces the remainder', async ({page}) => {
  const contactRequests = await openContactForm(page);
  const send = page.getByRole('button', {name: 'Send Message', exact: true});

  await send.click();
  await page.locator('#contact-name').fill('Ada Lovelace');

  await expect(page.locator('#contact-name-error')).toHaveCount(0);
  await expect(page.locator('#contact-email-error')).toHaveText('Please enter your email address.');
  await expect(page.locator('#contact-message-error')).toHaveText('Please enter a message.');
  const summary = page.getByRole('alert', {name: /errors to fix/});
  await expect(summary).toContainText('2');

  await send.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#contact-email')).toBeFocused();
  await expect(summary).toContainText('2');

  await summary.getByRole('link', {name: /Message:/}).click();
  await expect(page.locator('#contact-message')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(send).toBeFocused();
  expect(contactRequests).toEqual([]);
});

test('client bounds and message limit feedback match the contact service', async ({page}) => {
  const contactRequests = await openContactForm(page);
  await page.setViewportSize({width: 320, height: 844});

  const name = page.locator('#contact-name');
  const email = page.locator('#contact-email');
  const message = page.locator('#contact-message');
  const counter = page.locator('#contact-message-counter');
  const counterStatus = page.getByRole('status');

  await expect(name).toHaveAttribute('maxlength', '100');
  await name.fill('n'.repeat(100));
  await name.press('End');
  await name.press('x');
  await expect(name).toHaveValue('n'.repeat(100));

  const maximumEmail = `${'a'.repeat(249)}@b.co`;
  expect(maximumEmail).toHaveLength(254);
  await expect(email).toHaveAttribute('maxlength', '254');
  await email.fill(maximumEmail);
  await email.press('End');
  await email.press('x');
  await expect(email).toHaveValue(maximumEmail);

  await expect(message).toHaveAttribute('maxlength', '2000');
  await expect(message).toHaveAttribute('aria-describedby', /\bcontact-message-counter\b/);
  await message.fill('m'.repeat(1799));
  await expect(counter).toHaveText('1799/2000');
  await expect(counterStatus).toBeEmpty();

  await message.fill('m'.repeat(1800));
  await expect(counter).toHaveText('200 characters left');
  await expect(counterStatus).toHaveText('Message is near the 2,000 character limit.');

  await message.fill('m'.repeat(1999));
  await expect(counter).toHaveText('1 character left');
  await expect(counterStatus).toHaveText('Message is near the 2,000 character limit.');

  await message.fill('m'.repeat(2000));
  await message.press('End');
  await message.press('x');
  await expect(message).toHaveValue('m'.repeat(2000));
  await expect(counter).toHaveText('0 characters left');
  await expect(counterStatus).toHaveText('Message character limit reached.');

  const box = await counter.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect(contactRequests).toEqual([]);
});
