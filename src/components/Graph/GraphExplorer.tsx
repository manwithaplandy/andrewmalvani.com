import dynamic from 'next/dynamic';
import {FC, memo, useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {match} from 'ts-pattern';

import {initialFocusId, resumeGraph} from '../../data/graphData';
import {KIND_LABELS} from '../../data/graphDef';
import FocusPanel from './FocusPanel';
import GraphListFallback from './GraphListFallback';
import {graphNavReducer, initialGraphNavState} from './graphReducer';
import GraphSkeleton from './GraphSkeleton';

// The 3D canvas (three + react-force-graph-3d) must never be evaluated during
// static export — strict ssr:false boundary.
/* eslint-disable react-memo/require-memo -- dynamic() loader thunk and loading callback are not component definitions */
const ResumeGraphCanvas = dynamic(() => import('./ResumeGraphCanvas'), {
  loading: () => <GraphSkeleton />,
  ssr: false,
});
/* eslint-enable react-memo/require-memo */

type RenderMode = 'detecting' | '3d' | 'list';

const HINT_DISMISSED_KEY = 'graphHintDismissed';

const PILL_BUTTON_CLASS =
  'pointer-events-auto rounded-full border border-neutral-700 bg-neutral-900/70 px-3 py-1 text-xs text-neutral-300 backdrop-blur-md hover:border-orange-500 hover:text-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500';

const detectWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

const parseNodeHash = (hash: string): string | null => {
  const result = /^#node=(.+)$/.exec(hash);
  if (!result) {
    return null;
  }
  const id = decodeURIComponent(result[1]);
  return resumeGraph.nodeById.has(id) ? id : null;
};

/**
 * Owns the single navigation store that drives all three renderers (canvas,
 * focus card, accessible tree), plus WebGL detection, the keyboard model,
 * URL-hash deep links, reduced-motion handling and the onboarding chrome.
 */
const GraphExplorer: FC = memo(() => {
  const [state, dispatch] = useReducer(graphNavReducer, initialFocusId, initialGraphNavState);
  const [mode, setMode] = useState<RenderMode>('detecting');
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [manualReducedMotion, setManualReducedMotion] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const reducedMotion = systemReducedMotion || manualReducedMotion;

  // --- WebGL detect + hash deep link + hint state, once on mount ------------
  useEffect(() => {
    setMode(detectWebGL() ? '3d' : 'list');
    const fromHash = parseNodeHash(window.location.hash);
    if (fromHash) {
      dispatch({id: fromHash, type: 'focusNode'});
    }
    setHintDismissed(window.localStorage.getItem(HINT_DISMISSED_KEY) === 'true');
  }, []);

  // --- prefers-reduced-motion ------------------------------------------------
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReducedMotion(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setSystemReducedMotion(event.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  // --- keyboard model: ←/→ scan, ↑ dive, ↓/Backspace back, Esc, Enter --------
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Let buttons, links and form fields keep their native keyboard behavior.
      if (event.target instanceof Element && event.target.closest('button, a, input, textarea, select')) {
        return;
      }
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          dispatch({direction: -1, type: 'cycleSibling'});
          break;
        case 'ArrowRight':
          event.preventDefault();
          dispatch({direction: 1, type: 'cycleSibling'});
          break;
        case 'ArrowUp':
          event.preventDefault();
          dispatch({type: 'enter'});
          break;
        case 'ArrowDown':
        case 'Backspace':
          event.preventDefault();
          dispatch({type: 'back'});
          break;
        case 'Enter':
          event.preventDefault();
          dispatch({type: 'expand'});
          break;
        case 'Escape':
          dispatch({type: 'escape'});
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- URL hash sync: deep links + browser Back navigates the focus trail ----
  const hashSyncedOnce = useRef(false);
  useEffect(() => {
    const desired = state.focusedId ? `#node=${encodeURIComponent(state.focusedId)}` : '';
    const firstSync = !hashSyncedOnce.current;
    hashSyncedOnce.current = true;
    if (window.location.hash === desired) {
      return;
    }
    const base = window.location.pathname + window.location.search;
    const url = desired ? `${base}${desired}` : base;
    // The pre-focused initial node replaces (not pushes) so the first Back
    // press leaves the page instead of just clearing the hash.
    if (firstSync) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
    }
  }, [state.focusedId]);
  useEffect(() => {
    const handleHashChange = () => {
      const fromHash = parseNodeHash(window.location.hash);
      if (fromHash) {
        dispatch({id: fromHash, type: 'focusNode'});
      } else if (!window.location.hash) {
        dispatch({type: 'deselect'});
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // --- debounced aria-live announcements -------------------------------------
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const focused = state.focusedId ? resumeGraph.nodeById.get(state.focusedId) : undefined;
      if (!focused) {
        setAnnouncement('Nothing selected. Overview of the full career graph.');
        return;
      }
      const neighbors = resumeGraph.adjacency.get(focused.id) ?? [];
      if (state.highlightedId) {
        const highlighted = resumeGraph.nodeById.get(state.highlightedId);
        const index = neighbors.indexOf(state.highlightedId);
        if (highlighted && index >= 0) {
          setAnnouncement(
            `Highlighting connection ${index + 1} of ${neighbors.length}: ${highlighted.label}${
              state.wrapped ? ' (wrapped around)' : ''
            }`,
          );
          return;
        }
      }
      setAnnouncement(`Focused on ${focused.label}, ${KIND_LABELS[focused.kind]}. ${neighbors.length} connections.`);
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [state.focusedId, state.highlightedId, state.wrapped]);

  const handleDismissHint = useCallback(() => {
    setHintDismissed(true);
    window.localStorage.setItem(HINT_DISMISSED_KEY, 'true');
  }, []);
  const handleToggleLegend = useCallback(() => setLegendOpen(open => !open), []);
  const handleToggleMotion = useCallback(() => setManualReducedMotion(value => !value), []);

  const breadcrumb = useMemo(() => {
    const trail = [...state.history, ...(state.focusedId ? [state.focusedId] : [])];
    return trail
      .map(id => resumeGraph.nodeById.get(id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node));
  }, [state.history, state.focusedId]);

  const handleCrumbClick = useCallback((id: string) => dispatch({id, type: 'focusNode'}), []);

  return (
    <>
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>

      {match(mode)
        .with('detecting', () => (
          <div className="relative h-[100svh]">
            <GraphSkeleton />
          </div>
        ))
        .with('3d', () => (
          <div className="relative h-[100svh] print:hidden">
            <div
              aria-label="Interactive 3D career graph. Use left and right arrows to scan connections, up arrow to dive in, down arrow to go back, Escape to deselect."
              aria-roledescription="3D career graph"
              className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"
              role="application"
              tabIndex={0}>
              <ResumeGraphCanvas dispatch={dispatch} reducedMotion={reducedMotion} state={state} />
            </div>

            {/* Breadcrumb trail of focus history (last 3 crumbs). */}
            {breadcrumb.length > 0 && (
              <nav
                aria-label="Focus history"
                className="pointer-events-auto absolute left-3 top-36 z-20 flex max-w-[80vw] items-center gap-x-1 text-xs text-neutral-400 sm:left-6 sm:top-44">
                {breadcrumb.length > 3 && <span aria-hidden="true">… /</span>}
                {breadcrumb.slice(-3).map((crumb, index, visible) => (
                  <Crumb
                    id={crumb.id}
                    isLast={index === visible.length - 1}
                    key={`${crumb.id}-${index}`}
                    label={crumb.label}
                    onClick={handleCrumbClick}
                  />
                ))}
              </nav>
            )}

            {/* Collapsible legend, top-right. */}
            <div className="absolute right-3 top-16 z-20 flex flex-col items-end gap-y-2 sm:right-6 sm:top-20">
              <button
                aria-expanded={legendOpen}
                className={PILL_BUTTON_CLASS}
                onClick={handleToggleLegend}
                type="button">
                {legendOpen ? 'Hide legend' : 'Legend'}
              </button>
              {legendOpen && (
                <dl className="pointer-events-auto flex flex-col gap-y-1 rounded-xl border border-neutral-700 bg-neutral-900/80 p-4 text-xs text-neutral-300 backdrop-blur-md">
                  <LegendRow shape="●" text="Role (large sphere) · warm = recent" />
                  <LegendRow shape="◆" text="Certification (octahedron, yellow)" />
                  <LegendRow shape="○" text="Skill area (wireframe orb)" />
                  <LegendRow shape="•" text="Skill / tool (small sphere) · brighter = deeper" />
                  <LegendRow shape="▪" text="Highlight / achievement (cube)" />
                  <LegendRow shape="◇" text="Education (icosahedron)" />
                  <LegendRow shape="—" text="Orange = selected path · white ring = next (←/→)" />
                </dl>
              )}
              <button
                aria-pressed={manualReducedMotion}
                className={PILL_BUTTON_CLASS}
                onClick={handleToggleMotion}
                type="button">
                {reducedMotion ? 'Motion: reduced' : 'Reduce motion'}
              </button>
            </div>

            {/* Dismissible onboarding hint. */}
            {!hintDismissed && (
              <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-4 sm:top-20">
                <div className="pointer-events-auto flex items-center gap-x-3 rounded-full border border-neutral-700 bg-neutral-900/80 px-4 py-2 text-xs text-neutral-300 backdrop-blur-md">
                  <span className="hidden sm:inline">Click a node · ←/→ scan connections · ↑ dive in · ↓ back</span>
                  <span className="sm:hidden">Tap a node · drag to orbit · use the card to scan & dive</span>
                  <button
                    aria-label="Dismiss hint"
                    className="text-neutral-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    onClick={handleDismissHint}
                    type="button">
                    ✕
                  </button>
                </div>
              </div>
            )}

            <FocusPanel dispatch={dispatch} state={state} />

            {/* Parallel accessible tree: always rendered, drives the same store. */}
            <GraphListFallback dispatch={dispatch} state={state} visible={false} />
          </div>
        ))
        .with('list', () => (
          // Top padding clears the absolutely-positioned headline overlay.
          <div className="pb-12 pt-40 sm:pt-36">
            <GraphListFallback dispatch={dispatch} state={state} visible />
          </div>
        ))
        .exhaustive()}
    </>
  );
});

const Crumb: FC<{id: string; label: string; isLast: boolean; onClick: (id: string) => void}> = memo(
  ({id, label, isLast, onClick}) => {
    const handleClick = useCallback(() => onClick(id), [id, onClick]);
    return (
      <span className="flex items-center gap-x-1">
        <button
          aria-current={isLast ? 'true' : undefined}
          className={`pointer-events-auto max-w-[10rem] truncate rounded px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
            isLast ? 'font-medium text-orange-400' : 'hover:text-white'
          }`}
          onClick={handleClick}
          type="button">
          {label}
        </button>
        {!isLast && <span aria-hidden="true">/</span>}
      </span>
    );
  },
);

const LegendRow: FC<{shape: string; text: string}> = memo(({shape, text}) => (
  <div className="flex items-baseline gap-x-2">
    <dt aria-hidden="true" className="w-4 text-center text-neutral-400">
      {shape}
    </dt>
    <dd>{text}</dd>
  </div>
));

GraphExplorer.displayName = 'GraphExplorer';
Crumb.displayName = 'Crumb';
LegendRow.displayName = 'LegendRow';
export default GraphExplorer;
