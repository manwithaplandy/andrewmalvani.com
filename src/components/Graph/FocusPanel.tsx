import {Transition} from '@headlessui/react';
import {ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, XMarkIcon} from '@heroicons/react/24/outline';
import classNames from 'classnames';
import {Dispatch, FC, memo, TouchEvent, useCallback, useMemo, useRef} from 'react';

import {resumeGraph} from '../../data/graphData';
import {KIND_LABELS} from '../../data/graphDef';
import {Skill} from '../Sections/Resume/Skills';
import {GraphNavAction, GraphNavState} from './graphReducer';

const SWIPE_THRESHOLD_PX = 40;

const ARROW_BUTTON_CLASS =
  'rounded-md border border-neutral-600 p-2 text-neutral-200 hover:border-orange-500 hover:text-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500';

interface FocusPanelProps {
  state: GraphNavState;
  dispatch: Dispatch<GraphNavAction>;
  reducedMotion: boolean;
}

/**
 * In-flow detail card for the focused node: name, evidence copy, meta,
 * the ←/→ connection cursor and (on touch) the Prev/Next/Dive controls the
 * in-flow card provides instead of a keyboard. Swiping the card horizontally
 * cycles connections — the canvas itself only ever orbits.
 */
const FocusPanel: FC<FocusPanelProps> = memo(({state, dispatch, reducedMotion}) => {
  const node = state.focusedId ? resumeGraph.nodeById.get(state.focusedId) : undefined;
  const neighbors = state.focusedId ? resumeGraph.adjacency.get(state.focusedId) ?? [] : [];
  const highlighted = state.highlightedId ? resumeGraph.nodeById.get(state.highlightedId) : undefined;
  const highlightIndex = state.highlightedId ? neighbors.indexOf(state.highlightedId) : -1;
  const touchStart = useRef<{x: number; y: number} | null>(null);

  const handlePrev = useCallback(() => dispatch({direction: -1, type: 'cycleSibling'}), [dispatch]);
  const handleNext = useCallback(() => dispatch({direction: 1, type: 'cycleSibling'}), [dispatch]);
  const handleEnter = useCallback(() => dispatch({type: 'enter'}), [dispatch]);
  const handleBack = useCallback(() => dispatch({type: 'back'}), [dispatch]);
  const handleClose = useCallback(() => dispatch({type: 'deselect'}), [dispatch]);
  const handleToggleExpand = useCallback(
    () => dispatch({type: state.expanded ? 'escape' : 'expand'}),
    [dispatch, state.expanded],
  );

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStart.current = touch ? {x: touch.clientX, y: touch.clientY} : null;
  }, []);
  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const start = touchStart.current;
      touchStart.current = null;
      const end = event.changedTouches[0];
      if (!start || !end) {
        return;
      }
      const deltaX = end.clientX - start.x;
      const deltaY = end.clientY - start.y;
      if (Math.abs(deltaX) >= SWIPE_THRESHOLD_PX && Math.abs(deltaX) > Math.abs(deltaY)) {
        dispatch({direction: deltaX < 0 ? 1 : -1, type: 'cycleSibling'});
      }
    },
    [dispatch],
  );

  const depthSkill = useMemo(
    () => (node?.level !== undefined ? {level: node.level, max: 10, name: 'Hands-on depth'} : null),
    [node?.level],
  );

  return (
    <Transition
      appear
      aria-label="Selected career item"
      className="pointer-events-auto h-fit min-w-0 pb-[env(safe-area-inset-bottom)]"
      enter={reducedMotion ? '' : 'transition duration-200 ease-out'}
      enterFrom={reducedMotion ? '' : 'translate-y-4 opacity-0'}
      enterTo={reducedMotion ? '' : 'translate-y-0 opacity-100'}
      leave={reducedMotion ? '' : 'transition duration-150 ease-in'}
      leaveFrom={reducedMotion ? '' : 'opacity-100'}
      leaveTo={reducedMotion ? '' : 'opacity-0'}
      role="region"
      show={!!node}>
      {node && (
        <div
          className="touch-pan-y rounded-xl border border-neutral-700 border-t-2 border-t-orange-500 bg-neutral-900 p-4 shadow-lg sm:p-6"
          onTouchEnd={handleTouchEnd}
          onTouchStart={handleTouchStart}>
          <div className="flex items-start justify-between gap-x-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-orange-400">{KIND_LABELS[node.kind]}</p>
              <h2 className="break-words text-lg font-bold text-white [overflow-wrap:anywhere]">{node.label}</h2>
              {(node.meta?.date || node.meta?.location || node.meta?.issuer) && (
                <p className="text-xs text-neutral-400">
                  {[node.meta?.issuer, node.meta?.location, node.meta?.date].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <button
              aria-label="Deselect node"
              className="-m-1 shrink-0 rounded-md p-1 text-neutral-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              onClick={handleClose}
              type="button">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <p className={classNames('mt-2 text-sm text-neutral-300', !state.expanded && 'line-clamp-3 sm:line-clamp-4')}>
            {node.description}
          </p>
          <button
            className="mt-1 text-xs text-neutral-400 underline-offset-2 hover:text-orange-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            onClick={handleToggleExpand}
            type="button">
            {state.expanded ? 'Show less' : 'Show more'}
          </button>

          {depthSkill && (
            <div className="mt-2">
              <Skill skill={depthSkill} />
            </div>
          )}

          {neighbors.length > 0 && (
            <div className="mt-3 border-t border-neutral-700/60 pt-3">
              <p className="text-xs text-neutral-400">
                {highlighted && highlightIndex >= 0 ? (
                  <>
                    Connection {highlightIndex + 1} of {neighbors.length}:{' '}
                    <span className="font-medium text-orange-400">{highlighted.label}</span>
                    {state.wrapped && <span className="text-neutral-400"> · wrapped</span>}
                  </>
                ) : (
                  <>
                    {neighbors.length} connection{neighbors.length === 1 ? '' : 's'} — scan with ←/→ or Prev/Next
                  </>
                )}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  aria-label="Previous connection"
                  className={ARROW_BUTTON_CLASS}
                  onClick={handlePrev}
                  type="button">
                  <ArrowLeftIcon className="h-4 w-4" />
                </button>
                <button aria-label="Next connection" className={ARROW_BUTTON_CLASS} onClick={handleNext} type="button">
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
                <button
                  aria-label={highlighted ? `Go to ${highlighted.label}` : 'Go to highlighted connection'}
                  className="flex grow items-center justify-center gap-x-1 rounded-md border border-orange-500 px-3 py-2 text-sm font-medium text-orange-400 hover:bg-orange-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:text-neutral-600"
                  disabled={!highlighted}
                  onClick={handleEnter}
                  type="button">
                  <ArrowUpIcon className="h-4 w-4" />
                  Dive in
                </button>
                <button
                  aria-label="Back to previous node"
                  className="flex items-center gap-x-1 rounded-md border border-neutral-600 px-3 py-2 text-sm text-neutral-200 hover:border-orange-500 hover:text-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:border-neutral-700 disabled:text-neutral-600"
                  disabled={state.history.length === 0}
                  onClick={handleBack}
                  type="button">
                  <ArrowDownIcon className="h-4 w-4" />
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Transition>
  );
});

FocusPanel.displayName = 'FocusPanel';
export default FocusPanel;
