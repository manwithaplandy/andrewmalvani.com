import {Head, Html, Main, NextScript} from 'next/document';

import {CONTENT_SECURITY_POLICY} from '../config';

// next/document <Head /> vs next/head <Head />
//
// next/document Head is rendered once on the server. This is different from next/head which will
// rebuild the next/head fields each time it's called, and won't overwrite next/document's Head.

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        {/* Dev mode needs eval for fast refresh, so only the export carries the policy. */}
        {process.env.NODE_ENV === 'production' && (
          <meta content={CONTENT_SECURITY_POLICY} httpEquiv="Content-Security-Policy" />
        )}
        {/* google translate breaks react:
          - https://github.com/facebook/react/issues/11538
          - https://bugs.chromium.org/p/chromium/issues/detail?id=872770 */}
        <meta content="notranslate" name="google" />
      </Head>
      <body className="bg-neutral-950">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
