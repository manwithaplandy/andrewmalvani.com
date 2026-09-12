import {ArrowLeftIcon, ArrowPathIcon} from '@heroicons/react/24/outline';
import Link from 'next/link';
import {FC, memo} from 'react';
import {match} from 'ts-pattern';

import Page from '../components/Layout/Page';
import Footer from '../components/Sections/Footer';
import BarList from '../components/Sections/Stats/BarList';
import Sparkline from '../components/Sections/Stats/Sparkline';
import StatCard from '../components/Sections/Stats/StatCard';
import StatsSkeleton from '../components/Sections/Stats/StatsSkeleton';
import {StatsSource, StatsViewModel} from '../data/dataDef';
import useStats from '../hooks/useStats';

const REPO_URL = 'https://github.com/manwithaplandy/react-resume';

const formatFullDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  });
};

const formatCoverage = (since: string, through: string): string => {
  const [sinceYear, sinceMonth, sinceDay] = since.split('-').map(Number);
  const [throughYear, throughMonth, throughDay] = through.split('-').map(Number);
  if (sinceYear === throughYear && sinceMonth === throughMonth) {
    const month = new Date(Date.UTC(sinceYear, sinceMonth - 1, 1)).toLocaleDateString('en-US', {
      month: 'long',
      timeZone: 'UTC',
    });
    return `${month} ${sinceDay}–${throughDay}, ${sinceYear}`;
  }
  return `${formatFullDate(since)} – ${formatFullDate(through)}`;
};

const sourceName = (source: StatsSource): 'CloudFront' | 'Cloudflare' =>
  source.scope === 'site-document-requests' ? 'CloudFront' : 'Cloudflare';

const sourceCaption = (source: StatsSource) => {
  const name = sourceName(source);
  if (source.status === 'unknown') {
    return (
      <div className="flex flex-col gap-y-1">
        <p>Legacy source — freshness unavailable</p>
        <p>
          {source.since
            ? `Known records begin ${formatFullDate(source.since)}; coverage end unavailable.`
            : 'Coverage period unavailable.'}
        </p>
      </div>
    );
  }
  if (source.status === 'unavailable') {
    return <p>{name} source unavailable</p>;
  }

  const status = source.status === 'current' ? 'Current' : 'Stale';
  return (
    <div className="flex flex-col gap-y-1">
      <p>
        {source.since && source.through
          ? `${name} coverage: ${formatCoverage(source.since, source.through)} · ${status}`
          : `${name} coverage unavailable · ${status}`}
      </p>
      <p>
        Last successful update:{' '}
        {source.lastSuccessfulUpdate ? formatFullDate(source.lastSuccessfulUpdate) : 'Unavailable'}
      </p>
    </div>
  );
};

const CARD_CLASS = 'rounded-xl border border-neutral-800 bg-neutral-900 p-6';

const Stats: FC = memo(() => {
  const {state, refetch} = useStats();

  return (
    <Page
      description="Anonymous aggregate request statistics for andrewmalvani.com, with source coverage and freshness."
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
              Anonymous aggregate request statistics without a client-side tracking script. Sources update
              independently, so their coverage and freshness are shown separately. Read the{' '}
              <a className="text-orange-300 hover:underline" href="#methodology">
                methodology and retention notes
              </a>
              .
            </p>
          </header>

          <div aria-live="polite">
            {match(state)
              .with({status: 'loading'}, () => <StatsSkeleton />)
              .with({status: 'error'}, () => (
                <div className={`${CARD_CLASS} flex flex-col items-center gap-y-4 text-center`}>
                  <p className="text-neutral-400">
                    The statistics could not be loaded. The rest of the site is still available; try again shortly.
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

          <section className="flex flex-col gap-y-3 border-t border-neutral-800 pt-8" id="methodology">
            <h2 className="text-lg font-bold text-white">Methodology and retention</h2>
            <p className="text-sm text-neutral-400">
              CloudFront access logs provide filtered document requests. They omit some client-side route transitions,
              so the total does not represent every page change. Cloudflare reports daily unique visits and request
              countries across the measured zone. Summing daily uniques can count the same person on several days.
            </p>
            <p className="text-sm text-neutral-400">
              This page publishes anonymous aggregates and does not load a client-side tracking script. Operational
              access logs are retained under configured storage policies: current log objects expire after 90 days,
              while noncurrent versions expire 30 days after they become noncurrent. These lifecycle settings describe
              configured policy, not an independent audit of exact deletion timing.
            </p>
            <p className="text-sm text-neutral-400">
              The filtering and aggregation pipeline is defined in{' '}
              <a className="text-orange-300 hover:underline" href={REPO_URL} rel="noopener noreferrer" target="_blank">
                this site's public source repository
              </a>
              . Referrers are reduced to domains, countries to ISO codes, and small public buckets are combined as
              “Other”.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </Page>
  );
});

const StatsContent: FC<{data: StatsViewModel}> = memo(({data}) => {
  const {
    countries,
    dailyUniqueVisits,
    documentRequests,
    documentSource,
    edgeSource,
    generatedOn,
    observations,
    topPages,
    topReferrers,
  } = data;
  const legacy = documentSource.status === 'unknown' || edgeSource.status === 'unknown';

  return (
    <div className="flex flex-col gap-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          caption={sourceCaption(documentSource)}
          testId="document-requests"
          title="Observed document requests"
          unavailableText="Unavailable"
          value={documentRequests}
        />
        <StatCard
          caption={sourceCaption(edgeSource)}
          testId="daily-unique-visits"
          title="Daily unique visits (sum)"
          unavailableText="Unavailable"
          value={dailyUniqueVisits}
        />
      </div>

      <p className="text-sm text-neutral-400">
        Document logs omit some client-side transitions. The same person can count on several days in the daily unique
        visit sum.
      </p>

      <section className="flex flex-col gap-y-2 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-lg font-bold text-white">Daily document request observations</h2>
        <Sparkline observations={observations} />
        {legacy && (
          <p className="text-xs text-neutral-400">Legacy data: zero daily values may mean missing data.</p>
        )}
        <p className="text-xs text-neutral-400">Payload generated on {formatFullDate(generatedOn)}.</p>
      </section>

      <p className="text-sm text-neutral-400">
        Countries count requests across the measured Cloudflare zone. They are request totals, not unique people.
      </p>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <BarList
          items={topPages}
          title="Top pages"
          unavailable={documentSource.status === 'unavailable'}
          unavailableText="Page request data is unavailable."
        />
        <BarList
          items={topReferrers}
          title="Referrers"
          unavailable={documentSource.status === 'unavailable'}
          unavailableText="Referrer request data is unavailable."
        />
        <BarList
          items={countries}
          title="Requests by country"
          unavailable={edgeSource.status === 'unavailable'}
          unavailableText="Country request data is unavailable."
        />
      </div>
    </div>
  );
});

StatsContent.displayName = 'StatsContent';
Stats.displayName = 'Stats';
export default Stats;
