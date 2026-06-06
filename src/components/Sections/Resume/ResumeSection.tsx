import {FC, memo, PropsWithChildren} from 'react';

const ResumeSection: FC<PropsWithChildren<{title: string}>> = memo(({title, children}) => {
  return (
    <div className="grid grid-cols-1 gap-y-4 md:grid-cols-4">
      <div className="col-span-1 flex justify-center md:justify-start">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">{title}</h2>
      </div>
      <div className="col-span-1 flex flex-col md:col-span-3">{children}</div>
    </div>
  );
});

ResumeSection.displayName = 'ResumeSection';
export default ResumeSection;
