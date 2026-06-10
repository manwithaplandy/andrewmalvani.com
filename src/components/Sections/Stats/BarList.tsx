import {FC, memo, useMemo} from 'react';

import {StatsDatum} from '../../../data/dataDef';

const BarList: FC<{items: StatsDatum[]; title: string}> = memo(({items, title}) => {
  const max = useMemo(() => Math.max(1, ...items.map(item => item.value)), [items]);

  return (
    <div className="flex flex-col gap-y-2">
      <span className="text-lg font-bold text-white">{title}</span>
      {items.length === 0 && <span className="ml-2 text-sm text-neutral-400">Not enough data yet.</span>}
      {items.map(({label, value}) => (
        <BarListRow key={label} label={label} max={max} value={value} />
      ))}
    </div>
  );
});

BarList.displayName = 'BarList';
export default BarList;

const BarListRow: FC<{label: string; max: number; value: number}> = memo(({label, max, value}) => {
  const percentage = useMemo(() => Math.round((value / max) * 100), [max, value]);
  const formattedValue = useMemo(() => value.toLocaleString('en-US'), [value]);

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between gap-x-4">
        <span className="ml-2 truncate text-sm font-medium text-neutral-300">{label}</span>
        {/* Numeric label alongside the bar — quantity is never conveyed by color alone. */}
        <span className="text-sm tabular-nums text-neutral-400">{formattedValue}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-700">
        <div className="h-full rounded-full bg-orange-400" style={{width: `${percentage}%`}} />
      </div>
    </div>
  );
});

BarListRow.displayName = 'BarListRow';
