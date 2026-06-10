import {ChevronUpIcon} from '@heroicons/react/24/solid';
import Link from 'next/link';
import {FC, memo} from 'react';

import {SectionId} from '../../data/data';
import Socials from '../Socials';

const currentYear = new Date().getFullYear();

const Footer: FC = memo(() => (
  <footer className="relative bg-neutral-950 px-4 pb-6 pt-12 sm:px-8 sm:pb-8 sm:pt-14">
    <div className="absolute inset-x-0 -top-4 flex justify-center sm:-top-6">
      <a
        className="rounded-full border border-neutral-700/60 bg-neutral-900 p-1 text-orange-400 ring-orange-400 ring-offset-2 ring-offset-neutral-900 transition-colors duration-300 hover:border-orange-400/60 focus:outline-none focus:ring-2 sm:p-2"
        href={`/#${SectionId.Hero}`}>
        <ChevronUpIcon className="h-6 w-6 bg-transparent sm:h-8 sm:w-8" />
      </a>
    </div>
    <div className="flex flex-col items-center gap-y-6">
      <div className="flex gap-x-4 text-neutral-300">
        <Socials />
      </div>
      <span className="text-sm text-neutral-400">
        Designed &amp; built by <span className="text-neutral-200">Andrew Malvani</span> — Next.js · AWS · Terraform
      </span>
      <Link
        className="text-sm text-neutral-400 underline underline-offset-4 transition-colors duration-300 hover:text-orange-400"
        href="/stats">
        Site analytics
      </Link>
      <span className="text-sm text-neutral-400">© {currentYear} Andrew Malvani</span>
    </div>
  </footer>
));

Footer.displayName = 'Footer';
export default Footer;
