import {ArrowLeftIcon, EnvelopeIcon} from '@heroicons/react/24/outline';
import Head from 'next/head';
import Link from 'next/link';
import {FC, memo} from 'react';

import Page from '../components/Layout/Page';
import Footer from '../components/Sections/Footer';

const NotFound: FC = memo(() => (
  <>
    <Head>
      <meta content="noindex, nofollow" name="robots" />
    </Head>
    <Page
      description="The requested page could not be found. Return to Andrew Malvani's résumé or contact him directly."
      title="Page not found | Andrew Malvani">
      <main className="flex min-h-[75vh] items-center bg-neutral-950 px-4 py-16 lg:px-8">
        <section className="mx-auto flex w-full max-w-xl flex-col gap-y-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6 sm:p-10">
          <p className="text-sm font-medium uppercase tracking-widest text-orange-400">404</p>
          <div className="flex flex-col gap-y-3">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">Page not found</h1>
            <p className="text-neutral-400">
              This address does not point to a page on the site. You can return to the résumé or contact Andrew
              directly.
            </p>
          </div>
          <nav aria-label="Missing page recovery" className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center gap-x-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              href="/">
              <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
              Return to the résumé
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-x-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 hover:border-orange-400 hover:text-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              href="/#contact">
              <EnvelopeIcon aria-hidden="true" className="h-4 w-4" />
              Contact Andrew
            </Link>
          </nav>
        </section>
      </main>
      <Footer />
    </Page>
  </>
));

NotFound.displayName = 'NotFound';
export default NotFound;
