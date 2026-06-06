import {FC, memo} from 'react';

import {certifications, education, experience, SectionId, skills} from '../../../data/data';
import Section from '../../Layout/Section';
import Reveal from '../../Reveal';
import CertificationItem from './CertificationItem';
import ResumeSection from './ResumeSection';
import {SkillGroup} from './Skills';
import TimelineItem from './TimelineItem';

const Resume: FC = memo(() => {
  return (
    <Section sectionId={SectionId.Resume}>
      {/* Section padding lives on the Reveal wrappers: they are the divide-y
          siblings, so first:/last: variants resolve correctly there. */}
      <div className="flex flex-col divide-y divide-neutral-800">
        <Reveal className="py-12 first:pt-0 last:pb-0">
          <ResumeSection title="Work">
            {experience.map((item, index) => (
              <TimelineItem item={item} key={`${item.title}-${index}`} />
            ))}
          </ResumeSection>
        </Reveal>
        <Reveal className="py-12 first:pt-0 last:pb-0">
          <ResumeSection title="Education">
            {education.map((item, index) => (
              <TimelineItem item={item} key={`${item.title}-${index}`} />
            ))}
          </ResumeSection>
        </Reveal>
        <Reveal className="py-12 first:pt-0 last:pb-0">
          <ResumeSection title="Skills">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {skills.map((skillgroup, index) => (
                <SkillGroup key={`${skillgroup.name}-${index}`} skillGroup={skillgroup} />
              ))}
            </div>
          </ResumeSection>
        </Reveal>
        <Reveal className="py-12 first:pt-0 last:pb-0">
          <ResumeSection title="Certifications">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {certifications.map((certification, index) => (
                <CertificationItem certification={certification} key={`${certification.name}-${index}`} />
              ))}
            </div>
          </ResumeSection>
        </Reveal>
      </div>
    </Section>
  );
});

Resume.displayName = 'Resume';
export default Resume;
