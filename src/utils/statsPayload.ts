import {StatsDatum, StatsObservation, StatsSource, StatsViewModel} from '../data/dataDef';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$/;
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const ISO_COUNTRY_RE = /^[A-Z]{2}$/;
const PAGE_RE = /^\/[A-Za-z0-9/_.-]{0,99}$/;

const MAX_LIST_ITEMS = 6;
const MAX_OBSERVATIONS = 30;
const MAX_LEGACY_POINTS = 31;
const MAX_COUNT = 1_000_000_000;
const MIN_PUBLIC_BUCKET = 5;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

type UnknownRecord = Record<string, unknown>;
type SourceScope = StatsSource['scope'];

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;

const isRealDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
  );
};

const parseCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(Math.min(value, MAX_COUNT))
    : null;

const sanitizeList = (value: unknown, labelOk: (label: string) => boolean): StatsDatum[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const named: StatsDatum[] = [];
  let other = 0;
  value.forEach(item => {
    if (!isRecord(item) || typeof item.label !== 'string') {
      return;
    }
    const count = parseCount(item.value);
    if (count === null) {
      return;
    }
    if (item.label === 'Other') {
      other = Math.min(MAX_COUNT, other + count);
      return;
    }
    if (!labelOk(item.label)) {
      return;
    }
    if (count < MIN_PUBLIC_BUCKET) {
      other = Math.min(MAX_COUNT, other + count);
      return;
    }
    named.push({label: item.label, value: count});
  });

  const namedLimit = other > 0 ? MAX_LIST_ITEMS - 1 : MAX_LIST_ITEMS;
  return [...named.slice(0, namedLimit), ...(other > 0 ? [{label: 'Other', value: other}] : [])];
};

const unavailableSource = (scope: SourceScope): StatsSource => ({
  lastSuccessfulUpdate: null,
  scope,
  since: null,
  status: 'unavailable',
  through: null,
});

const legacySource = (scope: SourceScope, since: string | null): StatsSource => ({
  lastSuccessfulUpdate: null,
  scope,
  since,
  status: 'unknown',
  through: null,
});

const dateToDay = (date: string): number => Date.parse(`${date}T00:00:00.000Z`) / MILLIS_PER_DAY;

const normalizeSource = (value: unknown, expectedScope: SourceScope, today: string): StatsSource => {
  if (!isRecord(value)) {
    return unavailableSource(expectedScope);
  }

  const {lastSuccessfulUpdate, scope, since, status, through} = value;
  const datesValid = [since, through, lastSuccessfulUpdate].every(date => date === null || isRealDate(date));
  const statusValid = status === 'current' || status === 'stale' || status === 'unavailable';
  if (!datesValid || !statusValid || scope !== expectedScope) {
    return unavailableSource(expectedScope);
  }
  if (status === 'current' && !isRealDate(lastSuccessfulUpdate)) {
    return unavailableSource(expectedScope);
  }

  const agedStatus =
    status === 'current' && dateToDay(today) - dateToDay(lastSuccessfulUpdate as string) > 2 ? 'stale' : status;

  return {
    lastSuccessfulUpdate: lastSuccessfulUpdate as string | null,
    scope: expectedScope,
    since: since as string | null,
    status: agedStatus,
    through: through as string | null,
  };
};

const normalizeLegacyObservations = (value: unknown, today: string): StatsObservation[] | null => {
  if (!Array.isArray(value) || value.length > MAX_LEGACY_POINTS) {
    return null;
  }

  const observations: StatsObservation[] = [];
  let previousDate: string | null = null;
  for (const point of value) {
    if (!isRecord(point) || !isRealDate(point.date) || (previousDate !== null && point.date <= previousDate)) {
      return null;
    }
    previousDate = point.date;
    if (point.date >= today) {
      continue;
    }
    const count = parseCount(point.views);
    observations.push(
      count !== null && count > 0
        ? {date: point.date, status: 'observed', views: count}
        : {date: point.date, status: 'missing', views: null},
    );
  }
  return observations.slice(-MAX_OBSERVATIONS);
};

const normalizeV2Observations = (value: unknown, today: string): StatsObservation[] | null => {
  if (!Array.isArray(value) || value.length > MAX_OBSERVATIONS) {
    return null;
  }

  const observations: StatsObservation[] = [];
  let previousDate: string | null = null;
  for (const point of value) {
    if (!isRecord(point) || !isRealDate(point.date) || (previousDate !== null && point.date <= previousDate)) {
      return null;
    }
    previousDate = point.date;

    const status = point.status;
    const count = parseCount(point.views);
    const validMissing = status === 'missing' && point.views === null;
    const validMeasured = (status === 'observed' || status === 'provisional') && count !== null;
    if (!validMissing && !validMeasured) {
      return null;
    }
    if (point.date < today) {
      observations.push({date: point.date, status: status as StatsObservation['status'], views: validMissing ? null : count});
    }
  }
  return observations;
};

export const normalizeStatsPayload = (raw: unknown, today: string): StatsViewModel | null => {
  if (!isRecord(raw) || !isRealDate(today) || !isRealDate(raw.lastUpdated) || !isRealDate(raw.since)) {
    return null;
  }
  if (raw.schemaVersion !== undefined && raw.schemaVersion !== 2) {
    return null;
  }

  const topPages = sanitizeList(raw.topPages, label => PAGE_RE.test(label));
  const topReferrers = sanitizeList(raw.topReferrers, label => DOMAIN_RE.test(label) && !IPV4_RE.test(label));
  const countries = sanitizeList(raw.countries, label => ISO_COUNTRY_RE.test(label));
  const documentCount = parseCount(raw.totalViews);
  const uniqueCount = parseCount(raw.uniqueVisitors);

  if (raw.schemaVersion === 2) {
    if (!isRecord(raw.sources)) {
      return null;
    }
    const documentSource = normalizeSource(raw.sources.cloudfront, 'site-document-requests', today);
    const edgeSource = normalizeSource(raw.sources.cloudflare, 'zone-requests', today);
    const observations = normalizeV2Observations(raw.dailyObservations, today);
    if (observations === null) {
      return null;
    }
    return {
      countries,
      dailyUniqueVisits: edgeSource.status === 'unavailable' ? null : uniqueCount,
      documentRequests: documentSource.status === 'unavailable' ? null : documentCount,
      documentSource,
      edgeSource,
      generatedOn: raw.lastUpdated,
      observations,
      topPages,
      topReferrers,
    };
  }

  const observations = normalizeLegacyObservations(raw.dailySeries, today);
  if (observations === null) {
    return null;
  }
  return {
    countries,
    dailyUniqueVisits: uniqueCount === 0 ? null : uniqueCount,
    documentRequests: documentCount,
    documentSource: legacySource('site-document-requests', raw.since),
    edgeSource: legacySource('zone-requests', null),
    generatedOn: raw.lastUpdated,
    observations,
    topPages,
    topReferrers,
  };
};
