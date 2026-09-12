import classNames from 'classnames';
import {Dispatch, FC, memo, useCallback, useMemo} from 'react';

import {resumeGraph} from '../../data/graphData';
import {GraphNode, GraphNodeKind, KIND_LABELS, KIND_ORDER} from '../../data/graphDef';
import {Skill} from '../Sections/Resume/Skills';
import {GraphNavAction, GraphNavState} from './graphReducer';

/**
 * DOM renderer of the same resume graph: nodes grouped by kind, the focused
 * node expanded with its connections in the same stable order the 3D view
 * cycles through. Mounted only for the chosen or fallback text experience,
 * with ordinary disclosure buttons driving the shared selection reducer.
 */

const nodesByKind: ReadonlyArray<{kind: GraphNodeKind; nodes: GraphNode[]}> = KIND_ORDER.map(kind => ({
  kind,
  nodes: resumeGraph.nodes.filter(node => node.kind === kind),
})).filter(group => group.nodes.length > 0);

const GraphListFallback: FC<{
  state: GraphNavState;
  dispatch: Dispatch<GraphNavAction>;
  reason: 'chosen' | 'unsupported' | 'performance';
}> = memo(({state, dispatch, reason}) => (
  <nav aria-label="Career graph, list view" className="mx-auto flex w-full max-w-screen-md flex-col gap-y-8 px-4 py-8">
    <p className="text-sm text-neutral-400">
      {reason === 'chosen'
        ? 'Text view shows the complete career graph. Pick any entry to see its details and connections.'
        : reason === 'performance'
          ? 'The 3D view is running slowly on this device. The same career graph is fully explorable below: pick any entry to see its details and connections.'
          : "Your browser can't show the 3D view, but the same career graph is fully explorable below: pick any entry to see its details and connections."}
    </p>
    <ul>
      {nodesByKind.map(({kind, nodes}) => (
        <li key={kind}>
          <h2 className="pb-2 pt-6 text-xs font-bold uppercase tracking-wider text-neutral-400">
            {KIND_LABELS[kind]}s
          </h2>
          <ul>
            {nodes.map(node => (
              <GraphEntry
                dispatch={dispatch}
                // Derived primitives (not the whole state object) so memo
                // actually short-circuits the rows a dispatch didn't affect.
                highlightedId={state.focusedId === node.id ? state.highlightedId : null}
                isFocused={state.focusedId === node.id}
                key={node.id}
                node={node}
              />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  </nav>
));

const GraphEntry: FC<{
  node: GraphNode;
  isFocused: boolean;
  /** The ←/→ candidate — only ever non-null for the focused node's row. */
  highlightedId: string | null;
  dispatch: Dispatch<GraphNavAction>;
}> = memo(({node, isFocused, highlightedId, dispatch}) => {
  const neighbors = resumeGraph.adjacency.get(node.id) ?? [];
  const depthSkill = useMemo(
    () => (node.level !== undefined ? {level: node.level, max: 10, name: 'Hands-on depth'} : null),
    [node.level],
  );

  const handleFocus = useCallback(() => {
    dispatch({id: node.id, type: 'focusNode'});
  }, [dispatch, node.id]);

  return (
    <li>
      <button
        aria-controls={isFocused ? `graph-details-${node.id}` : undefined}
        aria-current={isFocused ? 'true' : undefined}
        aria-expanded={isFocused}
        className={classNames(
          'block w-full rounded-md px-2 py-2 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
          isFocused ? 'font-bold text-orange-400' : 'text-neutral-200 hover:text-orange-400',
        )}
        id={`graph-entry-${node.id}`}
        onClick={handleFocus}
        type="button">
        {node.label}
      </button>
      {isFocused && (
        <div className="flex flex-col gap-y-2 border-l border-neutral-700 pl-4" id={`graph-details-${node.id}`}>
          {(node.meta?.date || node.meta?.location || node.meta?.issuer) && (
            <p className="px-2 text-xs text-neutral-400">
              {[node.meta?.issuer, node.meta?.location, node.meta?.date].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="px-2 text-sm text-neutral-400">{node.description}</p>
          {depthSkill && <Skill skill={depthSkill} />}
          {neighbors.length > 0 && (
            <ul>
              {neighbors.map((neighborId, index) => (
                <NeighborLink
                  dispatch={dispatch}
                  index={index}
                  isHighlighted={highlightedId === neighborId}
                  key={neighborId}
                  neighborId={neighborId}
                  total={neighbors.length}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
});

const NeighborLink: FC<{
  neighborId: string;
  index: number;
  total: number;
  isHighlighted: boolean;
  dispatch: Dispatch<GraphNavAction>;
}> = memo(({neighborId, index, total, isHighlighted, dispatch}) => {
  const neighbor = resumeGraph.nodeById.get(neighborId);

  const handleClick = useCallback(() => {
    dispatch({id: neighborId, type: 'focusNode'});
    // This connection disappears when selection changes; move focus to the
    // destination's persistent entry button after React reveals its details.
    requestAnimationFrame(() => document.getElementById(`graph-entry-${neighborId}`)?.focus());
  }, [dispatch, neighborId]);

  if (!neighbor) {
    return null;
  }
  return (
    <li>
      <button
        className={classNames(
          'block w-full rounded-md px-2 py-2 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
          isHighlighted ? 'text-orange-400' : 'text-neutral-300 hover:text-orange-400',
        )}
        onClick={handleClick}
        type="button">
        <span aria-hidden="true">↳ </span>
        {neighbor.label}
        <span className="sr-only">
          , connection {index + 1} of {total}
        </span>
        <span aria-hidden="true" className="text-neutral-400">
          {' '}
          · {KIND_LABELS[neighbor.kind]}
        </span>
      </button>
    </li>
  );
});

GraphListFallback.displayName = 'GraphListFallback';
GraphEntry.displayName = 'GraphEntry';
NeighborLink.displayName = 'NeighborLink';
export default GraphListFallback;
