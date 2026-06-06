import {FC, memo} from 'react';

/**
 * Standardized section heading: a small orange uppercase eyebrow above a
 * large tracking-tight title, matching the /stats page hierarchy.
 */
const SectionHeading: FC<{eyebrow: string; title: string}> = memo(({eyebrow, title}) => (
  <div className="flex flex-col gap-y-2">
    <span className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">{eyebrow}</span>
    <h2 className="text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">{title}</h2>
  </div>
));

SectionHeading.displayName = 'SectionHeading';
export default SectionHeading;
