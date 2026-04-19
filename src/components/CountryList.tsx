import { useState, useMemo } from 'react';
import { useWorldStore } from '../store/worldStore';

export const CountryList = () => {
  const { countries, selectedIds, setSelected, setHovered } = useWorldStore();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    countries.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [countries, search]
  );

  return (
    <div className="flex flex-col h-full">
      <input
        type="text"
        placeholder="Search countries..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-2 py-1 mb-2 bg-ui-bg border border-ui-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-ui-accent"
      />
      <div className="overflow-y-auto flex-1 space-y-0.5">
        {filtered.map(c => {
          const isSelected = selectedIds.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => setSelected([c.id])}
              onMouseEnter={() => setHovered(c.id)}
              onMouseLeave={() => setHovered(null)}
              className={`
                w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors
                ${isSelected ? 'bg-ui-accent text-white' : 'hover:bg-ui-border text-gray-300'}
              `}
            >
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0 inline-block"
                style={{ backgroundColor: c.color }}
              />
              <span className="truncate">{c.name}</span>
              {c.isGenerated && (
                <span className="ml-auto text-purple-400 flex-shrink-0">✦</span>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-gray-500 text-xs px-2 py-4 text-center">No countries found</p>
        )}
      </div>
      <p className="text-gray-500 text-xs pt-2 border-t border-ui-border">
        {countries.length} countries
      </p>
    </div>
  );
};
