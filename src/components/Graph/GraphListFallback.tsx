import classNames from 'classnames';
import {Dispatch, FC, memo, useCallback} from 'react';

import {resumeGraph} from '../../data/graphData';
import {GraphNode, GraphNodeKind, KIND_LABELS, KIND_ORDER} from '../../data/graphDef';
import {GraphNavAction, GraphNavState} from './graphReducer';

/**
 * DOM renderer of the same resume graph: nodes grouped by kind, the focused
 * node expanded with its connections in the same stable order the 3D view
 * cycles through. It is ALWAYS rendered — visually hidden while the canvas is
 * up — so keyboard/AT users drive the exact same reducer; when WebGL is
 * unavailable it becomes the visible experience.
 */

const nodesByKind: ReadonlyArray<{kind: GraphNodeKind; nodes: GraphNode[]}> = KIND_ORDER.map(kind => ({
  kind,
  nodes: resumeGraph.nodes.filter(node => node.kind === kind),
})).filter(group => group.nodes.length > 0);

const GraphListFallback: FC<{
  state: GraphNavState;
  dispatch: Dispatch<GraphNavAction>;
  visible: boolean;
}> = memo(({state, dispatch, visible}) => (
  <nav
    aria-label="Career graph, list view"
    className={classNames(visible ? 'mx-auto flex w-full max-w-screen-md flex-col gap-y-8 px-4 py-8' : 'sr-only')}>
    {visible && (
      <p className="text-sm text-neutral-400">
        Your browser can't show the 3D view, but the same career graph is fully explorable below: pick any entry to see
        what it's connected to.
      </p>
    )}
    <ul role="tree">
      {nodesByKind.map(({kind, nodes}) => (
        <li key={kind} role="presentation">
          <h2 className="pb-2 pt-6 text-xs font-bold uppercase tracking-wider text-neutral-500">
            {KIND_LABELS[kind]}s
          </h2>
          <ul role="group">
            {nodes.map(node => (
              <TreeNode
                dispatch={dispatch}
                // Derived primitives (not the whole state object) so memo
                // actually short-circuits the rows a dispatch didn't affect.
                highlightedId={state.focusedId === node.id ? state.highlightedId : null}
                isFocused={state.focusedId === node.id}
                key={node.id}
                node={node}
                visible={visible}
              />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  </nav>
));

const TreeNode: FC<{
  node: GraphNode;
  isFocused: boolean;
  /** The ←/→ candidate — only ever non-null for the focused node's row. */
  highlightedId: string | null;
  dispatch: Dispatch<GraphNavAction>;
  visible: boolean;
}> = memo(({node, isFocused, highlightedId, dispatch, visible}) => {
  const neighbors = resumeGraph.adjacency.get(node.id) ?? [];

  const handleFocus = useCallback(() => {
    dispatch({id: node.id, type: 'focusNode'});
  }, [dispatch, node.id]);

  return (
    <li aria-expanded={isFocused} aria-selected={isFocused} role="treeitem">
      <button
        aria-current={isFocused ? 'true' : undefined}
        className={classNames(
          'rounded-md px-2 py-1 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
          isFocused ? 'font-bold text-orange-400' : 'text-neutral-200 hover:text-orange-400',
        )}
        onClick={handleFocus}
        type="button">
        {node.label}
      </button>
      {isFocused && (
        <div className={classNames('flex flex-col gap-y-2', visible && 'border-l border-neutral-700 pl-4')}>
          <p className="px-2 text-sm text-neutral-400">{node.description}</p>
          {neighbors.length > 0 && (
            <ul role="group">
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
  }, [dispatch, neighborId]);

  if (!neighbor) {
    return null;
  }
  return (
    <li role="treeitem">
      <button
        className={classNames(
          'rounded-md px-2 py-0.5 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
          isHighlighted ? 'text-orange-400' : 'text-neutral-300 hover:text-orange-400',
        )}
        onClick={handleClick}
        type="button">
        <span aria-hidden="true">↳ </span>
        {neighbor.label}
        <span className="sr-only">
          , connection {index + 1} of {total}
        </span>
        <span aria-hidden="true" className="text-neutral-500">
          {' '}
          · {KIND_LABELS[neighbor.kind]}
        </span>
      </button>
    </li>
  );
});

GraphListFallback.displayName = 'GraphListFallback';
TreeNode.displayName = 'TreeNode';
NeighborLink.displayName = 'NeighborLink';
export default GraphListFallback;
