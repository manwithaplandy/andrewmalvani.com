import {FC, memo, useMemo} from 'react';

import {Stat} from '../../../data/dataDef';

const StatCard: FC<{caption?: string; stat: Stat}> = memo(({caption, stat}) => {
  const {title, value, Icon} = stat;
  const formattedValue = useMemo(() => value.toLocaleString('en-US'), [value]);

  return (
    <div className="flex flex-col items-center gap-y-2 rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
      {Icon && <Icon className="h-6 w-6 text-orange-400" />}
      <span className="text-4xl font-bold text-orange-400 sm:text-5xl">{formattedValue}</span>
      <span className="text-sm font-medium uppercase tracking-wide text-neutral-300">{title}</span>
      {caption && <span className="text-xs text-neutral-400">{caption}</span>}
    </div>
  );
});

StatCard.displayName = 'StatCard';
export default StatCard;
