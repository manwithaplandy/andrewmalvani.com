import {NextPage} from 'next';
import Head from 'next/head';
import {useRouter} from 'next/router';
import {memo, PropsWithChildren} from 'react';

import {HomepageMeta} from '../../data/dataDef';
import {siteConfig} from '../../data/siteConfig';

const Page: NextPage<PropsWithChildren<HomepageMeta>> = memo(({children, title, description}) => {
  const {asPath: pathname} = useRouter();
  const {siteUrl, siteName, ogImagePath, person} = siteConfig;
  const canonical = `${siteUrl}${pathname}`;
  const ogImageUrl = `${siteUrl}${ogImagePath}`;

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    url: siteUrl,
    image: ogImageUrl,
    jobTitle: person.jobTitle,
    email: `mailto:${person.email}`,
    worksFor: {'@type': 'Organization', name: person.worksFor},
    alumniOf: {'@type': 'CollegeOrUniversity', name: person.alumniOf},
    address: {'@type': 'PostalAddress', addressLocality: person.location},
    knowsAbout: person.knowsAbout,
    sameAs: person.sameAs,
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    author: {'@type': 'Person', name: person.name},
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta content={description} name="description" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta content="#171717" name="theme-color" />

        {/* several domains list the same content, make sure google knows we mean this one. */}
        <link href={canonical} key="canonical" rel="canonical" />

        <link href="/favicon.ico" rel="icon" sizes="any" />
        <link href="/icon.svg" rel="icon" type="image/svg+xml" />
        <link href="/apple-touch-icon.png" rel="apple-touch-icon" />
        <link href="/site.webmanifest" rel="manifest" />

        {/* Open Graph : https://ogp.me/ */}
        <meta content="website" property="og:type" />
        <meta content={siteName} property="og:site_name" />
        <meta content={title} property="og:title" />
        <meta content={description} property="og:description" />
        <meta content={canonical} property="og:url" />
        <meta content={ogImageUrl} property="og:image" />
        <meta content="1200" property="og:image:width" />
        <meta content="630" property="og:image:height" />
        <meta content={`${person.name} — ${person.jobTitle}`} property="og:image:alt" />

        {/* Twitter: https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup */}
        <meta content="summary_large_image" name="twitter:card" />
        <meta content={title} name="twitter:title" />
        <meta content={description} name="twitter:description" />
        <meta content={ogImageUrl} name="twitter:image" />
        <meta content={`${person.name} — ${person.jobTitle}`} name="twitter:image:alt" />

        {/* Structured data */}
        <script
          dangerouslySetInnerHTML={{__html: JSON.stringify(personSchema)}}
          key="ld-person"
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{__html: JSON.stringify(websiteSchema)}}
          key="ld-website"
          type="application/ld+json"
        />
      </Head>
      {children}
    </>
  );
});

Page.displayName = 'Page';
export default Page;
