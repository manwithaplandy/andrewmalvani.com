import {ArrowLeftIcon} from '@heroicons/react/24/outline';
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

const Stats: FC = memo(() => {
  const state = useStats();

  return (
    <Page
      description="Anonymous, aggregate visitor statistics for andrewmalvani.com — no cookies, no tracking, just CloudFront logs and a daily Lambda."
      title="Site Statistics | Andrew Malvani">
      <main className="min-h-screen bg-neutral-900 px-4 py-16 lg:px-8">
        <div className="mx-auto flex max-w-screen-md flex-col gap-y-10">
          <header className="flex flex-col gap-y-4">
            <Link
              className="flex items-center gap-x-2 self-start text-sm text-neutral-400 hover:text-orange-400"
              href="/">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to andrewmalvani.com
            </Link>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">Site statistics</h1>
            <p className="text-neutral-400">
              Live(ish) analytics for this site, built without any client-side tracking. No cookies. No personal data.
              Counts are anonymous aggregates, updated daily at 00:00 UTC.
            </p>
          </header>

          {match(state)
            .with({status: 'loading'}, () => <StatsSkeleton />)
            .with({status: 'empty'}, () => (
              <p className="rounded-lg bg-neutral-800 p-6 text-center text-neutral-400">
                The pipeline just launched and the numbers are still warming up. Check back tomorrow.
              </p>
            ))
            .with({status: 'error'}, () => (
              <p className="rounded-lg bg-neutral-800 p-6 text-center text-neutral-400">
                The stats are taking a quiet moment. The rest of the site is very much alive — try again in a bit.
              </p>
            ))
            .with({status: 'success'}, ({data}) => <StatsContent data={data} />)
            .exhaustive()}

          <section className="flex flex-col gap-y-3 border-t border-neutral-800 pt-8">
            <h2 className="text-lg font-bold text-white">How this works</h2>
            <p className="text-sm text-neutral-400">
              There is no tracking script on this site. A scheduled EventBridge rule invokes a Lambda once a day, which
              parses the CloudFront access logs the site already produces, folds anonymous aggregates into DynamoDB,
              asks Cloudflare's edge analytics for approximate uniques and countries, and publishes a static{' '}
              <span className="text-neutral-300">stats.json</span> back to S3 — the same bucket serving this page. The
              whole pipeline is defined in Terraform in{' '}
              <a className="text-orange-400 hover:underline" href={REPO_URL} rel="noopener noreferrer" target="_blank">
                this site's GitHub repo
              </a>
              .
            </p>
            <p className="text-sm text-neutral-500">
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

      <section className="flex flex-col gap-y-2 rounded-lg bg-neutral-800 p-6">
        <h2 className="text-lg font-bold text-white">Last 30 days</h2>
        <Sparkline points={dailySeries} />
        <p className="text-xs text-neutral-500">
          Daily page views · updated daily at 00:00 UTC (last update {lastUpdated}) · CloudFront log delivery can lag up
          to a day
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
