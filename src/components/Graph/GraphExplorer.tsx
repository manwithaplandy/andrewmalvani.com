import dynamic from 'next/dynamic';
import Router, {useRouter} from 'next/router';
import {FC, memo, SyntheticEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {match} from 'ts-pattern';

import {initialFocusId, resumeGraph} from '../../data/graphData';
import {KIND_LABELS} from '../../data/graphDef';
import useReducedMotion from '../../hooks/useReducedMotion';
import FocusPanel from './FocusPanel';
import GraphListFallback from './GraphListFallback';
import {graphNavReducer, initialGraphNavState} from './graphReducer';
import GraphSearch from './GraphSearch';
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
  try {
    const id = decodeURIComponent(result[1]);
    return resumeGraph.nodeById.has(id) ? id : null;
  } catch {
    return null;
  }
};

/**
 * Owns the single navigation store that drives all three renderers (canvas,
 * focus card, text list), plus WebGL detection, the keyboard model,
 * URL-hash deep links, reduced-motion handling and the onboarding chrome.
 */
const GraphExplorer: FC = memo(() => {
  const {isReady: routerReady} = useRouter();
  const [state, dispatch] = useReducer(graphNavReducer, initialFocusId, initialGraphNavState);
  const [capability, setCapability] = useState<'detecting' | 'supported' | 'unsupported' | 'performance'>('detecting');
  const [requestedView, setRequestedView] = useState<'3d' | 'list'>('3d');
  const mode: RenderMode =
    capability === 'detecting' ? 'detecting' : requestedView === 'list' || capability !== 'supported' ? 'list' : '3d';
  const listReason = requestedView === 'list' ? 'chosen' : capability === 'performance' ? 'performance' : 'unsupported';
  const textViewRef = useRef<HTMLButtonElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const threeViewRef = useRef<HTMLButtonElement>(null);
  const locationFocus = useRef<string | null | undefined>(undefined);
  const systemReducedMotion = useReducedMotion();
  const [manualReducedMotion, setManualReducedMotion] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(true);
  const [legendOpen, setLegendOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [overviewRequest, setOverviewRequest] = useState(0);
  const reducedMotion = systemReducedMotion || manualReducedMotion;
  // The role="application" container; the keyboard model only acts while focus
  // lives inside it, so arrows/Backspace stay free everywhere else.
  const applicationRef = useRef<HTMLDivElement>(null);

  // --- WebGL detect + hash deep link + hint state, once on mount ------------
  useEffect(() => {
    setCapability(detectWebGL() ? 'supported' : 'unsupported');
    setRequestedView(new URLSearchParams(window.location.search).get('view') === 'list' ? 'list' : '3d');
    const fromHash = parseNodeHash(window.location.hash);
    if (fromHash) {
      dispatch({id: fromHash, type: 'focusNode'});
    }
    try {
      setHintDismissed(window.localStorage.getItem(HINT_DISMISSED_KEY) === 'true');
    } catch {
      setHintDismissed(false);
    }
  }, []);

  // --- keyboard model: ←/→ scan, ↑ dive, ↓/Backspace back, Esc, Enter --------
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only act when focus is within the 3D application region; otherwise the
      // global arrow/Backspace capture would steal keys from the rest of the
      // page (and from the reducer-driven list fallback, which has its own
      // ordinary buttons). The container is focusable (tabIndex=0), so focusing
      // it or any child counts.
      const container = applicationRef.current;
      if (!container || !(document.activeElement && container.contains(document.activeElement))) {
        return;
      }
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
    // Static-export query hydration owns its own initial replacement. Wait
    // until it finishes before recording the graph's default selection.
    if (!routerReady) {
      return;
    }
    if (locationFocus.current === state.focusedId) {
      locationFocus.current = undefined;
      return;
    }
    const desired = state.focusedId ? `#node=${encodeURIComponent(state.focusedId)}` : '';
    const firstSync = !hashSyncedOnce.current;
    hashSyncedOnce.current = true;
    if (
      window.location.hash === desired ||
      (state.focusedId && parseNodeHash(window.location.hash) === state.focusedId)
    ) {
      return;
    }
    // A deep-link hash whose focusNode dispatch (mount effect) hasn't
    // committed yet must not be clobbered by the initial replaceState — once
    // it commits, this effect re-runs and finds hash === desired above.
    if (firstSync && parseNodeHash(window.location.hash)) {
      return;
    }
    const base = window.location.pathname + window.location.search;
    const url = desired ? `${base}${desired}` : base;
    // The pre-focused initial node replaces (not pushes) so the first Back
    // press leaves the page instead of just clearing the hash. Let Next own
    // each history entry so Back also restores the page after leaving graph.
    if (firstSync) {
      void Router.replace(url, undefined, {shallow: true, scroll: false});
    } else {
      void Router.push(url, undefined, {shallow: true, scroll: false});
    }
  }, [routerReady, state.focusedId]);
  useEffect(() => {
    const handleLocationChange = () => {
      const view = new URLSearchParams(window.location.search).get('view') === 'list' ? 'list' : '3d';
      const fromHash = parseNodeHash(window.location.hash);
      const target = fromHash ?? (window.location.hash ? initialFocusId : null);
      const focusedDetails = state.focusedId ? document.getElementById(`graph-details-${state.focusedId}`) : null;
      // Selection-only history also removes the outgoing text connections.
      // Recover their focus before dispatch; entry and mode buttons survive.
      const removesFocusedConnection = target !== state.focusedId && focusedDetails?.contains(document.activeElement);
      if (
        (view !== requestedView && experienceRef.current?.contains(document.activeElement)) ||
        removesFocusedConnection
      ) {
        const recoveryButton = (view === 'list' || capability !== 'supported' ? textViewRef : threeViewRef).current;
        recoveryButton?.focus({preventScroll: Boolean(removesFocusedConnection)});
        if (removesFocusedConnection && recoveryButton) {
          // Back/Forward restores scroll after popstate. Reveal recovered
          // focus afterward, unless the user has already moved elsewhere.
          requestAnimationFrame(() => {
            if (document.activeElement === recoveryButton) {
              recoveryButton.scrollIntoView({behavior: 'instant', block: 'nearest'});
            }
          });
        }
      }
      setRequestedView(view);
      // A browser navigation already owns this URL. Do not push it back onto
      // history when its selection commits, including malformed fragments.
      locationFocus.current = target === state.focusedId ? undefined : target;
      dispatch(target ? {id: target, type: 'focusNode'} : {type: 'deselect'});
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [capability, requestedView, state.focusedId]);

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
    try {
      window.localStorage.setItem(HINT_DISMISSED_KEY, 'true');
    } catch {
      // The in-memory choice remains usable when storage is denied.
    }
  }, []);
  // WebGL existing isn't the same as WebGL being usable — the canvas's FPS
  // probe reports back so a too-slow device falls back to the list view.
  const handlePerformanceFallback = useCallback(() => {
    if (experienceRef.current?.contains(document.activeElement)) {
      threeViewRef.current?.focus();
    }
    setCapability('performance');
  }, []);
  const handleChooseView = useCallback((view: '3d' | 'list') => {
    setRequestedView(view);
    const url = new URL(window.location.href);
    if (url.searchParams.get('view') !== view) {
      url.searchParams.set('view', view);
      void Router.push(`${url.pathname}${url.search}${url.hash}`, undefined, {shallow: true, scroll: false});
    }
  }, []);
  const handleTextView = useCallback(() => handleChooseView('list'), [handleChooseView]);
  const handleThreeView = useCallback(() => handleChooseView('3d'), [handleChooseView]);
  const handleHelpToggle = useCallback((event: SyntheticEvent<HTMLDetailsElement>) => {
    const open = event.currentTarget.open;
    setHintDismissed(!open);
    try {
      if (open) {
        window.localStorage.removeItem(HINT_DISMISSED_KEY);
      } else {
        window.localStorage.setItem(HINT_DISMISSED_KEY, 'true');
      }
    } catch {
      // The in-memory choice remains usable when storage is denied.
    }
  }, []);
  const handleLegendToggle = useCallback((event: SyntheticEvent<HTMLDetailsElement>) => {
    setLegendOpen(event.currentTarget.open);
  }, []);
  const handleToggleMotion = useCallback(() => setManualReducedMotion(value => !value), []);

  const breadcrumb = useMemo(() => {
    const trail = [...state.history, ...(state.focusedId ? [state.focusedId] : [])];
    return trail
      .map(id => resumeGraph.nodeById.get(id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node));
  }, [state.history, state.focusedId]);

  const handleOverview = useCallback(() => {
    dispatch({type: 'reset'});
    setOverviewRequest(request => request + 1);
  }, []);

  const handleCrumbClick = useCallback((id: string) => dispatch({id, type: 'focusNode'}), []);

  return (
    <section className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col">
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>

      <GraphSearch onSelect={handleCrumbClick} />

      <div
        aria-label="Career graph controls"
        className="flex flex-wrap items-start gap-2 px-3 py-2 sm:px-6"
        role="toolbar">
        <button
          aria-pressed={mode === 'list'}
          className={PILL_BUTTON_CLASS}
          onClick={handleTextView}
          ref={textViewRef}
          type="button">
          Text view
        </button>
        <button
          aria-pressed={mode === '3d'}
          className={PILL_BUTTON_CLASS}
          onClick={handleThreeView}
          ref={threeViewRef}
          type="button">
          3D view
        </button>

        <button className={PILL_BUTTON_CLASS} onClick={handleOverview} type="button">
          Show overview
        </button>

        <details className="min-w-0 max-w-full sm:max-w-xl" onToggle={handleHelpToggle} open={!hintDismissed}>
          <summary className={`${PILL_BUTTON_CLASS} cursor-pointer select-none`}>How to explore</summary>
          <div className="mt-2 rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-300">
            <p>Click or tap a node to select it. Drag the graph to orbit.</p>
            <p className="mt-2">Use ←/→ to scan connections, ↑ to dive in, and ↓ to go back.</p>
            <button
              aria-label="Dismiss hint"
              className="mt-3 rounded-md border border-neutral-600 px-3 py-1 text-xs text-neutral-200 hover:border-orange-500 hover:text-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              onClick={handleDismissHint}
              type="button">
              Close help
            </button>
          </div>
        </details>

        <details className="min-w-0 max-w-full sm:max-w-xl" onToggle={handleLegendToggle} open={legendOpen}>
          <summary className={`${PILL_BUTTON_CLASS} cursor-pointer select-none`}>Legend</summary>
          <dl className="mt-2 flex flex-col gap-y-1 rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-xs text-neutral-300">
            <LegendRow shape="●" text="Role (large sphere) · warm = recent" />
            <LegendRow shape="◆" text="Certification (octahedron, yellow)" />
            <LegendRow shape="○" text="Skill area (wireframe orb)" />
            <LegendRow shape="•" text="Skill / tool (small sphere) · brighter = deeper" />
            <LegendRow shape="▪" text="Highlight / achievement (cube)" />
            <LegendRow shape="◇" text="Education (icosahedron)" />
            <LegendRow shape="—" text="Orange = selected path · white ring = next (←/→)" />
          </dl>
        </details>

        <button
          aria-pressed={manualReducedMotion}
          className={PILL_BUTTON_CLASS}
          onClick={handleToggleMotion}
          type="button">
          {reducedMotion ? 'Motion: reduced' : 'Reduce motion'}
        </button>
      </div>

      {match(mode)
        .with('detecting', () => (
          <div className="relative min-h-[320px] flex-1">
            <GraphSkeleton />
          </div>
        ))
        .with('3d', () => (
          <div className="flex min-h-[320px] flex-1 flex-col px-3 pb-4 sm:px-6" ref={experienceRef}>
            {breadcrumb.length > 0 && (
              <nav
                aria-label="Focus history"
                className="mb-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-neutral-400">
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
            <div className="grid min-h-[320px] flex-1 gap-4 md:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
              <div className="relative min-h-[320px] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                <div
                  aria-label="Interactive 3D career graph. Use left and right arrows to scan connections, up arrow to dive in, down arrow to go back, Escape to deselect."
                  aria-roledescription="3D career graph"
                  className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"
                  ref={applicationRef}
                  role="application"
                  tabIndex={0}>
                  <ResumeGraphCanvas
                    dispatch={dispatch}
                    onPerformanceFallback={handlePerformanceFallback}
                    overviewRequest={overviewRequest}
                    reducedMotion={reducedMotion}
                    state={state}
                  />
                </div>
              </div>
              <FocusPanel dispatch={dispatch} reducedMotion={reducedMotion} state={state} />
            </div>
          </div>
        ))
        .with('list', () => (
          <div className="pb-12" ref={experienceRef}>
            <GraphListFallback dispatch={dispatch} reason={listReason} state={state} />
          </div>
        ))
        .exhaustive()}
    </section>
  );
});

const Crumb: FC<{id: string; label: string; isLast: boolean; onClick: (id: string) => void}> = memo(
  ({id, label, isLast, onClick}) => {
    const handleClick = useCallback(() => onClick(id), [id, onClick]);
    return (
      <span className="flex min-w-0 max-w-full items-center gap-x-1">
        <button
          aria-current={isLast ? 'true' : undefined}
          className={`pointer-events-auto min-w-0 max-w-full break-words rounded px-1 text-left [overflow-wrap:anywhere] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
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
