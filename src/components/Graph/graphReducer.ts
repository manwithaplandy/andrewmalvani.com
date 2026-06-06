/**
 * Page-scoped navigation state machine for the 3D resume graph.
 *
 * One reducer drives all three renderers (3D canvas, DOM focus card, and the
 * parallel accessible tree) so they can never disagree about what is focused.
 *
 * Model: a node is *focused* (selected, card open); one of its neighbors may
 * be *highlighted* (the ←/→ cursor). ↑ enters the highlighted neighbor
 * (pushing the focused node onto history); ↓/Backspace pops history.
 */
import {resumeGraph} from '../../data/graphData';

export interface GraphNavState {
  focusedId: string | null;
  highlightedId: string | null;
  /** Focus trail for ↓-back and the breadcrumb, oldest first. */
  history: string[];
  /** Whether the full detail card is expanded (Enter). */
  expanded: boolean;
  /** Set when the last ←/→ cycle wrapped around — used for a subtle UI cue. */
  wrapped: boolean;
}

export type GraphNavAction =
  | {type: 'focusNode'; id: string}
  | {type: 'cycleSibling'; direction: 1 | -1}
  | {type: 'highlightNode'; id: string}
  | {type: 'enter'}
  | {type: 'back'}
  | {type: 'expand'}
  | {type: 'escape'}
  | {type: 'deselect'};

export const initialGraphNavState = (focusedId: string | null): GraphNavState => ({
  expanded: false,
  focusedId,
  highlightedId: null,
  history: [],
  wrapped: false,
});

const neighborsOf = (id: string | null): string[] => (id ? resumeGraph.adjacency.get(id) ?? [] : []);

const pushHistory = (history: string[], id: string | null): string[] =>
  id && history[history.length - 1] !== id ? [...history, id] : history;

export const graphNavReducer = (state: GraphNavState, action: GraphNavAction): GraphNavState => {
  switch (action.type) {
    case 'focusNode': {
      if (!resumeGraph.nodeById.has(action.id) || action.id === state.focusedId) {
        return state;
      }
      return {
        expanded: false,
        focusedId: action.id,
        highlightedId: null,
        history: pushHistory(state.history, state.focusedId),
        wrapped: false,
      };
    }
    case 'highlightNode': {
      const neighbors = neighborsOf(state.focusedId);
      if (!neighbors.includes(action.id)) {
        return state;
      }
      return {...state, highlightedId: action.id, wrapped: false};
    }
    case 'cycleSibling': {
      const neighbors = neighborsOf(state.focusedId);
      if (neighbors.length === 0) {
        return state;
      }
      const currentIndex = state.highlightedId ? neighbors.indexOf(state.highlightedId) : -1;
      // No highlight yet: → starts at the first neighbor, ← at the last.
      const nextIndex =
        currentIndex === -1
          ? action.direction === 1
            ? 0
            : neighbors.length - 1
          : (currentIndex + action.direction + neighbors.length) % neighbors.length;
      const wrapped =
        currentIndex !== -1 &&
        ((action.direction === 1 && nextIndex === 0) ||
          (action.direction === -1 && nextIndex === neighbors.length - 1));
      return {...state, highlightedId: neighbors[nextIndex], wrapped};
    }
    case 'enter': {
      if (!state.highlightedId) {
        return state;
      }
      return {
        expanded: false,
        focusedId: state.highlightedId,
        // Pre-highlight the node we came from so ←/→ continues naturally
        // and ↑↓ feel symmetric.
        highlightedId: state.focusedId,
        history: pushHistory(state.history, state.focusedId),
        wrapped: false,
      };
    }
    case 'back': {
      if (state.history.length === 0) {
        return state;
      }
      const history = state.history.slice(0, -1);
      const previous = state.history[state.history.length - 1];
      return {
        expanded: false,
        focusedId: previous,
        highlightedId: neighborsOf(previous).includes(state.focusedId ?? '') ? state.focusedId : null,
        history,
        wrapped: false,
      };
    }
    case 'expand': {
      return state.focusedId ? {...state, expanded: true} : state;
    }
    case 'escape': {
      if (state.expanded) {
        return {...state, expanded: false};
      }
      if (state.highlightedId) {
        return {...state, highlightedId: null, wrapped: false};
      }
      return {...state, expanded: false, focusedId: null, highlightedId: null, wrapped: false};
    }
    case 'deselect': {
      return {...state, expanded: false, focusedId: null, highlightedId: null, wrapped: false};
    }
  }
};
