/**
 * Type definitions for the interactive 3D resume graph (/graph).
 *
 * The graph is a plain-data view over the resume: nodes are jobs, skills,
 * certifications, tools, education and responsibilities; edges connect
 * related entities. Everything here is JSX-free so the graph module stays
 * independent of the React section components.
 */

export type GraphNodeKind = 'job' | 'education' | 'skill' | 'skillGroup' | 'certification' | 'tool' | 'responsibility';

export type GraphEdgeKind = 'uses' | 'earned-via' | 'part-of' | 'related' | 'timeline';

export interface GraphNodeMeta {
  date?: string;
  location?: string;
  issuer?: string;
  url?: string;
}

export interface GraphNode {
  /** Namespaced stable slug, e.g. `job:ga-lead-ai-ml-engineer`, `skill:terraform`. */
  id: string;
  kind: GraphNodeKind;
  /** Short display name rendered as the 3D label. */
  label: string;
  /** Evidence-rich copy (outcome + metric where one exists) shown in the focus card. */
  description: string;
  /** 1–10 self-rating, used only for node luminosity (never shown as a bare number). */
  level?: number;
  meta?: GraphNodeMeta;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: GraphEdgeKind;
}

export interface ResumeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /**
   * Pre-sorted neighbor ids per node (by kind priority, then label) so that
   * ←/→ cycling and the accessible tree walk neighbors in the same stable
   * order on every renderer.
   */
  adjacency: Map<string, string[]>;
  nodeById: Map<string, GraphNode>;
}

/** Display order for node kinds — also the sort priority for neighbor cycling. */
export const KIND_ORDER: GraphNodeKind[] = [
  'job',
  'education',
  'certification',
  'skillGroup',
  'skill',
  'tool',
  'responsibility',
];

export const KIND_LABELS: Record<GraphNodeKind, string> = {
  certification: 'Certification',
  education: 'Education',
  job: 'Role',
  responsibility: 'Highlight',
  skill: 'Skill',
  skillGroup: 'Skill area',
  tool: 'Tool',
};
