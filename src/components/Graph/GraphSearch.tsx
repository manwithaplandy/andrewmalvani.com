import {ChangeEvent, FC, memo, useCallback, useId, useMemo, useState} from 'react';

import {resumeGraph} from '../../data/graphData';

const normalize = (value: string): string => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

const GraphSearch: FC<{onSelect: (id: string) => void}> = memo(({onSelect}) => {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const hasQuery = normalize(query).length > 0;
  const matches = useMemo(() => {
    const term = normalize(query);
    return resumeGraph.nodes.filter(node => normalize(`${node.label} ${node.description}`).includes(term));
  }, [query]);
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value), []);

  return (
    <div aria-label="Career search" className="px-3 py-2 sm:px-6" role="search">
      <label className="block text-sm font-medium text-neutral-200" htmlFor={inputId}>
        Find a role, skill, or achievement
      </label>
      <input
        className="mt-1 w-full rounded-lg border-neutral-600 bg-neutral-900 text-sm text-neutral-100 focus:border-orange-400 focus:ring-orange-400"
        id={inputId}
        onChange={handleChange}
        type="text"
        value={query}
      />
      <p aria-live="polite" className="mt-2 text-xs text-neutral-400">
        {!hasQuery
          ? `${matches.length} career items. Enter a role, skill, or achievement to find a match.`
          : matches.length === 0
            ? 'No results. Try another role, skill, or achievement.'
            : matches.length > 10
              ? `Showing 10 of ${matches.length} results`
              : `${matches.length} result${matches.length === 1 ? '' : 's'}`}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {(hasQuery ? matches.slice(0, 10) : []).map(node => (
          <SearchResult id={node.id} key={node.id} label={node.label} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  );
});

const SearchResult: FC<{id: string; label: string; onSelect: (id: string) => void}> = memo(({id, label, onSelect}) => {
  const handleClick = useCallback(() => onSelect(id), [id, onSelect]);
  return (
    <li className="min-w-0 max-w-full">
      <button
        className="max-w-full break-words rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 text-left text-sm text-neutral-200 [overflow-wrap:anywhere] hover:border-orange-400 hover:text-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        onClick={handleClick}
        type="button">
        {label}
      </button>
    </li>
  );
});

GraphSearch.displayName = 'GraphSearch';
SearchResult.displayName = 'SearchResult';
export default GraphSearch;
