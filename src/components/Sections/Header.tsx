import {Dialog, Transition} from '@headlessui/react';
import {Bars3BottomRightIcon, ChartBarIcon, CubeTransparentIcon, XMarkIcon} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {FC, Fragment, memo, useCallback, useMemo, useState} from 'react';

import {SectionId} from '../../data/data';
import {useNavObserver} from '../../hooks/useNavObserver';

export const headerID = 'headerNav';
const mobileMenuID = 'mobileMenu';

/**
 * One nav model for both navs: section entries get scroll-spy active state,
 * route entries match on the current pathname. Route entries carry an `Icon`
 * so they read distinctly from in-page scroll anchors.
 */
interface NavEntry {
  label: string;
  href: string;
  current: boolean;
  Icon?: FC<{className?: string}>;
}

const Header: FC = memo(() => {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState<SectionId | null>(null);
  const navSections = useMemo(() => [SectionId.About, SectionId.Resume, SectionId.Portfolio, SectionId.Contact], []);

  const intersectionHandler = useCallback((section: SectionId | null) => {
    section && setCurrentSection(section);
  }, []);

  useNavObserver(navSections.map(section => `#${section}`).join(','), intersectionHandler);

  const navEntries: NavEntry[] = useMemo(
    () => [
      ...navSections.map(section => ({
        current: section === currentSection,
        href: `/#${section}`,
        label: section,
      })),
      {current: router.pathname === '/graph', href: '/graph', label: 'Career Graph', Icon: CubeTransparentIcon},
      {current: router.pathname === '/stats', href: '/stats', label: 'Analytics', Icon: ChartBarIcon},
    ],
    [navSections, currentSection, router.pathname],
  );

  return (
    <>
      <MobileNav navEntries={navEntries} />
      <DesktopNav navEntries={navEntries} />
    </>
  );
});

const DesktopNav: FC<{navEntries: NavEntry[]}> = memo(({navEntries}) => {
  const baseClass =
    '-m-1.5 flex items-center gap-x-1.5 rounded-md p-1.5 font-bold first-letter:uppercase transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:hover:text-orange-400';
  const activeClass = classNames(baseClass, 'text-orange-400');
  const inactiveClass = classNames(baseClass, 'text-neutral-100');
  return (
    <header
      className="fixed top-0 z-50 hidden w-full border-b border-neutral-800/60 bg-neutral-950/70 p-4 backdrop-blur-md sm:block"
      id={headerID}>
      <nav className="flex justify-center gap-x-8">
        {navEntries.map(entry => (
          <NavItem activeClass={activeClass} entry={entry} inactiveClass={inactiveClass} key={entry.href} />
        ))}
      </nav>
    </header>
  );
});

const MobileNav: FC<{navEntries: NavEntry[]}> = memo(({navEntries}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleOpen = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const baseClass =
    'flex items-center gap-x-2 rounded-md p-2 first-letter:uppercase transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400';
  const activeClass = classNames(baseClass, 'bg-neutral-900 text-white font-bold');
  const inactiveClass = classNames(baseClass, 'text-neutral-200 font-medium');
  return (
    <>
      <button
        aria-controls={mobileMenuID}
        aria-expanded={isOpen}
        aria-label="Open menu"
        className="fixed right-2 top-2 z-40 rounded-md bg-orange-500 p-2 ring-offset-gray-800/60 hover:bg-orange-400 focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 sm:hidden"
        onClick={toggleOpen}>
        <Bars3BottomRightIcon aria-hidden className="h-8 w-8 text-white" />
      </button>
      <Transition.Root as={Fragment} show={isOpen}>
        <Dialog as="div" className="fixed inset-0 z-40 flex sm:hidden" onClose={toggleOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0">
            <Dialog.Overlay className="fixed inset-0 bg-neutral-950 bg-opacity-75" />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full">
            <div className="relative w-4/5 border-r border-neutral-800 bg-neutral-900" id={mobileMenuID}>
              <button
                aria-label="Close menu"
                className="absolute right-2 top-2 rounded-md p-2 text-neutral-300 transition-colors duration-300 hover:text-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                onClick={toggleOpen}>
                <XMarkIcon aria-hidden className="h-7 w-7" />
              </button>
              <nav className="mt-14 flex flex-col gap-y-2 px-2">
                {navEntries.map(entry => (
                  <NavItem
                    activeClass={activeClass}
                    entry={entry}
                    inactiveClass={inactiveClass}
                    key={entry.href}
                    onClick={toggleOpen}
                  />
                ))}
              </nav>
            </div>
          </Transition.Child>
        </Dialog>
      </Transition.Root>
    </>
  );
});

const NavItem: FC<{
  entry: NavEntry;
  activeClass: string;
  inactiveClass: string;
  onClick?: () => void;
}> = memo(({entry, inactiveClass, activeClass, onClick}) => {
  const {Icon} = entry;
  return (
    <Link
      aria-current={entry.current ? 'page' : undefined}
      className={classNames(entry.current ? activeClass : inactiveClass)}
      href={entry.href}
      onClick={onClick}>
      {Icon && <Icon className="h-4 w-4" />}
      {entry.label}
    </Link>
  );
});

Header.displayName = 'Header';
export default Header;
