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
import terraformCert from '../images/portfolio/certs/terraform-badge-mini-associate.svg';
import porfolioImage1 from '../images/portfolio/GitHub__headpic.webp';
import porfolioImage5 from '../images/portfolio/polyscannr.webp';
// import porfolioImage3 from '../images/portfolio/portfolio-10.jpg';
import porfolioImage4 from '../images/portfolio/retirement_site.webp';
import rolefitImage from '../images/portfolio/rolefit.webp';
import porfolioImage2 from '../images/portfolio/website-diagram.webp';
import profilepic from '../images/profilepic.webp';
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
    'Andrew Malvani is an Arizona-based Lead AI/ML Engineer specializing in generative AI and LLM agent platforms, with deep AWS and Azure cloud and DevOps experience.',
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
        I'm an <strong className="text-stone-100">Arizona based Lead AI/ML Engineer</strong> at{' '}
        <strong className="text-stone-100">General Atomics</strong>, where I lead the enterprise AI program — building
        secure LLM and agent platforms used by 10,000+ employees.
      </p>
      <p className="prose-sm text-stone-200 sm:prose-base lg:prose-lg">
        In my free time, you can catch me playing with my <strong className="text-stone-100">cats</strong>, exploring
        nature, or <strong className="text-stone-100">golfing</strong>.
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
  description: `I'm an Arizona-based Lead AI/ML Engineer at General Atomics, where I lead the enterprise AI program for a defense company — a long way from the psychology degree I started with at UC Santa Barbara. Over the past five years I've worked across technology and infrastructure, and I'm finishing a Master's in Computer Science at Georgia Tech along the way. Today I design and ship secure, cost-effective LLM agent platforms on AWS and Azure (certified in both), using orchestration frameworks like LangGraph and Semantic Kernel and agent protocols like MCP and A2A.`,
  aboutItems: [
    {label: 'Location', text: 'Arizona', Icon: MapIcon},
    // {label: 'Age', text: '29', Icon: CalendarIcon},
    {label: 'Nationality', text: 'American (US Citizen)', Icon: FlagIcon},
    {label: 'Interests', text: 'Camping, Motorsports, Golf', Icon: SparklesIcon},
    {label: 'Study', text: 'Georgia Tech & University of California, Santa Barbara', Icon: AcademicCapIcon},
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
        level: 6,
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
    title: 'GitHub',
    description:
      'Where my code lives, including the source for this site. A look at how I build and ship things in the open.',
    url: 'https://github.com/manwithaplandy/react-resume',
    image: porfolioImage1,
  },
  {
    title: 'andrewmalvani.com',
    description: 'This site — a Next.js static export on AWS. Click for the architecture diagram.',
    url: porfolioImage2,
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
      'A retirement planner that runs Monte Carlo simulations so people can stress-test their savings — React, Node.js, and Cloudflare.',
    url: 'https://retire.andrewmalvani.com',
    image: porfolioImage4,
  },
  {
    title: 'Polyscannr',
    description:
      'An AI-powered analysis platform for Polymarket prediction markets, with real-time monitoring, sentiment analysis, and trading signals backed by a transparent track record.',
    url: 'https://polyscannr.com',
    image: porfolioImage5,
  },
  {
    title: 'Personalized AI-driven job board',
    description:
      'Rolefit — an AI-powered job search that scores every role against your background, explains the fit, and generates a résumé tailored to each posting.',
    url: 'https://jobs.andrewmalvani.com',
    image: rolefitImage,
  },
];

/**
 * Resume section
 */
export const education: TimelineItem[] = [
  {
    date: 'Expected 2028',
    location: 'Georgia Tech',
    title: "Master's - Computer Science",
    content: <p />,
  },
  {
    date: 'September 2017',
    location: 'UC Santa Barbara',
    title: "Bachelor's - Psychology",
    content: <p />,
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
            Avoided <strong>$15M/yr</strong> in spend with an in-house, DoD-compliant enterprise AI chatbot (AWS
            Bedrock, Azure AI Foundry, LiteLLM) — now serving{' '}
            <strong>5,000+ monthly and 1,000+ daily active users</strong>.
          </li>
          <li>
            Achieved <strong>4x workflow efficiency</strong> for 10,000+ users with a self-service RAG platform built on
            Azure AI Search, AWS RDS PostgreSQL, and Python.
          </li>
          <li>
            Cut technical order development time by <strong>40%</strong> with agentic search and generation powered by
            GraphRAG on Amazon OpenSearch, Amazon Neptune, and AWS Bedrock.
          </li>
          <li>
            Cut deployment time <strong>from days to minutes</strong> through infrastructure-as-code with
            Terraform/Terragrunt and GitHub Actions CI/CD.
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
          As a Systems Administrator, I modernized the company's IT infrastructure — bringing DevOps and Agile practices
          to automate, innovate, and quickly generate value for 15,000+ end users.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-left">
          <li>Automated software request and deployment processes for endpoints using JFrog Artifactory.</li>
          <li>
            Replaced a manual iOS app build and signing process with GitLab CI/CD, cutting build and signing time{' '}
            <strong>from hours to minutes</strong>.
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
          As an IT Strategic Analyst, I wore three hats — helpdesk, systems administrator, and automation engineer —
          anticipating end-user needs and shipping durable solutions that automated the IT function from the inside.
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
          At Reynolds & Reynolds, our clients were car dealerships across the country. I audited dealership compliance
          across local, state, federal, and corporate authorities and advised clients on marketing strategy.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-left">
          <li>
            Managed a territory of <strong>100+ clients</strong> generating <strong>$1M+</strong> in annual sales.
          </li>
          <li>Resolved compliance failures quickly and advised clients on preventing future violations.</li>
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
];

/**
 * Contact section
 */

export const contact: ContactSection = {
  headerText: 'Get in touch.',
  description:
    'Open to interesting problems in AI and infrastructure — reach out through the form or directly by email.',
  items: [
    {
      type: ContactType.Email,
      text: 'andrewrmalvani@gmail.com',
      href: 'mailto:andrewrmalvani@gmail.com',
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
