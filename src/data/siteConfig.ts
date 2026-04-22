import {aboutData, contact, experience, socialLinks} from './data';
import {ContactType} from './dataDef';

const aboutItem = (label: string) => aboutData.aboutItems.find(item => item.label === label)?.text ?? '';
const contactItem = (type: ContactType) => contact.items.find(item => item.type === type);

export const siteConfig = {
  siteUrl: 'https://andrewmalvani.com',
  siteName: 'Andrew Malvani',
  ogImagePath: '/og-image.jpg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  person: {
    name: 'Andrew Malvani',
    jobTitle: experience[0].title,
    location: aboutItem('Location'),
    email: contactItem(ContactType.Email)?.text ?? '',
    alumniOf: aboutItem('Study'),
    worksFor: aboutItem('Employment'),
    sameAs: socialLinks.map(s => s.href),
    // SEO-expanded keyword list; kept separate from data.tsx `skills` so the
    // on-page skill names can stay user-facing ("AWS") while search engines
    // see the fully-qualified form ("Amazon Web Services").
    knowsAbout: [
      'Artificial Intelligence',
      'Machine Learning',
      'Large Language Models',
      'LangChain',
      'LangGraph',
      'Retrieval-Augmented Generation',
      'DevOps',
      'Amazon Web Services',
      'Microsoft Azure',
      'Terraform',
      'Docker',
      'Kubernetes',
      'Python',
    ],
  },
};
