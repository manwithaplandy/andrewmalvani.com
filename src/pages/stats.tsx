import {ArrowLeftIcon, ArrowPathIcon} from '@heroicons/react/24/outline';
import Link from 'next/link';
import {FC, memo, useMemo} from 'react';
import {match} from 'ts-pattern';

import Page from '../components/Layout/Page';
import Footer from '../components/Sections/Footer';
import BarList from '../components/Sections/Stats/BarList';
import Sparkline from '../components/Sections/Stats/Sparkline';
import StatCard from '../components/Sections/Stats/StatCard';
import StatsSkeleton from '../components/Sections/Stats/StatsSkeleton';
import {StatsPayload} from '../data/dataDef';
import useStats from '../hooks/useStats';

const REPO_URL = 'https://github.com/manwithaplandy/react-resume';

const formatMonthYear = (isoDate: string): string => {
  const [year, month] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, 1));
  return date.toLocaleDateString('en-US', {month: 'long', timeZone: 'UTC', year: 'numeric'});
};

// Day-precision sibling of formatMonthYear for lastUpdated, which carries a day.
const formatFullDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  return date.toLocaleDateString('en-US', {day: 'numeric', month: 'long', timeZone: 'UTC', year: 'numeric'});
};

// Shared card language, matching SpotlightCard / the home sections.
const CARD_CLASS = 'rounded-xl border border-neutral-800 bg-neutral-900 p-6';

const Stats: FC = memo(() => {
  const {state, refetch} = useStats();

  return (
    <Page
      description="Anonymous, aggregate visitor statistics for andrewmalvani.com — no cookies, no tracking, just CloudFront logs and a daily Lambda."
      title="Site Statistics | Andrew Malvani">
      <main className="min-h-screen bg-neutral-950 px-4 py-16 lg:px-8">
        <div className="mx-auto flex max-w-screen-md flex-col gap-y-10">
          <header className="flex flex-col gap-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <Link className="flex items-center gap-x-2 text-neutral-400 hover:text-orange-300" href="/">
                <ArrowLeftIcon className="h-4 w-4" />
                Back to andrewmalvani.com
              </Link>
              <span aria-hidden="true" className="text-neutral-700">
                ·
              </span>
              <Link className="text-neutral-400 hover:text-orange-300" href="/#contact">
                Contact
              </Link>
              <Link className="text-neutral-400 hover:text-orange-300" href="/graph">
                Career graph
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">Site statistics</h1>
            <p className="text-neutral-400">
              Live(ish) analytics for this site, built without any client-side tracking. No cookies. No personal data.
              Counts are anonymous aggregates, updated daily at 00:00 UTC.
            </p>
          </header>

          {/* Persistent live region so each state transition is announced. */}
          <div aria-live="polite">
            {match(state)
              .with({status: 'loading'}, () => <StatsSkeleton />)
              .with({status: 'empty'}, () => (
                <p className={`${CARD_CLASS} text-center text-neutral-400`}>
                  The pipeline just launched and the numbers are still warming up. Check back tomorrow.
                </p>
              ))
              .with({status: 'error'}, () => (
                <div className={`${CARD_CLASS} flex flex-col items-center gap-y-4 text-center`}>
                  <p className="text-neutral-400">
                    The stats are taking a quiet moment. The rest of the site is very much alive — try again in a bit.
                  </p>
                  <button
                    className="flex items-center gap-x-2 self-center rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:border-orange-400 hover:text-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    onClick={refetch}
                    type="button">
                    <ArrowPathIcon className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              ))
              .with({status: 'success'}, ({data}) => <StatsContent data={data} />)
              .exhaustive()}
          </div>

          <section className="flex flex-col gap-y-3 border-t border-neutral-800 pt-8">
            <h2 className="text-lg font-bold text-white">How this works</h2>
            <p className="text-sm text-neutral-400">
              There is no tracking script on this site. A scheduled EventBridge rule invokes a Lambda once a day, which
              parses the CloudFront access logs the site already produces, folds anonymous aggregates into DynamoDB,
              asks Cloudflare's edge analytics for approximate uniques and countries, and publishes a static{' '}
              <span className="text-neutral-300">stats.json</span> back to S3 — the same bucket serving this page. The
              whole pipeline is defined in Terraform in{' '}
              <a className="text-orange-300 hover:underline" href={REPO_URL} rel="noopener noreferrer" target="_blank">
                this site's GitHub repo
              </a>
              .
            </p>
            <p className="text-sm text-neutral-400">
              No cookies. No personal data. Counts are anonymous aggregates: bots are filtered best-effort, referrers
              are reduced to bare domains, countries to ISO codes, and any bucket smaller than five collapses into
              “Other”.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </Page>
  );
});

const StatsContent: FC<{data: StatsPayload}> = memo(({data}) => {
  const {totalViews, uniqueVisitors, since, lastUpdated, dailySeries, topPages, topReferrers, countries} = data;

  const totalViewsStat = useMemo(
    () => ({title: `Page views since ${formatMonthYear(since)}`, value: totalViews}),
    [since, totalViews],
  );
  const uniquesStat = useMemo(
    () => ({title: 'Unique visitors (approximate)', value: uniqueVisitors}),
    [uniqueVisitors],
  );

  return (
    <div className="flex flex-col gap-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard caption="Bot-filtered (best effort), from CloudFront access logs" stat={totalViewsStat} />
        <StatCard caption="Measured at the Cloudflare edge — no IPs stored here" stat={uniquesStat} />
      </div>

      <section className="flex flex-col gap-y-2 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-lg font-bold text-white">Last 30 days</h2>
        <Sparkline points={dailySeries} />
        <p className="text-xs text-neutral-400">
          Daily page views · updated daily at 00:00 UTC (last update {formatFullDate(lastUpdated)}) · CloudFront log
          delivery can lag up to a day
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <BarList items={topPages} title="Top pages" />
        <BarList items={topReferrers} title="Referrers" />
        <BarList items={countries} title="Countries" />
      </div>
    </div>
  );
});

StatsContent.displayName = 'StatsContent';
Stats.displayName = 'Stats';
export default Stats;
