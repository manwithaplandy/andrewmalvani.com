import Link from 'next/link';
import {FC, memo} from 'react';

import Page from '../components/Layout/Page';
import About from '../components/Sections/About';
import Contact from '../components/Sections/Contact';
import Footer from '../components/Sections/Footer';
import Header from '../components/Sections/Header';
import Hero from '../components/Sections/Hero';
import Portfolio from '../components/Sections/Portfolio';
import Resume from '../components/Sections/Resume';
import {homePageMeta} from '../data/data';

const Home: FC = memo(() => {
  const {title, description} = homePageMeta;
  return (
    <Page description={description} title={title}>
      <Link
        className="sr-only z-50 rounded-md bg-neutral-900 px-3 py-2 text-sm text-white ring-orange-500 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:ring-2"
        href="#main">
        Skip to content
      </Link>
      <Header />
      <main id="main">
        <Hero />
        <About />
        <Resume />
        <Portfolio />
        <Contact />
      </main>
      <Footer />
    </Page>
  );
});

export default Home;
