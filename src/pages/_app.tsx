import 'tailwindcss/tailwind.css';
import '../globalStyles.scss';

import type {AppProps} from 'next/app';
import {Inter} from 'next/font/google';
import {memo} from 'react';

const inter = Inter({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-sans',
});

const MyApp = memo(({Component, pageProps}: AppProps): JSX.Element => {
  return (
    <div className={`${inter.variable} font-sans`}>
      <Component {...pageProps} />
    </div>
  );
});

export default MyApp;
