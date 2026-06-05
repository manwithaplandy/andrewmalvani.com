import {useEffect, useState} from 'react';

import {StatsDailyPoint, StatsDatum, StatsPayload} from '../data/dataDef';

export type StatsState =
  | {status: 'loading'}
  | {status: 'error'}
  | {status: 'empty'}
  | {status: 'success'; data: StatsPayload};

// Defensive validation of the fetched payload. The aggregator already
// allowlists every label at ingest, but the client re-validates so nothing
// unexpected can reach the DOM even if the payload is stale or corrupted.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$/;
// Bare IPv4 hosts match DOMAIN_RE but must never render ("no IPs on the page").
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const ISO_COUNTRY_RE = /^[A-Z]{2}$/;
const PAGE_RE = /^\/[A-Za-z0-9/_.-]{0,99}$/;

const MAX_LIST_ITEMS = 6; // top 5 + "Other"
const MAX_SERIES_POINTS = 31;
const MAX_COUNT = 1_000_000_000;

const clampCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(Math.min(value, MAX_COUNT)) : 0;

const sanitizeList = (value: unknown, labelOk: (label: string) => boolean): StatsDatum[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is StatsDatum => {
      const label = (item as StatsDatum | null)?.label;
      return typeof label === 'string' && (label === 'Other' || labelOk(label));
    })
    .slice(0, MAX_LIST_ITEMS)
    .map(({label, value: count}) => ({label, value: clampCount(count)}));
};

const sanitizeSeries = (value: unknown): StatsDailyPoint[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((point): point is StatsDailyPoint => typeof (point as StatsDailyPoint | null)?.date === 'string')
    .filter(({date}) => DATE_RE.test(date))
    .slice(0, MAX_SERIES_POINTS)
    .map(({date, views}) => ({date, views: clampCount(views)}));
};

const sanitizePayload = (raw: unknown): StatsPayload | null => {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const lastUpdated = candidate.lastUpdated;
  const since = candidate.since;
  if (typeof lastUpdated !== 'string' || !DATE_RE.test(lastUpdated)) {
    return null;
  }
  if (typeof since !== 'string' || !DATE_RE.test(since)) {
    return null;
  }
  return {
    countries: sanitizeList(candidate.countries, label => ISO_COUNTRY_RE.test(label)),
    dailySeries: sanitizeSeries(candidate.dailySeries),
    lastUpdated,
    since,
    topPages: sanitizeList(candidate.topPages, label => PAGE_RE.test(label)),
    topReferrers: sanitizeList(candidate.topReferrers, label => DOMAIN_RE.test(label) && !IPV4_RE.test(label)),
    totalViews: clampCount(candidate.totalViews),
    uniqueVisitors: clampCount(candidate.uniqueVisitors),
  };
};

const useStats = (): StatsState => {
  const [state, setState] = useState<StatsState>({status: 'loading'});

  useEffect(() => {
    let cancelled = false;
    // Same-origin fetch of the static file the aggregator publishes — no API,
    // no CORS, no credentials involved.
    fetch('/stats.json', {headers: {Accept: 'application/json'}})
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((raw: unknown) => {
        if (cancelled) {
          return;
        }
        const data = sanitizePayload(raw);
        if (data === null) {
          setState({status: 'error'});
        } else if (data.totalViews === 0) {
          setState({status: 'empty'});
        } else {
          setState({data, status: 'success'});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({status: 'error'});
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};

export default useStats;
