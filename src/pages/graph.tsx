import {ArrowDownTrayIcon, ArrowLeftIcon} from '@heroicons/react/24/outline';
import Head from 'next/head';
import Link from 'next/link';
import {FC, memo} from 'react';

import GraphExplorer from '../components/Graph/GraphExplorer';
import Page from '../components/Layout/Page';
import {experience} from '../data/data';
import {siteConfig} from '../data/siteConfig';

const {person} = siteConfig;
const currentRole = experience[0];
const careerStartYear = /\d{4}/.exec(experience[experience.length - 1].date)?.[0] ?? '2018';

/**
 * /graph — the explorable "career constellation". Additive only: the classic
 * resume stays the landing page and SEO-canonical content; this page always
 * keeps one-click paths back to it and to the PDF.
 *
 * The page itself stays light: meta, an instantly-rendered headline overlay,
 * and the state-owning explorer. Everything three-related lives behind the
 * dynamic ssr:false boundary inside GraphExplorer.
 */
const Graph: FC = memo(() => {
  return (
    <Page
      description={`Explore ${person.name}'s career as an interactive 3D graph — roles, skills, certifications and the connections between them.`}
      title={`Career Graph | ${person.name}`}>
      <Head>
        {/* The bottom sheet pads with safe-area insets; cover the notch on this route only. */}
        <meta content="width=device-width, initial-scale=1, viewport-fit=cover" name="viewport" />
      </Head>
      <main className="relative min-h-[100svh] bg-neutral-950 text-white">
        <Link
          className="sr-only z-50 rounded-md bg-neutral-900 px-3 py-2 text-sm text-white ring-orange-500 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:ring-2"
          href="/">
          Skip 3D graph — go to resume content
        </Link>

        {/* Static headline overlay: renders instantly, independent of the canvas. */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 print:static sm:p-6">
          <div className="pointer-events-auto inline-flex max-w-full flex-col gap-y-1 rounded-xl border border-neutral-700 bg-neutral-900/70 px-4 py-3 backdrop-blur-md">
            <h1 className="text-lg font-bold leading-tight sm:text-xl">{person.name}</h1>
            <p className="text-xs text-neutral-400 sm:text-sm">
              {currentRole.title}, {currentRole.location} · since {careerStartYear}
            </p>
            <p className="text-xs text-neutral-500 sm:text-sm">
              Each node is a role, skill, or certification — explore how they connect.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
              <Link
                className="flex items-center gap-x-1 text-neutral-300 hover:text-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                href="/">
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                Classic resume
              </Link>
              <a
                className="flex items-center gap-x-1 text-neutral-300 hover:text-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                href="/assets/resume.pdf">
                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                PDF
              </a>
            </div>
          </div>
        </header>

        <p className="hidden p-6 text-sm text-neutral-600 print:block">
          This page is an interactive 3D graph — for a printable version, use the classic resume at {siteConfig.siteUrl}{' '}
          or the PDF.
        </p>

        <GraphExplorer />
      </main>
    </Page>
  );
});

Graph.displayName = 'Graph';
export default Graph;
