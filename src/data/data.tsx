import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  BuildingOffice2Icon,
  // CalendarIcon,
  CubeTransparentIcon,
  FlagIcon,
  MapIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import GithubIcon from '../components/Icon/GithubIcon';
// import InstagramIcon from '../components/Icon/InstagramIcon';
import LinkedInIcon from '../components/Icon/LinkedInIcon';
// import StackOverflowIcon from '../components/Icon/StackOverflowIcon';
// import TwitterIcon from '../components/Icon/TwitterIcon';
import heroImage from '../images/header-background.webp';
// Certification images
import awsCert from '../images/portfolio/certs/aws_saa.webp';
import azureCert from '../images/portfolio/certs/azure_ai_eng.svg';
import comptiaSpec from '../images/portfolio/certs/cysa.png';
import tenableSpec from '../images/portfolio/certs/tenablesc.webp';
import terraformCert from '../images/portfolio/certs/terraform-badge-mini-associate.svg';
import porfolioImage1 from '../images/portfolio/GitHub__headpic.jpg';
// import porfolioImage3 from '../images/portfolio/portfolio-10.jpg';
import porfolioImage4 from '../images/portfolio/retirement_site.png';
import porfolioImage2 from '../images/portfolio/website-diagram.png';
import profilepic from '../images/profilepic.jpg';
import {
  About,
  Certification,
  ContactSection,
  ContactType,
  Hero,
  HomepageMeta,
  PortfolioItem,
  SkillGroup,
  Social,
  TimelineItem,
} from './dataDef';

/**
 * Page meta data
 */
export const homePageMeta: HomepageMeta = {
  title: 'Andrew Malvani — Lead AI/ML Engineer',
  description:
    'Andrew Malvani is a San Diego-based Lead AI/ML Engineer specializing in generative AI, LLM agents, cloud architecture, and DevOps across AWS and Azure.',
};

/**
 * Section definition
 */
export const SectionId = {
  Hero: 'hero',
  About: 'about',
  Contact: 'contact',
  Portfolio: 'portfolio',
  Resume: 'resume',
  Skills: 'skills',
  Stats: 'stats',
} as const;

export type SectionId = (typeof SectionId)[keyof typeof SectionId];

/**
 * Hero section
 */
export const heroData: Hero = {
  imageSrc: heroImage,
  name: `I'm Andrew.`,
  description: (
    <>
      <p className="prose-sm text-stone-200 sm:prose-base lg:prose-lg">
        I'm a San Diego based <strong className="text-stone-100">AI/ML Engineer</strong>, currently working at{' '}
        <strong className="text-stone-100">General Atomics</strong> driving innovation by harnessing data and AI to
        optimize and transform company operations, enhancing efficiency and delivering actionable insights.
      </p>
      <p className="prose-sm text-stone-200 sm:prose-base lg:prose-lg">
        In my free time, you can catch me improving my <strong className="text-stone-100">engineering skills</strong>,
        playing with my <strong className="text-stone-100">cats</strong>, exploring nature, or{' '}
        <strong className="text-stone-100">golfing</strong>.
      </p>
    </>
  ),
  actions: [
    {
      href: '/assets/resume.pdf',
      text: 'Resume',
      primary: true,
      download: true,
      Icon: ArrowDownTrayIcon,
    },
    {
      href: '/graph',
      text: 'Career Graph',
      primary: false,
      Icon: CubeTransparentIcon,
    },
    {
      href: `#${SectionId.Contact}`,
      text: 'Contact',
      primary: false,
    },
  ],
};

/**
 * About section
 */
export const aboutData: About = {
  profileImageSrc: profilepic,
  description: `I'm a Software Engineer currently pursuing a Master's degree in Computer Science with over 5 years of experience in the IT industry, with a focus on DevOps and AI. My expertise lies in designing, implementing, and managing cloud-based and self-hosted AI Agents to optimize company operations in a trustworthy, transparent, and cost-effective manner. I am proficient in AWS and Azure services, with certifications in both. I have experience using LLM orchestration frameworks like LangChain, LangGraph, Semantic Kernel, LlamaIndex, AutoGen, and CrewAI to orchestrate AI-powered workfows and autonomous AI agents. I also have experience with LLM protocols like MCP and A2A enabling agents to use external tools, and coordinate with other agents to complete tasks on behalf of users.`,
  aboutItems: [
    {label: 'Location', text: 'San Diego, CA', Icon: MapIcon},
    // {label: 'Age', text: '29', Icon: CalendarIcon},
    {label: 'Nationality', text: 'American', Icon: FlagIcon},
    {label: 'Interests', text: 'Camping, Motorsports, Golf', Icon: SparklesIcon},
    {label: 'Study', text: 'University of California, Santa Barbara', Icon: AcademicCapIcon},
    {label: 'Employment', text: 'General Atomics', Icon: BuildingOffice2Icon},
  ],
};

/**
 * Skills section
 */
export const skills: SkillGroup[] = [
  {
    name: 'DevOps Tools',
    skills: [
      {
        name: 'Docker',
        level: 9,
      },
      {
        name: 'Terraform',
        level: 8,
      },
      {
        name: 'Kubernetes',
        level: 4,
      },
      {
        name: 'CI/CD',
        level: 9,
      },
      {
        name: 'Terragrunt',
        level: 7,
      },
    ],
  },
  {
    name: 'Coding Languages',
    skills: [
      {
        name: 'Python',
        level: 8,
      },
      {
        name: 'Javascript & Typescript (Node, React)',
        level: 5,
      },
      {
        name: 'Bash',
        level: 6,
      },
      {
        name: 'Powershell',
        level: 5,
      },
    ],
  },
  {
    name: 'Generative AI Skills',
    skills: [
      {
        name: 'RAG',
        level: 9,
      },
      {
        name: 'Agents',
        level: 9,
      },
      {
        name: 'LangChain & LangGraph',
        level: 7,
      },
      {
        name: 'MCP',
        level: 9,
      },
      {
        name: 'GraphRAG',
        level: 6,
      },
      {
        name: 'Semantic Kernel',
        level: 7,
      },
      {
        name: 'LiteLLM',
        level: 8,
      },
      {
        name: 'Claude Code & SDK',
        level: 9,
      },
    ],
  },
  {
    name: 'Cloud Services',
    skills: [
      {
        name: 'AWS',
        level: 7,
      },
      {
        name: 'Azure',
        level: 8,
      },
      {
        name: 'AWS Bedrock',
        level: 8,
      },
      {
        name: 'Azure AI Foundry',
        level: 8,
      },
      {
        name: 'GCP',
        level: 3,
      },
      {
        name: 'Cloudflare',
        level: 5,
      },
    ],
  },
];

/**
 * Portfolio section
 */
export const portfolioItems: PortfolioItem[] = [
  {
    title: 'Github',
    description: 'View my code projects, including this website, on Github.',
    url: 'https://github.com/manwithaplandy/react-resume',
    image: porfolioImage1,
  },
  {
    title: 'andrewmalvani.com',
    description: 'This website, fully hosted on AWS, built with Next.js. Click for an architecture diagram.',
    url: 'https://drive.google.com/file/d/1L__W0DVnXuihCFFZveYC-0zdts5VnorR/view?usp=sharing',
    image: porfolioImage2,
  },
  // {
  //   title: 'A funny domain I registered',
  //   description: 'Click for a fun surprise.',
  //   url: 'https://thiswebsitehatesyou.com',
  //   image: porfolioImage3,
  // },
  {
    title: 'Retirement Simulations',
    description:
      'A retirement planning website built using a React frontend and Node.js backend, hosted using Cloudflare.',
    url: 'https://retire.andrewmalvani.com',
    image: porfolioImage4,
  },
];

/**
 * Resume section
 */
export const education: TimelineItem[] = [
  {
    date: 'In Progress',
    location: 'Georgia Tech',
    title: "Master's - Computer Science",
    content: <p></p>,
  },
  {
    date: 'September 2017',
    location: 'UC Santa Barbara',
    title: "Bachelor's - Psychology",
    content: <p></p>,
  },
];

export const experience: TimelineItem[] = [
  {
    date: 'June 2024 - Present',
    location: 'General Atomics',
    title: 'Lead AI/ML Engineer',
    content: (
      <>
        <p>
          As the Lead AI/ML Engineer at General Atomics, I lead the enterprise AI program and serve as the
          organization's subject-matter expert on LLMs — designing, building, and shipping secure generative-AI
          platforms that transform company operations.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-left">
          <li>
            Avoided <strong>$15M/yr</strong> in spend by developing an in-house, DoD-compliant enterprise AI chatbot
            using AWS Bedrock, Azure AI Foundry, and LiteLLM.
          </li>
          <li>
            Achieved <strong>4x workflow efficiency</strong> for 10,000+ users with a self-service RAG platform built on
            Azure AI Search, AWS RDS PostgreSQL, and Python.
          </li>
          <li>
            Delivered <strong>$50M ROI</strong> with a self-service agent platform using MCP and a centralized
            authentication/authorization framework integrated with internal systems.
          </li>
          <li>
            Cut technical-order development time by <strong>40%</strong> with agentic search and generation powered by
            GraphRAG on Amazon OpenSearch, Amazon Neptune, and AWS Bedrock.
          </li>
          <li>
            Reduced deployment time by <strong>90%</strong> through infrastructure-as-code with Terraform/Terragrunt and
            GitHub Actions CI/CD.
          </li>
          <li>
            Eliminated <strong>90%</strong> of manual processing across key workflows with autonomous multi-agent
            systems built on Azure Durable Functions, Python, LangGraph, Semantic Kernel, and the Claude SDK.
          </li>
          <li>
            Boosted developer productivity by <strong>30%</strong> by rolling out AI development tools and integrating
            them into the SDLC while maintaining security and trustworthiness.
          </li>
        </ul>
      </>
    ),
  },
  {
    date: 'February 2023 - June 2024',
    location: 'General Atomics',
    title: 'Systems Administrator',
    content: (
      <>
        <p>
          Working as a Systems Administrator, I was tasked with improving and modernizing the company's IT
          infrastructure — bringing concepts of DevOps and Agile development to automate, innovate, and quickly generate
          value for over 15,000 end users.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-left">
          <li>
            Spearheaded the team that implemented generative AI across the enterprise — the groundwork for the company's
            AI agent program.
          </li>
          <li>
            Personally developed generative AI-powered applications that improved access to information for technicians
            and executives.
          </li>
        </ul>
      </>
    ),
  },
  {
    date: 'October 2021 - February 2023',
    location: 'Tillster, Inc.',
    title: 'IT Strategic Analyst',
    content: (
      <>
        <p>
          As an IT strategic analyst, it was my job to be tier 1 helpdesk, systems administrator, and automation
          engineer all at once — anticipating the needs of end users, responding to them, and implementing durable
          solutions.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-left">
          <li>
            Reduced onboarding and offboarding time by <strong>90%</strong> by automating account provisioning across
            all company applications.
          </li>
          <li>
            Implemented a centralized MuleSoft API management system, improving API discoverability, security, and
            auditability.
          </li>
          <li>Developed internal tools using Python and JavaScript that significantly improved team efficiency.</li>
        </ul>
      </>
    ),
  },
  {
    date: 'April 2018 - October 2021',
    location: 'Reynolds & Reynolds',
    title: 'Compliance & Marketing Consultant',
    content: (
      <>
        <p>
          At Reynolds & Reynolds, our clients were car dealerships across the country. I was tasked with auditing their
          compliance with all relevant authorities and advising them on marketing strategy.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-left">
          <li>
            Managed a territory of <strong>100+ clients</strong> generating <strong>$1M+</strong> in annual sales.
          </li>
          <li>
            Performed compliance audits across local, state, federal, and corporate authorities — resolving failures
            quickly and advising clients on preventing future violations.
          </li>
          <li>Supported client marketing strategy and content creation alongside the compliance practice.</li>
        </ul>
      </>
    ),
  },
];

export const certifications: Certification[] = [
  {
    name: 'AWS Solutions Architect Associate',
    issuer: 'Amazon Web Services',
    date: '2024',
    image: awsCert,
  },
  {
    name: 'HashiCorp Terraform Associate',
    issuer: 'HashiCorp',
    date: '2023',
    image: terraformCert,
  },
  {
    name: 'Azure AI Engineer',
    issuer: 'Microsoft',
    date: '2025',
    image: azureCert,
  },
  {
    name: 'CompTIA CySA+',
    issuer: 'CompTIA',
    date: '2022',
    image: comptiaSpec,
  },
  {
    name: 'Tenable.sc Specialist',
    issuer: 'Tenable',
    date: '2023',
    image: tenableSpec,
  },
];

/**
 * Contact section
 */

export const contact: ContactSection = {
  headerText: 'Get in touch.',
  description:
    'For further inquiries or if you have any questions about my services, please feel free to contact me using this form or the information below. I look forward to hearing from you soon.',
  items: [
    {
      type: ContactType.Email,
      text: 'andrewrmalvani@gmail.com',
      href: 'mailto:andrewrmalvani@gmail.com',
    },
    {
      type: ContactType.Location,
      text: 'San Diego, CA',
      href: 'https://maps.app.goo.gl/MsKa7QkkztT6s22u7',
    },
    {
      type: ContactType.Github,
      text: 'manwithaplandy',
      href: 'https://github.com/manwithaplandy',
    },
  ],
};

/**
 * Social items
 */
export const socialLinks: Social[] = [
  {label: 'Github', Icon: GithubIcon, href: 'https://github.com/manwithaplandy'},
  {label: 'LinkedIn', Icon: LinkedInIcon, href: 'https://www.linkedin.com/in/andrewmalvani'},
];
