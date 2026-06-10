import classNames from 'classnames';
import {FC, memo, PropsWithChildren} from 'react';

import {Skill as SkillType, SkillGroup as SkillGroupType} from '../../../data/dataDef';

export const SkillGroup: FC<PropsWithChildren<{skillGroup: SkillGroupType}>> = memo(({skillGroup}) => {
  const {name, skills} = skillGroup;
  return (
    <div className="flex flex-col gap-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <span className="text-base font-bold text-neutral-100">{name}</span>
      <div className="flex flex-col gap-y-3">
        {skills.map((skill, index) => (
          <Skill key={`${skill.name}-${index}`} skill={skill} />
        ))}
      </div>
    </div>
  );
});

SkillGroup.displayName = 'SkillGroup';

interface Tier {
  label: string;
  /** Number of filled segments (out of 3). */
  segments: number;
}

/**
 * Maps the numeric proficiency from the data into a discrete tier. Levels run
 * 3-10 on a /10 scale; the bands keep the previous bar's intent without the
 * progress-bar language: 8-10 = Expert, 6-7 = Proficient, ≤5 = Familiar.
 */
const tierForLevel = (level: number, max: number): Tier => {
  const scaled = (level / max) * 10;
  if (scaled >= 8) return {label: 'Expert', segments: 3};
  if (scaled >= 6) return {label: 'Proficient', segments: 2};
  return {label: 'Familiar', segments: 1};
};

export const Skill: FC<{skill: SkillType}> = memo(({skill}) => {
  const {name, level, max = 10} = skill;
  const tier = tierForLevel(level, max);

  return (
    <div className="flex items-center justify-between gap-x-3">
      <span className="text-sm font-medium text-neutral-200">{name}</span>
      <div className="flex shrink-0 items-center gap-x-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">{tier.label}</span>
        <div aria-hidden="true" className="flex gap-x-1">
          {[0, 1, 2].map(index => (
            <span
              className={classNames(
                'h-1.5 w-4 rounded-full',
                index < tier.segments ? 'bg-orange-400' : 'bg-neutral-700',
              )}
              key={index}
            />
          ))}
        </div>
      </div>
      <span className="sr-only">
        {name}: {tier.label}
      </span>
    </div>
  );
});

Skill.displayName = 'Skill';
