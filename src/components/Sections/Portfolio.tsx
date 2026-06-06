import {ArrowTopRightOnSquareIcon} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import {FC, memo} from 'react';

import {portfolioItems, SectionId} from '../../data/data';
import Section from '../Layout/Section';
import Reveal from '../Reveal';
import SectionHeading from '../SectionHeading';
import SpotlightCard from '../SpotlightCard';

const Portfolio: FC = memo(() => {
  return (
    <Section sectionId={SectionId.Portfolio}>
      <div className="flex flex-col gap-y-10">
        <Reveal className="self-center text-center">
          <SectionHeading eyebrow="Portfolio" title="Check out some of my work" />
        </Reveal>
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {portfolioItems.map((item, index) => {
            const {title, description, url, image} = item;
            return (
              <Reveal delayMs={index * 120} key={`${title}-${index}`}>
                <SpotlightCard className="h-full">
                  <a
                    className="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    href={url}
                    rel="noopener noreferrer"
                    target="_blank">
                    <div className="relative aspect-video w-full overflow-hidden border-b border-neutral-800">
                      <Image
                        alt={`${title} preview`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                        placeholder="blur"
                        src={image}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-y-2 p-5">
                      <div className="flex items-center justify-between gap-x-2">
                        <h3 className="font-bold text-neutral-50">{title}</h3>
                        <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0 text-neutral-500 transition-colors group-hover:text-orange-400" />
                      </div>
                      <p className="text-sm leading-relaxed text-neutral-400">{description}</p>
                    </div>
                  </a>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
        <Link className="self-center text-sm text-neutral-400 transition-colors hover:text-orange-400" href="/stats">
          Curious how many people visit this page? I built the analytics pipeline myself →
        </Link>
      </div>
    </Section>
  );
});

Portfolio.displayName = 'Portfolio';
export default Portfolio;
