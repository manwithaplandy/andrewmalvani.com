import {expect, test as base} from '@playwright/test';

const test = base.extend({
  context: async ({baseURL, context}, use) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL must be configured');
    }

    const baseOrigin = new URL(baseURL).origin;
    await context.route('**/*', async route => {
      const requestUrl = new URL(route.request().url());
      const isHttp = requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:';

      if (!isHttp || requestUrl.origin === baseOrigin) {
        await route.continue();
        return;
      }

      await route.abort();
    });

    await use(context);
  },
});

export {expect, test};
