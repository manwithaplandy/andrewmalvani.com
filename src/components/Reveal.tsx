import classNames from 'classnames';
import {CSSProperties, FC, memo, PropsWithChildren, useEffect, useRef, useState} from 'react';

/**
 * Fades and slides its children up when they enter the viewport.
 * Renders children visible immediately when prefers-reduced-motion is set
 * (and on the server, so content is never hidden without JS).
 */
const Reveal: FC<PropsWithChildren<{className?: string; delayMs?: number}>> = memo(
  ({children, className, delayMs = 0}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(true);
    const [isAnimated, setIsAnimated] = useState(false);

    useEffect(() => {
      const node = ref.current;
      if (!node) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      // Already in view on mount (e.g. hero-adjacent content): skip the animation.
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) return;

      setIsVisible(false);
      const observer = new IntersectionObserver(
        entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            setIsAnimated(true);
            setIsVisible(true);
            observer.disconnect();
          }
        },
        {rootMargin: '0px 0px -10% 0px'},
      );
      observer.observe(node);
      return () => observer.disconnect();
    }, []);

    const style: CSSProperties | undefined = delayMs ? {transitionDelay: `${delayMs}ms`} : undefined;

    return (
      <div
        className={classNames(
          className,
          isAnimated && 'transition-all duration-700 ease-out',
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        )}
        ref={ref}
        style={style}>
        {children}
      </div>
    );
  },
);

Reveal.displayName = 'Reveal';
export default Reveal;
