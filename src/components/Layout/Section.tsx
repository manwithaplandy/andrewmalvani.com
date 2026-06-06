import classNames from 'classnames';
import {FC, memo, PropsWithChildren} from 'react';

import {SectionId} from '../../data/data';

const Section: FC<
  PropsWithChildren<{sectionId: SectionId; sectionTitle?: string; noPadding?: boolean; className?: string}>
> = memo(({children, sectionId, noPadding = false, className}) => {
  return (
    <section
      className={classNames(className, 'relative', {'px-4 py-16 md:py-24 lg:px-8': !noPadding})}
      id={sectionId}>
      {/* Soft accent glow: depth on the unified dark base instead of background color flips */}
      {!noPadding && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(251,146,60,0.05),transparent)]"
        />
      )}
      <div className={classNames('relative', {'mx-auto max-w-screen-lg': !noPadding})}>{children}</div>
    </section>
  );
});

Section.displayName = 'Section';
export default Section;
