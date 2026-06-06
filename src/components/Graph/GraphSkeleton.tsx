import {FC, memo} from 'react';

// Full-viewport placeholder shown while the 3D canvas chunk loads, so the
// headline overlay never jumps when the WebGL scene mounts.
const GraphSkeleton: FC = memo(() => (
  <div
    aria-label="Loading 3D career graph"
    aria-live="polite"
    className="absolute inset-0 flex items-center justify-center bg-neutral-900"
    role="status">
    <div className="flex animate-pulse flex-col items-center gap-y-4">
      <div className="h-24 w-24 rounded-full border-2 border-neutral-700 bg-neutral-800" />
      <div className="h-3 w-40 rounded bg-neutral-800" />
      <div className="h-3 w-28 rounded bg-neutral-800" />
    </div>
    <span className="sr-only">Loading 3D career graph…</span>
  </div>
));

GraphSkeleton.displayName = 'GraphSkeleton';
export default GraphSkeleton;
