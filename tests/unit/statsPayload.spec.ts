import {expect, test} from '@playwright/test';

import {normalizeStatsPayload} from '../../src/utils/statsPayload';
import legacy from '../fixtures/stats-v1.json';
import current from '../fixtures/stats-v2-current.json';

test('legacy uniques are relabeled without inventing coverage', () => {
  const model = normalizeStatsPayload(legacy, '2026-09-08');
  expect(model?.dailyUniqueVisits).toBe(2);
  expect(model?.edgeSource.since).toBeNull();
  expect(model?.observations.some(point => point.date === '2026-09-08')).toBe(false);
});

test('legacy zeros remain distinct from measured v2 zeros', () => {
  const legacyModel = normalizeStatsPayload({...legacy, totalViews: 0, uniqueVisitors: 0}, '2026-09-08');
  expect(legacyModel?.documentRequests).toBe(0);
  expect(legacyModel?.dailyUniqueVisits).toBeNull();
  expect(legacyModel?.observations).toEqual([
    {date: '2026-09-06', status: 'observed', views: 10},
    {date: '2026-09-07', status: 'missing', views: null},
  ]);

  const currentModel = normalizeStatsPayload({...current, uniqueVisitors: 0}, '2026-09-08');
  expect(currentModel?.dailyUniqueVisits).toBe(0);
  expect(currentModel?.observations.at(-1)).toEqual({date: '2026-09-07', status: 'provisional', views: 0});
});

test('invalid required and optional dates fail at their documented boundaries', () => {
  expect(normalizeStatsPayload({...legacy, lastUpdated: '2026-02-30'}, '2026-09-08')).toBeNull();
  expect(normalizeStatsPayload(current, 'not-a-date')).toBeNull();

  const malformedSource = structuredClone(current);
  malformedSource.sources.cloudfront.through = '2026-02-30';
  const model = normalizeStatsPayload(malformedSource, '2026-09-08');
  expect(model?.documentRequests).toBeNull();
  expect(model?.documentSource).toEqual({
    lastSuccessfulUpdate: null,
    scope: 'site-document-requests',
    since: null,
    status: 'unavailable',
    through: null,
  });
});

test('duplicate or unsorted v2 observations reject the payload', () => {
  const duplicate = structuredClone(current);
  duplicate.dailyObservations[1].date = duplicate.dailyObservations[0].date;
  expect(normalizeStatsPayload(duplicate, '2026-09-08')).toBeNull();

  const unsorted = structuredClone(current);
  [unsorted.dailyObservations[0], unsorted.dailyObservations[1]] = [
    unsorted.dailyObservations[1],
    unsorted.dailyObservations[0],
  ];
  expect(normalizeStatsPayload(unsorted, '2026-09-08')).toBeNull();
});

test('unknown payload versions are not guessed as version 2', () => {
  expect(normalizeStatsPayload({...current, schemaVersion: 3}, '2026-09-08')).toBeNull();
});

test('invalid labels and counts cannot reach normalized public lists', () => {
  const unsafe = {
    ...legacy,
    countries: [
      {label: 'us', value: 9},
      {label: 'US', value: -1},
      {label: 'CA', value: 5},
    ],
    topPages: [
      {label: 'javascript:alert(1)', value: 8},
      {label: '/safe', value: 5},
    ],
    topReferrers: [
      {label: '192.0.2.1', value: 8},
      {label: 'bad label', value: 7},
      {label: 'example.com', value: Number.POSITIVE_INFINITY},
      {label: 'valid.example', value: 6},
    ],
  };
  const model = normalizeStatsPayload(unsafe, '2026-09-08');
  expect(model?.countries).toEqual([{label: 'CA', value: 5}]);
  expect(model?.topPages).toEqual([{label: '/safe', value: 5}]);
  expect(model?.topReferrers).toEqual([{label: 'valid.example', value: 6}]);
});

test('named buckets below five join a bounded preexisting Other bucket', () => {
  const model = normalizeStatsPayload(
    {
      ...legacy,
      countries: [
        {label: 'US', value: 4},
        {label: 'CA', value: 5},
        {label: 'Other', value: 1},
      ],
      topPages: [
        {label: '/private', value: 4},
        {label: '/public', value: 5},
        {label: 'Other', value: 3},
        {label: '/another-private', value: 2},
      ],
      topReferrers: [
        {label: 'private.example', value: 4},
        {label: 'public.example', value: 5},
        {label: 'Other', value: 1_000_000_000},
      ],
    },
    '2026-09-08',
  );

  expect(model?.countries).toEqual([
    {label: 'CA', value: 5},
    {label: 'Other', value: 5},
  ]);
  expect(model?.topPages).toEqual([
    {label: '/public', value: 5},
    {label: 'Other', value: 9},
  ]);
  expect(model?.topReferrers).toEqual([
    {label: 'public.example', value: 5},
    {label: 'Other', value: 1_000_000_000},
  ]);
});

test('public lists and observations remain bounded', () => {
  const tooManyItems = Array.from({length: 8}, (_, index) => ({label: `/page-${index}`, value: index + 5}));
  const model = normalizeStatsPayload({...legacy, topPages: tooManyItems}, '2026-09-08');
  expect(model?.topPages).toHaveLength(6);

  const tooManyObservations = structuredClone(current);
  tooManyObservations.dailyObservations.push({date: '2026-09-08', status: 'missing', views: null});
  expect(normalizeStatsPayload(tooManyObservations, '2026-09-09')).toBeNull();
});

test('a frozen payload eventually looks stale', () => {
  const model = normalizeStatsPayload(current, '2026-09-12');
  expect(model?.edgeSource.status).toBe('stale');
  expect(model?.documentSource.status).toBe('stale');
});

test('stale migrated measurements may have unknown success timing while current requires a success date', () => {
  const migrated = {
    ...current,
    sources: {
      ...current.sources,
      cloudflare: {...current.sources.cloudflare, status: 'stale', lastSuccessfulUpdate: null},
    },
  };
  const stale = normalizeStatsPayload(migrated, '2026-09-08');
  expect(stale?.dailyUniqueVisits).toBe(2);
  expect(stale?.edgeSource.status).toBe('stale');
  expect(stale?.edgeSource.lastSuccessfulUpdate).toBeNull();
  expect(stale?.edgeSource.since).toBe('2026-09-02');
  migrated.sources.cloudflare.status = 'current';
  expect(normalizeStatsPayload(migrated, '2026-09-08')?.edgeSource.status).toBe('unavailable');
});
