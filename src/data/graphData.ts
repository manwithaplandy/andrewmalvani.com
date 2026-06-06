/**
 * Content for the interactive 3D resume graph (/graph).
 *
 * Jobs, skills, skill groups, education and certifications are derived from
 * the same `data.tsx` arrays that drive the classic resume, so levels, dates
 * and titles can never drift between the two views. Descriptions and ALL
 * edges are hand-authored here — no relationship data exists elsewhere — and
 * every description aims for evidence + outcome + metric, not a bare label.
 */
import {certifications, education, experience, skills} from './data';
import {GraphEdge, GraphNode, KIND_ORDER, ResumeGraph} from './graphDef';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Hand-authored copy for nodes derived from data.tsx, keyed by the source
 * item's name/title. Anything missing falls back to a generic slug + label.
 */
interface DerivedDetails {
  id: string;
  label?: string;
  description: string;
}

interface GroupDetails extends DerivedDetails {
  /** Node kind the group's members render as; defaults to `skill`. */
  memberKind?: 'skill' | 'tool';
}

const JOB_DETAILS: Record<string, DerivedDetails> = {
  'Compliance & Marketing Consultant': {
    description:
      'Audited car dealerships across the country for compliance with local, state, federal and corporate authorities — resolving violations quickly and advising clients on prevention, while supporting marketing strategy and content.',
    id: 'job:reynolds-compliance-marketing-consultant',
    label: 'Compliance & Marketing Consultant',
  },
  'IT Strategic Analyst': {
    description:
      'Tier-1 helpdesk, systems administrator and automation engineer in one. Anticipated end-user needs and built internal tools with Python, JavaScript/jQuery and Mulesoft that significantly improved team efficiency.',
    id: 'job:tillster-it-strategic-analyst',
    label: 'IT Strategic Analyst',
  },
  'Lead AI/ML Engineer': {
    description:
      "Leads General Atomics' AI agent program as the organization's LLM SME: a secure internal RAG chatbot for self-service assistants, an agent that cut technical-order authoring time by 40%, and AI dev assistants that raised development velocity by 50%.",
    id: 'job:ga-lead-ai-ml-engineer',
    label: 'Lead AI/ML Engineer',
  },
  'Systems Administrator': {
    description:
      'Modernized IT infrastructure for 15,000+ end users by bringing DevOps and Agile automation to the enterprise, and spearheaded the first generative-AI rollout across General Atomics.',
    id: 'job:ga-systems-administrator',
    label: 'Systems Administrator',
  },
};

const EDUCATION_DETAILS: Record<string, DerivedDetails> = {
  "Bachelor's - Psychology": {
    description:
      "B.A. in Psychology from UC Santa Barbara (2017) — the people-first foundation behind a self-taught engineering career; currently pursuing a Master's degree in Computer Science.",
    id: 'education:ucsb-psychology',
    label: 'B.A. Psychology, UCSB',
  },
};

const GROUP_DETAILS: Record<string, GroupDetails> = {
  'Cloud Services': {
    description:
      'Certified on AWS and Azure, with real workloads shipped on both — plus Cloudflare at the edge for analytics and side projects.',
    id: 'skillGroup:cloud-services',
    label: 'Cloud Services',
  },
  'Coding Languages': {
    description:
      'The languages the day job is written in — from production AI services in Python to this very site in TypeScript.',
    id: 'skillGroup:coding-languages',
    label: 'Coding Languages',
  },
  'DevOps Tools': {
    description:
      'Containers, infrastructure-as-code and pipelines: the operational backbone behind both enterprise platforms and this site.',
    id: 'skillGroup:devops-tools',
    label: 'DevOps Tools',
    memberKind: 'tool',
  },
  'Generative AI Skills': {
    description:
      'The core craft — retrieval, agents and orchestration frameworks shipped to production at General Atomics, not just experimented with.',
    id: 'skillGroup:generative-ai',
    label: 'Generative AI',
  },
};

const SKILL_DETAILS: Record<string, DerivedDetails> = {
  AWS: {
    description:
      'Solutions Architect Associate certified. This site runs entirely on AWS — S3, CloudFront, Lambda, DynamoDB — every piece defined in Terraform.',
    id: 'skill:aws',
    label: 'AWS',
  },
  Agents: {
    description:
      'Designed and shipped the autonomous agent that cut technical-order authoring time by 40% at General Atomics by searching a massive corpus of supporting documents.',
    id: 'skill:agents',
    label: 'AI Agents',
  },
  Azure: {
    description:
      'Azure AI Engineer certified. Deployed Azure-hosted AI services as part of the enterprise generative-AI rollout at General Atomics.',
    id: 'skill:azure',
    label: 'Azure',
  },
  Bash: {
    description: 'Day-to-day automation glue across Linux servers, CI pipelines and developer tooling.',
    id: 'skill:bash',
    label: 'Bash',
  },
  'CI/CD': {
    description:
      'GitHub Actions deploys this site to S3/CloudFront on every merge — the same automation mindset brought to enterprise IT at General Atomics.',
    id: 'tool:ci-cd',
    label: 'CI/CD',
  },
  Cloudflare: {
    description:
      "Hosts the retirement-simulation side project and supplies the privacy-preserving edge analytics behind this site's public /stats page.",
    id: 'skill:cloudflare',
    label: 'Cloudflare',
  },
  Docker: {
    description:
      'Containerizes nearly every workload — from production AI services at General Atomics to local dev environments for side projects.',
    id: 'tool:docker',
    label: 'Docker',
  },
  GCP: {
    description: 'Working familiarity from cross-cloud comparisons and smaller side projects.',
    id: 'skill:gcp',
    label: 'GCP',
  },
  'Javascript & Typescript (Node, React)': {
    description:
      'Built this site (Next.js, React, TypeScript, statically exported to S3) and a retirement-simulation app with a Node.js backend.',
    id: 'skill:javascript-typescript',
    label: 'JavaScript / TypeScript',
  },
  Kubernetes: {
    description: 'Working knowledge of cluster operations and deployments for container orchestration.',
    id: 'tool:kubernetes',
    label: 'Kubernetes',
  },
  'LangChain & LangGraph': {
    description:
      'Orchestration frameworks of choice for production agents at General Atomics; also fluent in Semantic Kernel, LlamaIndex, AutoGen and CrewAI.',
    id: 'skill:langchain-langgraph',
    label: 'LangChain & LangGraph',
  },
  Learning: {
    description:
      "Psychology B.A. to Lead AI/ML Engineer in seven years — and still compounding, with a Master's in Computer Science in progress.",
    id: 'skill:learning',
    label: 'Learning',
  },
  Powershell: {
    description: 'Windows-fleet automation from the Systems Administrator years at General Atomics.',
    id: 'skill:powershell',
    label: 'PowerShell',
  },
  Python: {
    description:
      'Primary language — powers production AI agents at General Atomics, internal tooling at Tillster, and the daily stats-aggregation Lambda behind this site.',
    id: 'skill:python',
    label: 'Python',
  },
  RAG: {
    description:
      "Designed the retrieval pipeline behind General Atomics' secure internal chatbot, letting users self-service AI assistants over their own data.",
    id: 'skill:rag',
    label: 'RAG',
  },
  Terraform: {
    description:
      "HashiCorp-certified. Defines this site's entire AWS footprint — CloudFront, Lambda, DynamoDB, IAM — as reviewable code in the site's public repo.",
    id: 'tool:terraform',
    label: 'Terraform',
  },
};

interface CertDetails extends DerivedDetails {
  /** Skill node this certification validates (becomes an `earned-via` edge). */
  validates?: string;
}

const CERT_DETAILS: Record<string, CertDetails> = {
  'AWS Solutions Architect Associate': {
    description:
      'Amazon Web Services, 2024. Backed by production evidence: this site is an all-AWS stack (S3, CloudFront, Lambda, DynamoDB) designed and operated end to end.',
    id: 'certification:aws-saa',
    label: 'AWS Solutions Architect Associate',
    validates: 'skill:aws',
  },
  'Azure AI Engineer': {
    description:
      'Microsoft, 2025. Validates the Azure AI services work behind the enterprise generative-AI rollout at General Atomics.',
    id: 'certification:azure-ai-engineer',
    label: 'Azure AI Engineer',
    validates: 'skill:azure',
  },
  'CompTIA CySA+': {
    description:
      'CompTIA, 2022. Security analytics certification underpinning the security-first approach taken to every AI rollout.',
    id: 'certification:comptia-cysa',
    label: 'CompTIA CySA+',
  },
  'HashiCorp Terraform Associate': {
    description:
      "HashiCorp, 2023. Backed by production IaC: this site's entire AWS pipeline — including the stats aggregator — is defined in Terraform.",
    id: 'certification:terraform-associate',
    label: 'HashiCorp Terraform Associate',
    validates: 'tool:terraform',
  },
  'Tenable.sc Specialist': {
    description:
      'Tenable, 2023. Vulnerability-management platform specialty from enterprise systems administration at General Atomics.',
    id: 'certification:tenable-sc',
    label: 'Tenable.sc Specialist',
  },
};

/**
 * Responsibility nodes: concrete, metric-carrying highlights extracted from
 * the prose in each TimelineItem. These are the evidence layer of the graph.
 */
const RESPONSIBILITY_NODES: GraphNode[] = [
  {
    description:
      'Led the team that shipped a secure internal chatbot where users self-service their own AI assistants over their own data using RAG.',
    id: 'responsibility:internal-rag-chatbot',
    kind: 'responsibility',
    label: 'Secure internal RAG chatbot',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Designed and implemented an AI agent that searches a massive corpus of supporting documents to generate technical-order data — a 40% reduction in TO authoring time.',
    id: 'responsibility:to-authoring-agent',
    kind: 'responsibility',
    label: 'TO-authoring agent (−40% time)',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Rolled out and supported AI software-development assistants, accelerating development velocity by 50% while maintaining security and trustworthiness.',
    id: 'responsibility:dev-assistant-rollout',
    kind: 'responsibility',
    label: 'AI dev assistants (+50% velocity)',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Served as the subject-matter expert on large language models for the organization — the person teams call before betting on an LLM approach.',
    id: 'responsibility:llm-sme',
    kind: 'responsibility',
    label: 'LLM subject-matter expert',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Brought DevOps and Agile concepts to enterprise IT — automating, innovating and quickly generating value for more than 15,000 end users.',
    id: 'responsibility:it-modernization',
    kind: 'responsibility',
    label: 'IT modernization for 15,000+ users',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Spearheaded the team that implemented generative AI for use throughout the enterprise — the groundwork for the later AI agent program.',
    id: 'responsibility:genai-enablement',
    kind: 'responsibility',
    label: 'Enterprise GenAI enablement',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Personally developed generative-AI applications that improved access to information for technicians and executives.',
    id: 'responsibility:genai-apps',
    kind: 'responsibility',
    label: 'GenAI apps for technicians & execs',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Helped develop new internal tools using Python, JavaScript/jQuery and Mulesoft that significantly improved operational efficiency.',
    id: 'responsibility:internal-tooling',
    kind: 'responsibility',
    label: 'Internal tooling in Python & JS',
    meta: {location: 'Tillster, Inc.'},
  },
  {
    description:
      'Tier-1 helpdesk, systems administrator and automation engineer at once — anticipating end-user needs, responding, then shipping the durable fix.',
    id: 'responsibility:frontline-it',
    kind: 'responsibility',
    label: 'Frontline IT & automation',
    meta: {location: 'Tillster, Inc.'},
  },
  {
    description:
      'Audited dealership compliance across local, state, federal and corporate authorities — resolving failures quickly and advising clients on preventing future violations.',
    id: 'responsibility:compliance-audits',
    kind: 'responsibility',
    label: 'Nationwide compliance audits',
    meta: {location: 'Reynolds & Reynolds'},
  },
  {
    description: 'Supported client marketing strategy and content creation alongside the compliance practice.',
    id: 'responsibility:marketing-content',
    kind: 'responsibility',
    label: 'Marketing strategy & content',
    meta: {location: 'Reynolds & Reynolds'},
  },
];

/**
 * Hand-authored edges (other than the auto-generated skill→group `part-of`
 * set). Kinds: job/responsibility → skill `uses`; cert → skill `earned-via`;
 * responsibility → job `part-of`; chronological `timeline`; loose `related`.
 */
const AUTHORED_EDGES: GraphEdge[] = [
  // Career timeline (chronological spine, oldest → newest).
  {kind: 'timeline', source: 'education:ucsb-psychology', target: 'job:reynolds-compliance-marketing-consultant'},
  {
    kind: 'timeline',
    source: 'job:reynolds-compliance-marketing-consultant',
    target: 'job:tillster-it-strategic-analyst',
  },
  {kind: 'timeline', source: 'job:tillster-it-strategic-analyst', target: 'job:ga-systems-administrator'},
  {kind: 'timeline', source: 'job:ga-systems-administrator', target: 'job:ga-lead-ai-ml-engineer'},

  // Responsibilities → the role they belong to.
  {kind: 'part-of', source: 'responsibility:internal-rag-chatbot', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'part-of', source: 'responsibility:to-authoring-agent', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'part-of', source: 'responsibility:dev-assistant-rollout', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'part-of', source: 'responsibility:llm-sme', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'part-of', source: 'responsibility:it-modernization', target: 'job:ga-systems-administrator'},
  {kind: 'part-of', source: 'responsibility:genai-enablement', target: 'job:ga-systems-administrator'},
  {kind: 'part-of', source: 'responsibility:genai-apps', target: 'job:ga-systems-administrator'},
  {kind: 'part-of', source: 'responsibility:internal-tooling', target: 'job:tillster-it-strategic-analyst'},
  {kind: 'part-of', source: 'responsibility:frontline-it', target: 'job:tillster-it-strategic-analyst'},
  {kind: 'part-of', source: 'responsibility:compliance-audits', target: 'job:reynolds-compliance-marketing-consultant'},
  {kind: 'part-of', source: 'responsibility:marketing-content', target: 'job:reynolds-compliance-marketing-consultant'},

  // Jobs → headline skills used in that role.
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:rag'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:agents'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:langchain-langgraph'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:python'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:azure'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'tool:docker'},
  {kind: 'uses', source: 'job:ga-systems-administrator', target: 'skill:powershell'},
  {kind: 'uses', source: 'job:ga-systems-administrator', target: 'skill:python'},
  {kind: 'uses', source: 'job:ga-systems-administrator', target: 'skill:bash'},
  {kind: 'uses', source: 'job:ga-systems-administrator', target: 'skill:azure'},
  {kind: 'uses', source: 'job:ga-systems-administrator', target: 'tool:ci-cd'},
  {kind: 'uses', source: 'job:ga-systems-administrator', target: 'tool:terraform'},
  {kind: 'uses', source: 'job:tillster-it-strategic-analyst', target: 'skill:python'},
  {kind: 'uses', source: 'job:tillster-it-strategic-analyst', target: 'skill:javascript-typescript'},
  {kind: 'uses', source: 'job:tillster-it-strategic-analyst', target: 'skill:bash'},

  // Responsibilities → the specific skills that delivered them.
  {kind: 'uses', source: 'responsibility:internal-rag-chatbot', target: 'skill:rag'},
  {kind: 'uses', source: 'responsibility:internal-rag-chatbot', target: 'skill:langchain-langgraph'},
  {kind: 'uses', source: 'responsibility:internal-rag-chatbot', target: 'skill:python'},
  {kind: 'uses', source: 'responsibility:internal-rag-chatbot', target: 'skill:azure'},
  {kind: 'uses', source: 'responsibility:to-authoring-agent', target: 'skill:agents'},
  {kind: 'uses', source: 'responsibility:to-authoring-agent', target: 'skill:rag'},
  {kind: 'uses', source: 'responsibility:to-authoring-agent', target: 'skill:langchain-langgraph'},
  {kind: 'uses', source: 'responsibility:to-authoring-agent', target: 'skill:python'},
  {kind: 'uses', source: 'responsibility:dev-assistant-rollout', target: 'skill:agents'},
  {kind: 'uses', source: 'responsibility:dev-assistant-rollout', target: 'tool:ci-cd'},
  {kind: 'uses', source: 'responsibility:llm-sme', target: 'skill:rag'},
  {kind: 'uses', source: 'responsibility:llm-sme', target: 'skill:agents'},
  {kind: 'uses', source: 'responsibility:llm-sme', target: 'skill:learning'},
  {kind: 'uses', source: 'responsibility:it-modernization', target: 'skill:powershell'},
  {kind: 'uses', source: 'responsibility:it-modernization', target: 'skill:bash'},
  {kind: 'uses', source: 'responsibility:it-modernization', target: 'tool:ci-cd'},
  {kind: 'uses', source: 'responsibility:it-modernization', target: 'tool:docker'},
  {kind: 'uses', source: 'responsibility:genai-enablement', target: 'skill:azure'},
  {kind: 'uses', source: 'responsibility:genai-enablement', target: 'skill:agents'},
  {kind: 'uses', source: 'responsibility:genai-apps', target: 'skill:python'},
  {kind: 'uses', source: 'responsibility:genai-apps', target: 'skill:rag'},
  {kind: 'uses', source: 'responsibility:internal-tooling', target: 'skill:python'},
  {kind: 'uses', source: 'responsibility:internal-tooling', target: 'skill:javascript-typescript'},
  {kind: 'uses', source: 'responsibility:frontline-it', target: 'skill:bash'},
  {kind: 'uses', source: 'responsibility:frontline-it', target: 'skill:powershell'},

  // Certifications → the era they were earned in (by year).
  {kind: 'related', source: 'certification:comptia-cysa', target: 'job:tillster-it-strategic-analyst'},
  {kind: 'related', source: 'certification:terraform-associate', target: 'job:ga-systems-administrator'},
  {kind: 'related', source: 'certification:tenable-sc', target: 'job:ga-systems-administrator'},
  {kind: 'related', source: 'certification:aws-saa', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'related', source: 'certification:azure-ai-engineer', target: 'job:ga-lead-ai-ml-engineer'},

  // Cross-skill affinities.
  {kind: 'related', source: 'tool:docker', target: 'tool:kubernetes'},
  {kind: 'related', source: 'tool:terraform', target: 'skill:aws'},
  {kind: 'related', source: 'tool:terraform', target: 'tool:ci-cd'},
  {kind: 'related', source: 'skill:rag', target: 'skill:agents'},
  {kind: 'related', source: 'skill:langchain-langgraph', target: 'skill:agents'},
  {kind: 'related', source: 'skill:aws', target: 'skill:cloudflare'},
  {kind: 'related', source: 'certification:comptia-cysa', target: 'certification:tenable-sc'},
  {kind: 'related', source: 'skill:learning', target: 'education:ucsb-psychology'},
];

/**
 * Every hand-authored details key must still match its data.tsx source item.
 * Without this, rewording a name/title in data.tsx would silently regenerate
 * the node from the slug fallback — dropping its curated id and description.
 * Throws at module init, which surfaces as a build failure during static
 * export (same contract as a dangling edge).
 */
const assertDetailKeysMatch = (mapName: string, keys: Iterable<string>, sourceNames: ReadonlySet<string>): void => {
  for (const key of keys) {
    if (!sourceNames.has(key)) {
      throw new Error(`graphData ${mapName} key "${key}" matches no entry in data.tsx — was the source renamed?`);
    }
  }
};

const buildDerivedNodes = (): {nodes: GraphNode[]; partOfEdges: GraphEdge[]} => {
  assertDetailKeysMatch('JOB_DETAILS', Object.keys(JOB_DETAILS), new Set(experience.map(item => item.title)));
  assertDetailKeysMatch(
    'EDUCATION_DETAILS',
    Object.keys(EDUCATION_DETAILS),
    new Set(education.map(item => item.title)),
  );
  assertDetailKeysMatch('GROUP_DETAILS', Object.keys(GROUP_DETAILS), new Set(skills.map(group => group.name)));
  assertDetailKeysMatch(
    'SKILL_DETAILS',
    Object.keys(SKILL_DETAILS),
    new Set(skills.flatMap(group => group.skills.map(skill => skill.name))),
  );
  assertDetailKeysMatch('CERT_DETAILS', Object.keys(CERT_DETAILS), new Set(certifications.map(cert => cert.name)));

  const nodes: GraphNode[] = [];
  const partOfEdges: GraphEdge[] = [];

  for (const item of experience) {
    const details = JOB_DETAILS[item.title] ?? {
      description: `${item.title} at ${item.location}.`,
      id: `job:${slugify(`${item.location}-${item.title}`)}`,
    };
    nodes.push({
      description: details.description,
      id: details.id,
      kind: 'job',
      label: details.label ?? item.title,
      meta: {date: item.date, location: item.location},
    });
  }

  for (const item of education) {
    const details = EDUCATION_DETAILS[item.title] ?? {
      description: `${item.title} at ${item.location}.`,
      id: `education:${slugify(`${item.location}-${item.title}`)}`,
    };
    nodes.push({
      description: details.description,
      id: details.id,
      kind: 'education',
      label: details.label ?? item.title,
      meta: {date: item.date, location: item.location},
    });
  }

  for (const group of skills) {
    const groupDetails: GroupDetails = GROUP_DETAILS[group.name] ?? {
      description: group.name,
      id: `skillGroup:${slugify(group.name)}`,
    };
    nodes.push({
      description: groupDetails.description,
      id: groupDetails.id,
      kind: 'skillGroup',
      label: groupDetails.label ?? group.name,
    });
    const memberKind = groupDetails.memberKind ?? 'skill';
    for (const skill of group.skills) {
      const details = SKILL_DETAILS[skill.name] ?? {
        description: skill.name,
        id: `${memberKind}:${slugify(skill.name)}`,
      };
      nodes.push({
        description: details.description,
        id: details.id,
        kind: memberKind,
        label: details.label ?? skill.name,
        level: skill.level,
      });
      partOfEdges.push({kind: 'part-of', source: details.id, target: groupDetails.id});
    }
  }

  for (const cert of certifications) {
    const details = CERT_DETAILS[cert.name] ?? {
      description: `${cert.name} — ${cert.issuer}, ${cert.date}.`,
      id: `certification:${slugify(cert.name)}`,
    };
    nodes.push({
      description: details.description,
      id: details.id,
      kind: 'certification',
      label: details.label ?? cert.name,
      meta: {date: cert.date, issuer: cert.issuer},
    });
    if (details.validates) {
      partOfEdges.push({kind: 'earned-via', source: details.id, target: details.validates});
    }
  }

  return {nodes, partOfEdges};
};

const kindRank = new Map(KIND_ORDER.map((kind, index) => [kind, index]));

/**
 * Assemble the full graph: derived + hand-authored nodes, every edge, and a
 * pre-sorted neighbor adjacency map. Pure and deterministic; throws on a
 * dangling edge id, which surfaces as a build failure during static export.
 */
export const buildGraph = (): ResumeGraph => {
  const {nodes: derivedNodes, partOfEdges} = buildDerivedNodes();
  const nodes = [...derivedNodes, ...RESPONSIBILITY_NODES];
  const edges = [...partOfEdges, ...AUTHORED_EDGES];

  const nodeById = new Map(nodes.map(node => [node.id, node]));
  if (nodeById.size !== nodes.length) {
    throw new Error('Duplicate node id in resume graph');
  }

  const adjacency = new Map<string, string[]>(nodes.map(node => [node.id, []]));
  for (const edge of edges) {
    const sourceNeighbors = adjacency.get(edge.source);
    const targetNeighbors = adjacency.get(edge.target);
    if (!sourceNeighbors || !targetNeighbors) {
      throw new Error(`Resume graph edge references unknown node: ${edge.source} -> ${edge.target}`);
    }
    if (!sourceNeighbors.includes(edge.target)) {
      sourceNeighbors.push(edge.target);
    }
    if (!targetNeighbors.includes(edge.source)) {
      targetNeighbors.push(edge.source);
    }
  }

  // Stable cycling order shared by the 3D view, the focus card counter and
  // the accessible tree: kind priority first, then label.
  const byKindThenLabel = (a: string, b: string): number => {
    const nodeA = nodeById.get(a);
    const nodeB = nodeById.get(b);
    if (!nodeA || !nodeB) {
      return 0;
    }
    const rankDelta = (kindRank.get(nodeA.kind) ?? 99) - (kindRank.get(nodeB.kind) ?? 99);
    return rankDelta !== 0 ? rankDelta : nodeA.label.localeCompare(nodeB.label);
  };
  for (const neighbors of adjacency.values()) {
    neighbors.sort(byKindThenLabel);
  }

  return {adjacency, edges, nodeById, nodes};
};

/** Module-level singleton — the memoized graph every renderer shares. */
export const resumeGraph: ResumeGraph = buildGraph();

/** The career timeline (oldest → newest), walked from the hand-authored `timeline` edges. */
export const timelineChain: string[] = (() => {
  const next = new Map<string, string>();
  const hasIncoming = new Set<string>();
  for (const edge of resumeGraph.edges) {
    if (edge.kind === 'timeline') {
      next.set(edge.source, edge.target);
      hasIncoming.add(edge.target);
    }
  }
  const start = [...next.keys()].find(id => !hasIncoming.has(id));
  const chain: string[] = [];
  // The length bound keeps an accidental timeline cycle from hanging the build.
  for (let id = start; id !== undefined && chain.length <= next.size; id = next.get(id)) {
    chain.push(id);
  }
  return chain;
})();

/** The newest job on the timeline — the current role — is pre-focused when /graph loads. */
export const initialFocusId =
  [...timelineChain].reverse().find(id => resumeGraph.nodeById.get(id)?.kind === 'job') ?? resumeGraph.nodes[0].id;
