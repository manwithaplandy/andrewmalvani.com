import classNames from 'classnames';
import {FC, memo, MouseEvent, PropsWithChildren, useCallback, useRef} from 'react';

/**
 * A dark card with a cursor-following orange spotlight and a lift-on-hover
 * treatment. Pure CSS custom properties — no animation library needed.
 */
const SpotlightCard: FC<PropsWithChildren<{className?: string}>> = memo(({children, className}) => {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    node.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  }, []);

  return (
    <div
      className={classNames(
        'group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900',
        'transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/40',
        'hover:shadow-[0_8px_40px_rgba(251,146,60,0.12)] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
      onMouseMove={onMouseMove}
      ref={ref}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(400px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(251,146,60,0.10), transparent 70%)',
        }}
      />
      {children}
    </div>
  );
});

SpotlightCard.displayName = 'SpotlightCard';
export default SpotlightCard;
