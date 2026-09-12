import {FC, memo, ReactNode, useMemo} from 'react';

interface StatCardProps {
  caption?: ReactNode;
  testId: string;
  title: string;
  unavailableText: string;
  value: number | null;
}

const StatCard: FC<StatCardProps> = memo(({caption, testId, title, unavailableText, value}) => {
  const formattedValue = useMemo(() => (value === null ? unavailableText : value.toLocaleString('en-US')), [
    unavailableText,
    value,
  ]);

  return (
    <div
      className="flex flex-col items-center gap-y-2 rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center"
      data-testid={testId}>
      <span className={`${value === null ? 'text-2xl' : 'text-4xl sm:text-5xl'} font-bold text-orange-400`}>
        {formattedValue}
      </span>
      <span className="text-sm font-medium uppercase tracking-wide text-neutral-300">{title}</span>
      {caption && <div className="text-xs text-neutral-400">{caption}</div>}
    </div>
  );
});

StatCard.displayName = 'StatCard';
export default StatCard;
