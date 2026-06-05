import {FC, memo, useMemo} from 'react';

import {StatsDailyPoint} from '../../../data/dataDef';

const WIDTH = 300;
const HEIGHT = 60;
const PAD = 3;

const Sparkline: FC<{points: StatsDailyPoint[]}> = memo(({points}) => {
  const {path, summary} = useMemo(() => {
    const max = Math.max(1, ...points.map(point => point.views));
    const stepX = points.length > 1 ? (WIDTH - PAD * 2) / (points.length - 1) : 0;
    const segments = points.map(({views}, index) => {
      const x = PAD + index * stepX;
      const y = HEIGHT - PAD - (views / max) * (HEIGHT - PAD * 2);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const total = points.reduce((sum, point) => sum + point.views, 0);
    return {
      path: segments.join(' '),
      summary: `${total.toLocaleString('en-US')} page views over the last ${points.length} days`,
    };
  }, [points]);

  return (
    <figure className="w-full">
      <svg
        aria-label={summary}
        className="h-16 w-full text-orange-400"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <path d={path} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      </svg>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
});

Sparkline.displayName = 'Sparkline';
export default Sparkline;
