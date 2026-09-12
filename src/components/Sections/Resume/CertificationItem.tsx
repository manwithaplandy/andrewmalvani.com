import classNames from 'classnames';
import Image from 'next/image';
import {FC, memo} from 'react';

import {Certification} from '../../../data/dataDef';
import SpotlightCard from '../../SpotlightCard';

const CertificationItem: FC<{certification: Certification}> = memo(({certification}) => {
  const {name, issuer, date, image, status, verificationUrl} = certification;
  return (
    <SpotlightCard className="flex min-w-0 flex-wrap items-center gap-y-3 p-4">
      {/* Image container: light well for real badge art (most badges assume a
          white backing), dark well for the letter fallback so it sits in-theme. */}
      <div
        className={classNames(
          'mr-4 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg',
          image ? 'bg-neutral-100' : 'bg-neutral-800',
        )}>
        {image ? (
          <Image
            alt={`${name} certification badge`}
            className="h-full w-full rounded-lg object-contain"
            height={64}
            src={image}
            width={64}
          />
        ) : (
          <span className="text-2xl font-bold text-neutral-400">{issuer.charAt(0)}</span>
        )}
      </div>

      {/* Certification info */}
      <div className="flex min-w-0 flex-1 basis-40 flex-col justify-center">
        <h3 className="text-lg font-semibold text-neutral-100">{name}</h3>
        <p className="text-sm font-medium text-neutral-400">{issuer}</p>
        <p className="text-sm text-neutral-400">Year listed: {date}</p>
        {status && <p className="text-sm capitalize text-neutral-400">Status: {status}</p>}
        {verificationUrl && (
          <a
            className="mt-1 w-fit text-sm font-semibold text-orange-400 underline decoration-orange-400/50 underline-offset-4 hover:text-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            href={verificationUrl}
            rel="noreferrer"
            target="_blank">
            Verify credential
          </a>
        )}
      </div>
    </SpotlightCard>
  );
});

CertificationItem.displayName = 'CertificationItem';
export default CertificationItem;
