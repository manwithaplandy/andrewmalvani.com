import Link from 'next/link';
import {FC, memo} from 'react';

import {portfolioItems, SectionId} from '../../data/data';
import Section from '../Layout/Section';
import Reveal from '../Reveal';
import SectionHeading from '../SectionHeading';
import {PortfolioCard} from './PortfolioCard';

const Portfolio: FC = memo(() => {
  return (
    <Section sectionId={SectionId.Portfolio}>
      <div className="flex flex-col gap-y-10">
        <Reveal className="self-center text-center">
          <SectionHeading eyebrow="Portfolio" title="Check out some of my work" />
        </Reveal>
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {portfolioItems.map((item, index) => {
            return (
              <Reveal delayMs={index * 120} key={`${item.title}-${index}`}>
                <PortfolioCard item={item} />
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
