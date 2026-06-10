import classNames from 'classnames';
import Image from 'next/image';
import {FC, memo} from 'react';

import {Certification} from '../../../data/dataDef';
import SpotlightCard from '../../SpotlightCard';

const CertificationItem: FC<{certification: Certification}> = memo(({certification}) => {
  const {name, issuer, date, image} = certification;
  return (
    <SpotlightCard className="flex items-center p-4">
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
      <div className="flex flex-col justify-center">
        <h3 className="text-lg font-semibold text-neutral-100">{name}</h3>
        <p className="text-sm font-medium text-neutral-400">{issuer}</p>
        <p className="text-sm text-neutral-500">{date}</p>
      </div>
    </SpotlightCard>
  );
});

CertificationItem.displayName = 'CertificationItem';
export default CertificationItem;
