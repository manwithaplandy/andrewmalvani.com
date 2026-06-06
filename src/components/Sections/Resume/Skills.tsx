import {FC, memo, PropsWithChildren, useEffect, useMemo, useRef, useState} from 'react';

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

export const Skill: FC<{skill: SkillType}> = memo(({skill}) => {
  const {name, level, max = 10} = skill;
  const percentage = useMemo(() => Math.round((level / max) * 100), [level, max]);
  const ref = useRef<HTMLDivElement>(null);
  const [isFilled, setIsFilled] = useState(true);

  // Animate the bar filling from 0 to its level when it scrolls into view.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    setIsFilled(false);
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setIsFilled(true);
          observer.disconnect();
        }
      },
      {rootMargin: '0px 0px -10% 0px'},
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-y-1" ref={ref}>
      <span className="text-sm font-medium text-neutral-200">{name}</span>
      <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-[width] duration-1000 ease-out"
          style={{width: isFilled ? `${percentage}%` : '0%'}}
        />
      </div>
      <span className="sr-only">
        {name}: {level} out of {max}
      </span>
    </div>
  );
});

Skill.displayName = 'Skill';
