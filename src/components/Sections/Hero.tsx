import {ChevronDownIcon} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import Image from 'next/image';
import {FC, memo} from 'react';

import {heroData, SectionId} from '../../data/data';
import Section from '../Layout/Section';
import ParticleField from '../ParticleField';
import Socials from '../Socials';

const Hero: FC = memo(() => {
  const {imageSrc, name, description, actions} = heroData;

  return (
    <Section noPadding sectionId={SectionId.Hero}>
      <div className="relative flex min-h-[100svh] w-full items-center justify-center">
        <Image alt="" className="absolute z-0 h-full w-full object-cover" placeholder="blur" priority src={imageSrc} />
        {/* Scrim: harmonizes the photo with the dark base and dissolves the bottom edge into the page background */}
        <div
          aria-hidden="true"
          className="absolute z-0 h-full w-full bg-gradient-to-b from-neutral-950/70 via-neutral-950/40 to-[#0a0a0a]"
        />
        <ParticleField className="absolute z-0 h-full w-full" />
        <div className="z-10 max-w-screen-lg px-4 lg:px-0">
          <div className="flex flex-col items-center gap-y-6 rounded-2xl border border-neutral-700/40 bg-neutral-950/50 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-md">
            <span className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-400">
              Lead AI/ML Engineer
            </span>
            <h1 className="bg-gradient-to-br from-white via-white to-orange-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-7xl">
              {name}
            </h1>
            {description}
            <div className="flex gap-x-4 text-neutral-100">
              <Socials />
            </div>
            <div className="flex w-full justify-center gap-x-4">
              {actions.map(({href, text, primary, download, Icon}) => (
                <a
                  className={classNames(
                    'flex gap-x-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950 sm:text-base',
                    primary
                      ? 'bg-orange-500 text-neutral-950 ring-orange-400 hover:bg-orange-400 hover:shadow-[0_0_28px_rgba(251,146,60,0.45)]'
                      : 'border border-neutral-500 text-white ring-white hover:border-white hover:bg-white/10',
                  )}
                  download={download ? 'Andrew-Malvani-Resume.pdf' : undefined}
                  href={href}
                  key={text}>
                  {text}
                  {Icon && <Icon className="h-5 w-5 sm:h-6 sm:w-6" />}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <a
            aria-label="Scroll to About section"
            className="rounded-full border border-neutral-700/60 bg-neutral-950/50 p-1 text-orange-400 ring-orange-400 backdrop-blur-sm transition-colors hover:border-orange-400/60 focus:outline-none focus:ring-2 motion-safe:animate-bounce sm:p-2"
            href={`/#${SectionId.About}`}>
            <ChevronDownIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </a>
        </div>
      </div>
    </Section>
  );
});

Hero.displayName = 'Hero';
export default Hero;
