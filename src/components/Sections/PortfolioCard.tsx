import {ArrowTopRightOnSquareIcon, ChevronDownIcon} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import Image from 'next/image';
import {FC, memo} from 'react';

import {PortfolioCaseStudy, PortfolioItem} from '../../data/dataDef';
import SpotlightCard from '../SpotlightCard';

const caseStudyFields: {key: keyof PortfolioCaseStudy; label: string}[] = [
  {key: 'problem', label: 'Problem'},
  {key: 'contribution', label: 'Contribution'},
  {key: 'decision', label: 'Decision'},
  {key: 'outcome', label: 'Outcome'},
];

export const PortfolioCard: FC<{item: PortfolioItem}> = memo(({item}) => {
  const {title, description, url, image, imageAlt, imageFit = 'cover', caseStudy} = item;

  return (
    <SpotlightCard className="h-full">
      <article className="relative z-20 flex h-full flex-col">
        <a
          className={classNames(
            'group/project flex flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400',
            caseStudy ? 'rounded-t-xl' : 'rounded-xl',
          )}
          href={url}
          rel="noopener noreferrer"
          target="_blank">
          <div
            className={classNames(
              'relative aspect-video w-full overflow-hidden border-b border-neutral-800',
              imageFit === 'contain' && 'bg-neutral-950 p-2',
            )}>
            <Image
              alt={imageAlt}
              className={classNames(
                'h-full w-full transition-transform duration-500 group-hover/project:scale-[1.02] motion-reduce:group-hover/project:scale-100',
                imageFit === 'contain' ? 'object-contain' : 'object-cover object-center',
              )}
              placeholder="blur"
              src={image}
            />
          </div>
          <div className="flex flex-1 flex-col gap-y-2 p-5">
            <div className="flex items-center justify-between gap-x-2">
              <h3 className="font-bold text-neutral-50">{title}</h3>
              <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 text-neutral-500 transition-colors group-hover/project:text-orange-400" />
            </div>
            <p className="text-sm leading-relaxed text-neutral-400">{description}</p>
          </div>
        </a>
        {caseStudy && (
          <details className="group/details border-t border-neutral-800">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-x-3 rounded-b-xl px-5 py-3 text-sm font-semibold text-neutral-200 transition-colors hover:text-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 [&::-webkit-details-marker]:hidden">
              Project details
              <ChevronDownIcon className="h-4 w-4 shrink-0 text-neutral-500 transition-transform group-open/details:rotate-180" />
            </summary>
            <dl className="space-y-4 border-t border-neutral-800 px-5 py-4">
              {caseStudyFields.map(({key, label}) => (
                <div key={key}>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-orange-400">{label}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-neutral-300">{caseStudy[key]}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </article>
    </SpotlightCard>
  );
});

PortfolioCard.displayName = 'PortfolioCard';
