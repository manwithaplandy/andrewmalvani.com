import classNames from 'classnames';
import {FC, memo} from 'react';

import {TimelineItem} from '../../../data/dataDef';

const TimelineItem: FC<{item: TimelineItem}> = memo(({item}) => {
  const {title, date, location, content} = item;
  // Education entries pass an empty paragraph for content; rendering it leaves a
  // blank gap. Any element other than a childless <p> counts as real content.
  const hasContent = content.type !== 'p' || Boolean((content.props as {children?: unknown}).children);
  return (
    <div className="flex flex-col pb-10 text-center last:pb-0 md:text-left">
      <div className={classNames('flex flex-col', {'pb-3': hasContent})}>
        <h3 className="text-xl font-bold tracking-tight text-neutral-50">{title}</h3>
        <div className="flex items-center justify-center gap-x-2 text-neutral-400 md:justify-start">
          <span className="flex-1 text-sm font-medium italic sm:flex-none">{location}</span>
          <span aria-hidden="true">•</span>
          <span className="flex-1 text-sm sm:flex-none">{date}</span>
        </div>
      </div>
      {hasContent && <div className="leading-relaxed text-neutral-300">{content}</div>}
    </div>
  );
});

TimelineItem.displayName = 'TimelineItem';
export default TimelineItem;
