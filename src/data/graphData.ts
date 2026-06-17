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
      'Managed a territory of 100+ car-dealership clients generating $1M+ in annual sales — auditing compliance with local, state, federal and corporate authorities, resolving violations quickly, and supporting marketing strategy and content.',
    id: 'job:reynolds-compliance-marketing-consultant',
    label: 'Compliance & Marketing Consultant',
  },
  'IT Strategic Analyst': {
    description:
      'Tier-1 helpdesk, systems administrator and automation engineer in one. Cut onboarding/offboarding time 90% with automated account provisioning, stood up a centralized MuleSoft API management system, and built internal tools with Python and JavaScript.',
    id: 'job:tillster-it-strategic-analyst',
    label: 'IT Strategic Analyst',
  },
  'Lead AI/ML Engineer': {
    description:
      "Leads General Atomics' enterprise AI program as the organization's LLM SME: a DoD-compliant enterprise AI chatbot avoiding $15M/yr in spend, a self-service RAG platform delivering 4x efficiency for 10,000+ users, a self-service agent platform built on MCP, and AI dev assistants that raised developer productivity by 30%.",
    id: 'job:ga-lead-ai-ml-engineer',
    label: 'Lead AI/ML Engineer',
  },
  'Systems Administrator': {
    description:
      'Modernized IT infrastructure for 15,000+ end users with DevOps and Agile automation — automating software request and deployment for endpoints with JFrog Artifactory and replacing a manual iOS build/signing process with GitLab CI/CD.',
    id: 'job:ga-systems-administrator',
    label: 'Systems Administrator',
  },
};

const EDUCATION_DETAILS: Record<string, DerivedDetails> = {
  "Bachelor's - Psychology": {
    description:
      'B.A. in Psychology from UC Santa Barbara (2017) — the people-first foundation behind a self-taught engineering career.',
    id: 'education:ucsb-psychology',
    label: 'B.A. Psychology, UCSB',
  },
  "Master's - Computer Science": {
    description:
      'M.S. in Computer Science at Georgia Tech (expected 2028) — formalizing the theory behind the production AI engineering practiced daily at General Atomics.',
    id: 'education:gatech-ms-cs',
    label: 'M.S. Computer Science, Georgia Tech',
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
  'AWS Bedrock': {
    description:
      "Model backbone of General Atomics' DoD-compliant enterprise AI chatbot ($15M/yr spend avoided) and the GraphRAG technical order pipeline alongside OpenSearch and Neptune.",
    id: 'skill:aws-bedrock',
    label: 'AWS Bedrock',
  },
  Agents: {
    description:
      'Designed and shipped the autonomous agent that cut technical order authoring time by 40% at General Atomics by searching a massive corpus of supporting documents.',
    id: 'skill:agents',
    label: 'AI Agents',
  },
  Azure: {
    description:
      'Azure AI Engineer certified. Deployed Azure-hosted AI services as part of the enterprise generative-AI rollout at General Atomics.',
    id: 'skill:azure',
    label: 'Azure',
  },
  'Azure AI Foundry': {
    description:
      'Azure-side model platform behind the DoD-compliant enterprise AI chatbot at General Atomics — paired with AWS Bedrock and LiteLLM for multi-cloud model access.',
    id: 'skill:azure-ai-foundry',
    label: 'Azure AI Foundry',
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
  'Claude Code & SDK': {
    description:
      'Built autonomous multi-agent automation on the Claude SDK at General Atomics and led the AI dev-tools rollout — Claude Code included — that raised developer productivity by 30%.',
    id: 'skill:claude-code-sdk',
    label: 'Claude Code & SDK',
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
  GraphRAG: {
    description:
      'Graph-augmented retrieval over Amazon OpenSearch and Neptune powering agentic technical order search and generation at General Atomics — a 40% cut in TO development time.',
    id: 'skill:graphrag',
    label: 'GraphRAG',
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
  LiteLLM: {
    description:
      "Unified model-routing layer of General Atomics' enterprise AI chatbot — one gateway across AWS Bedrock and Azure AI Foundry, keeping the $15M/yr in-house platform provider-agnostic.",
    id: 'skill:litellm',
    label: 'LiteLLM',
  },
  MCP: {
    description:
      'Powers the self-service agent platform at General Atomics, built on the Model Context Protocol with a centralized authn/authz framework connecting agents to internal systems.',
    id: 'skill:mcp',
    label: 'MCP',
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
  'Semantic Kernel': {
    description:
      'Orchestration framework used alongside LangGraph and the Claude SDK in the autonomous multi-agent systems that eliminated 90% of manual processing across key workflows at General Atomics.',
    id: 'skill:semantic-kernel',
    label: 'Semantic Kernel',
  },
  Terraform: {
    description:
      "HashiCorp-certified. Defines this site's entire AWS footprint — CloudFront, Lambda, DynamoDB, IAM — as reviewable code in the site's public repo.",
    id: 'tool:terraform',
    label: 'Terraform',
  },
  Terragrunt: {
    description:
      'Layered on Terraform to keep enterprise IaC DRY across environments at General Atomics — part of the pipeline that cut deployment time from days to minutes with GitHub Actions CI/CD.',
    id: 'tool:terragrunt',
    label: 'Terragrunt',
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
  'HashiCorp Terraform Associate': {
    description:
      "HashiCorp, 2023. Backed by production IaC: this site's entire AWS pipeline — including the stats aggregator — is defined in Terraform.",
    id: 'certification:terraform-associate',
    label: 'HashiCorp Terraform Associate',
    validates: 'tool:terraform',
  },
};

/**
 * Responsibility nodes: concrete, metric-carrying highlights extracted from
 * the prose in each TimelineItem. These are the evidence layer of the graph.
 */
const RESPONSIBILITY_NODES: GraphNode[] = [
  {
    description:
      'Built an in-house, DoD-compliant enterprise AI chatbot on AWS Bedrock, Azure AI Foundry and LiteLLM — avoiding $15M/yr in external spend and now serving 5,000+ monthly and 1,000+ daily active users.',
    id: 'responsibility:internal-rag-chatbot',
    kind: 'responsibility',
    label: 'Enterprise AI chatbot (−$15M/yr)',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Shipped a self-service RAG platform for 10,000+ users on Azure AI Search, AWS RDS PostgreSQL and Python — a 4x improvement in workflow efficiency.',
    id: 'responsibility:self-service-rag-platform',
    kind: 'responsibility',
    label: 'Self-service RAG platform (4x, 10k+ users)',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Built a self-service agent platform on MCP with a centralized authentication/authorization framework integrated with internal systems — letting teams stand up governed agents against company data.',
    id: 'responsibility:agent-platform',
    kind: 'responsibility',
    label: 'Self-service agent platform (MCP)',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Designed and implemented agentic search and generation with GraphRAG over Amazon OpenSearch, Amazon Neptune and AWS Bedrock — a 40% reduction in technical order development time.',
    id: 'responsibility:to-authoring-agent',
    kind: 'responsibility',
    label: 'TO-authoring agent (−40% time)',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Cut deployment time from days to minutes with infrastructure-as-code on Terraform and Terragrunt, deployed through GitHub Actions CI/CD pipelines.',
    id: 'responsibility:iac-cicd',
    kind: 'responsibility',
    label: 'IaC + CI/CD (days→minutes)',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Eliminated 90% of manual processing across key workflows with autonomous multi-agent systems built on Azure Durable Functions, Python, LangGraph, Semantic Kernel and the Claude SDK.',
    id: 'responsibility:multi-agent-automation',
    kind: 'responsibility',
    label: 'Multi-agent automation (−90% manual work)',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Rolled out AI software-development tools and integrated them into the SDLC — a 30% boost in developer productivity while maintaining security and trustworthiness.',
    id: 'responsibility:dev-assistant-rollout',
    kind: 'responsibility',
    label: 'AI dev assistants (+30% productivity)',
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
      'Automated software request and deployment processes for endpoints using JFrog Artifactory — replacing manual handling with self-service distribution.',
    id: 'responsibility:software-deployment-automation',
    kind: 'responsibility',
    label: 'Endpoint software deployment automation',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Replaced a manual iOS app build and signing process with GitLab CI/CD — cutting build and signing time from hours to minutes.',
    id: 'responsibility:ios-cicd',
    kind: 'responsibility',
    label: 'iOS build/sign CI/CD (hours→minutes)',
    meta: {location: 'General Atomics'},
  },
  {
    description:
      'Automated account provisioning across all company applications — cutting onboarding and offboarding time by 90%.',
    id: 'responsibility:onboarding-automation',
    kind: 'responsibility',
    label: 'Onboarding automation (−90% time)',
    meta: {location: 'Tillster, Inc.'},
  },
  {
    description:
      'Implemented a centralized MuleSoft API management system, improving API discoverability, security and auditability across the company.',
    id: 'responsibility:api-management',
    kind: 'responsibility',
    label: 'MuleSoft API management',
    meta: {location: 'Tillster, Inc.'},
  },
  {
    description:
      'Helped develop new internal tools using Python and JavaScript/jQuery that significantly improved operational efficiency.',
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
      'Managed a territory of 100+ dealership clients generating $1M+ in annual sales — auditing compliance across local, state, federal and corporate authorities, resolving failures quickly and advising on prevention.',
    id: 'responsibility:compliance-audits',
    kind: 'responsibility',
    label: 'Compliance audits (100+ clients, $1M+ sales)',
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
  {kind: 'part-of', source: 'responsibility:self-service-rag-platform', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'part-of', source: 'responsibility:agent-platform', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'part-of', source: 'responsibility:to-authoring-agent', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'part-of', source: 'responsibility:iac-cicd', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'part-of', source: 'responsibility:multi-agent-automation', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'part-of', source: 'responsibility:dev-assistant-rollout', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'part-of', source: 'responsibility:llm-sme', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'part-of', source: 'responsibility:onboarding-automation', target: 'job:tillster-it-strategic-analyst'},
  {kind: 'part-of', source: 'responsibility:api-management', target: 'job:tillster-it-strategic-analyst'},
  {kind: 'part-of', source: 'responsibility:it-modernization', target: 'job:ga-systems-administrator'},
  {kind: 'part-of', source: 'responsibility:software-deployment-automation', target: 'job:ga-systems-administrator'},
  {kind: 'part-of', source: 'responsibility:ios-cicd', target: 'job:ga-systems-administrator'},
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
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:aws'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:mcp'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:graphrag'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:aws-bedrock'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:azure-ai-foundry'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:litellm'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:semantic-kernel'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'skill:claude-code-sdk'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'tool:terraform'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'tool:terragrunt'},
  {kind: 'uses', source: 'job:ga-lead-ai-ml-engineer', target: 'tool:ci-cd'},
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
  {kind: 'uses', source: 'responsibility:internal-rag-chatbot', target: 'skill:aws-bedrock'},
  {kind: 'uses', source: 'responsibility:internal-rag-chatbot', target: 'skill:azure-ai-foundry'},
  {kind: 'uses', source: 'responsibility:internal-rag-chatbot', target: 'skill:litellm'},
  {kind: 'uses', source: 'responsibility:self-service-rag-platform', target: 'skill:rag'},
  {kind: 'uses', source: 'responsibility:self-service-rag-platform', target: 'skill:python'},
  {kind: 'uses', source: 'responsibility:self-service-rag-platform', target: 'skill:azure'},
  {kind: 'uses', source: 'responsibility:self-service-rag-platform', target: 'skill:aws'},
  {kind: 'uses', source: 'responsibility:agent-platform', target: 'skill:mcp'},
  {kind: 'uses', source: 'responsibility:agent-platform', target: 'skill:agents'},
  {kind: 'uses', source: 'responsibility:agent-platform', target: 'skill:python'},
  {kind: 'uses', source: 'responsibility:to-authoring-agent', target: 'skill:agents'},
  {kind: 'uses', source: 'responsibility:to-authoring-agent', target: 'skill:rag'},
  {kind: 'uses', source: 'responsibility:to-authoring-agent', target: 'skill:langchain-langgraph'},
  {kind: 'uses', source: 'responsibility:to-authoring-agent', target: 'skill:python'},
  {kind: 'uses', source: 'responsibility:to-authoring-agent', target: 'skill:graphrag'},
  {kind: 'uses', source: 'responsibility:to-authoring-agent', target: 'skill:aws-bedrock'},
  {kind: 'uses', source: 'responsibility:to-authoring-agent', target: 'skill:aws'},
  {kind: 'uses', source: 'responsibility:iac-cicd', target: 'tool:terraform'},
  {kind: 'uses', source: 'responsibility:iac-cicd', target: 'tool:terragrunt'},
  {kind: 'uses', source: 'responsibility:iac-cicd', target: 'tool:ci-cd'},
  {kind: 'uses', source: 'responsibility:multi-agent-automation', target: 'skill:langchain-langgraph'},
  {kind: 'uses', source: 'responsibility:multi-agent-automation', target: 'skill:semantic-kernel'},
  {kind: 'uses', source: 'responsibility:multi-agent-automation', target: 'skill:claude-code-sdk'},
  {kind: 'uses', source: 'responsibility:multi-agent-automation', target: 'skill:python'},
  {kind: 'uses', source: 'responsibility:multi-agent-automation', target: 'skill:azure'},
  {kind: 'uses', source: 'responsibility:dev-assistant-rollout', target: 'skill:agents'},
  {kind: 'uses', source: 'responsibility:dev-assistant-rollout', target: 'tool:ci-cd'},
  {kind: 'uses', source: 'responsibility:dev-assistant-rollout', target: 'skill:claude-code-sdk'},
  {kind: 'uses', source: 'responsibility:llm-sme', target: 'skill:rag'},
  {kind: 'uses', source: 'responsibility:llm-sme', target: 'skill:agents'},
  {kind: 'uses', source: 'responsibility:it-modernization', target: 'skill:powershell'},
  {kind: 'uses', source: 'responsibility:it-modernization', target: 'skill:bash'},
  {kind: 'uses', source: 'responsibility:it-modernization', target: 'tool:ci-cd'},
  {kind: 'uses', source: 'responsibility:it-modernization', target: 'tool:docker'},
  {kind: 'uses', source: 'responsibility:software-deployment-automation', target: 'tool:ci-cd'},
  {kind: 'uses', source: 'responsibility:software-deployment-automation', target: 'skill:powershell'},
  {kind: 'uses', source: 'responsibility:ios-cicd', target: 'tool:ci-cd'},
  {kind: 'uses', source: 'responsibility:ios-cicd', target: 'skill:bash'},
  {kind: 'uses', source: 'responsibility:onboarding-automation', target: 'skill:python'},
  {kind: 'uses', source: 'responsibility:onboarding-automation', target: 'tool:ci-cd'},
  {kind: 'uses', source: 'responsibility:api-management', target: 'skill:javascript-typescript'},
  {kind: 'uses', source: 'responsibility:internal-tooling', target: 'skill:python'},
  {kind: 'uses', source: 'responsibility:internal-tooling', target: 'skill:javascript-typescript'},
  {kind: 'uses', source: 'responsibility:frontline-it', target: 'skill:bash'},
  {kind: 'uses', source: 'responsibility:frontline-it', target: 'skill:powershell'},

  // Certifications → the era they were earned in (by year).
  {kind: 'related', source: 'certification:terraform-associate', target: 'job:ga-systems-administrator'},
  {kind: 'related', source: 'certification:aws-saa', target: 'job:ga-lead-ai-ml-engineer'},
  {kind: 'related', source: 'certification:azure-ai-engineer', target: 'job:ga-lead-ai-ml-engineer'},

  // Cross-skill affinities.
  {kind: 'related', source: 'tool:docker', target: 'tool:kubernetes'},
  {kind: 'related', source: 'tool:terraform', target: 'skill:aws'},
  {kind: 'related', source: 'tool:terraform', target: 'tool:ci-cd'},
  {kind: 'related', source: 'skill:rag', target: 'skill:agents'},
  {kind: 'related', source: 'skill:langchain-langgraph', target: 'skill:agents'},
  {kind: 'related', source: 'skill:graphrag', target: 'skill:rag'},
  {kind: 'related', source: 'skill:mcp', target: 'skill:agents'},
  {kind: 'related', source: 'skill:aws-bedrock', target: 'skill:aws'},
  {kind: 'related', source: 'skill:azure-ai-foundry', target: 'skill:azure'},
  {kind: 'related', source: 'tool:terragrunt', target: 'tool:terraform'},
  {kind: 'related', source: 'skill:litellm', target: 'skill:aws-bedrock'},
  {kind: 'related', source: 'skill:aws', target: 'skill:cloudflare'},
  {kind: 'related', source: 'education:gatech-ms-cs', target: 'job:ga-lead-ai-ml-engineer'},
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
