import {FC, memo, useMemo} from 'react';

import {StatsObservation} from '../../../data/dataDef';

const WIDTH = 300;
const HEIGHT = 72;
const PAD = 4;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

const dateToDay = (date: string): number => Date.parse(`${date}T00:00:00.000Z`) / MILLIS_PER_DAY;

const formatDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  });
};

const formatStatus = (status: StatsObservation['status']): string =>
  `${status.charAt(0).toUpperCase()}${status.slice(1)}`;

const formatTableDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  });
};

interface ChartSegment {
  path: string;
  status: 'observed' | 'provisional';
}

const Sparkline: FC<{observations: StatsObservation[]}> = memo(({observations}) => {
  const {available, coordinates, range, segments, summary} = useMemo(() => {
    const measured = observations.filter(
      (point): point is StatsObservation & {views: number} => point.views !== null,
    );
    const max = Math.max(1, ...measured.map(point => point.views));
    const firstDay = observations[0] ? dateToDay(observations[0].date) : 0;
    const lastObservation = observations.at(-1);
    const lastDay = lastObservation ? dateToDay(lastObservation.date) : firstDay;
    const daySpan = Math.max(1, lastDay - firstDay);
    const pointCoordinates = observations.map(point => ({
      ...point,
      day: dateToDay(point.date),
      x: PAD + ((dateToDay(point.date) - firstDay) / daySpan) * (WIDTH - PAD * 2),
      y: point.views === null ? null : HEIGHT - PAD - (point.views / max) * (HEIGHT - PAD * 2),
    }));

    const chartSegments: ChartSegment[] = [];
    let activeObserved: string[] | null = null;
    let previousMeasured: (typeof pointCoordinates)[number] | null = null;
    pointCoordinates.forEach(point => {
      if (point.y === null) {
        activeObserved = null;
        previousMeasured = null;
        return;
      }
      if (previousMeasured !== null && point.day - previousMeasured.day !== 1) {
        activeObserved = null;
        previousMeasured = null;
      }
      const coordinate = `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
      if (point.status === 'observed') {
        if (activeObserved === null) {
          activeObserved = [coordinate];
          chartSegments.push({path: '', status: 'observed'});
        } else {
          activeObserved.push(coordinate);
        }
        chartSegments[chartSegments.length - 1].path = activeObserved
          .map((value, index) => `${index === 0 ? 'M' : 'L'}${value}`)
          .join(' ');
      } else {
        const points =
          previousMeasured?.y === null || previousMeasured === null
            ? [coordinate]
            : [`${previousMeasured.x.toFixed(1)},${previousMeasured.y.toFixed(1)}`, coordinate];
        chartSegments.push({
          path: points.map((value, index) => `${index === 0 ? 'M' : 'L'}${value}`).join(' '),
          status: 'provisional',
        });
        activeObserved = null;
      }
      previousMeasured = point;
    });

    const firstDate = observations.at(0)?.date;
    const lastDate = observations.at(-1)?.date;
    const visibleRange = firstDate && lastDate ? `${formatDate(firstDate)} – ${formatDate(lastDate)}` : null;
    const missingCount = observations.length === 0 ? 0 : lastDay - firstDay + 1 - measured.length;
    const provisionalCount = observations.filter(point => point.status === 'provisional').length;

    return {
      available: measured.length > 0,
      coordinates: pointCoordinates,
      range: visibleRange,
      segments: chartSegments,
      summary: `${measured.reduce((sum, point) => sum + point.views, 0).toLocaleString('en-US')} requests across ${
        measured.length
      } measured days; ${missingCount} missing and ${provisionalCount} provisional`,
    };
  }, [observations]);

  if (!available) {
    return <p className="py-6 text-sm text-neutral-400">No observations available for this period</p>;
  }

  const provisional = observations.filter(
    (point): point is StatsObservation & {views: number} => point.status === 'provisional' && point.views !== null,
  );

  return (
    <figure className="w-full">
      <svg
        aria-label={summary}
        className="h-20 w-full text-orange-400"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {segments.map((segment, index) => (
          <path
            d={segment.path}
            data-chart-segment={segment.status}
            fill="none"
            key={`${segment.status}-${index}`}
            opacity={segment.status === 'provisional' ? 0.85 : 1}
            stroke="currentColor"
            strokeDasharray={segment.status === 'provisional' ? '5 4' : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        ))}
        {coordinates
          .filter(point => point.y !== null)
          .map(point => (
            <circle
              cx={point.x}
              cy={point.y ?? 0}
              data-status={point.status}
              fill={point.status === 'provisional' ? '#171717' : 'currentColor'}
              key={point.date}
              r={point.status === 'provisional' ? 3 : 2}
              stroke="currentColor"
              strokeWidth={1.5}
            />
          ))}
      </svg>
      {range && <figcaption className="text-xs text-neutral-400">Observation dates: {range}</figcaption>}
      {provisional.map(point => (
        <p className="mt-1 text-xs text-neutral-400" key={point.date}>
          {formatDate(point.date)}: {point.views.toLocaleString('en-US')} requests, provisional
        </p>
      ))}
      <details className="mt-4 text-sm text-neutral-300">
        <summary className="cursor-pointer text-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
          Daily values and status
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-700 text-neutral-300">
                <th className="w-[46%] py-2 pr-1 font-medium" scope="col">
                  Date
                </th>
                <th className="w-[24%] px-1 py-2 text-right font-medium" scope="col">
                  Requests
                </th>
                <th className="w-[30%] py-2 pl-1 font-medium" scope="col">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {observations.map(point => (
                <tr className="border-b border-neutral-800" key={point.date}>
                  <td aria-label={formatDate(point.date)} className="whitespace-nowrap py-2 pr-1">
                    {formatTableDate(point.date)}
                  </td>
                  <td className="px-1 py-2 text-right tabular-nums">{point.views?.toLocaleString('en-US') ?? '—'}</td>
                  <td className="whitespace-nowrap py-2 pl-1">{formatStatus(point.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
});

Sparkline.displayName = 'Sparkline';
export default Sparkline;
