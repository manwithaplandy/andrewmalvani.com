import {FC, memo} from 'react';

// Fixed-height placeholders matching the loaded layout so the data swap
// causes no cumulative layout shift.
const StatsSkeleton: FC = memo(() => (
  <div
    aria-label="Loading site statistics"
    aria-live="polite"
    className="flex animate-pulse flex-col gap-y-8"
    role="status">
    <div className="grid min-h-[10rem] grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-lg bg-neutral-800" />
      <div className="rounded-lg bg-neutral-800" />
    </div>
    <div className="min-h-[6rem] rounded-lg bg-neutral-800" />
    <div className="grid min-h-[14rem] grid-cols-1 gap-8 sm:grid-cols-3">
      <div className="rounded-lg bg-neutral-800" />
      <div className="rounded-lg bg-neutral-800" />
      <div className="rounded-lg bg-neutral-800" />
    </div>
    <span className="sr-only">Loading site statistics…</span>
  </div>
));

StatsSkeleton.displayName = 'StatsSkeleton';
export default StatsSkeleton;
