import {useEffect, useState} from 'react';

/** Shares the live browser preference while keeping the server render deterministic. */
export default function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const synchronize = () => setReducedMotion(media.matches);
    media.addEventListener('change', synchronize);
    synchronize();
    return () => media.removeEventListener('change', synchronize);
  }, []);

  return reducedMotion;
}
