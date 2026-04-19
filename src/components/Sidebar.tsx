import { useState } from 'react';
import { CountryList } from './CountryList';
import { HeatmapControls } from './HeatmapControls';
import { DisasterControls } from './DisasterControls';
import { useWorldStore } from '../store/worldStore';

type Tab = 'countries' | 'settings' | 'disasters';

export const Sidebar = () => {
  const [tab, setTab] = useState<Tab>('countries');
  const {
    physicsEnabled, setPhysics,
    showNames, setShowNames,
    generateCountry, resetLayout,
  } = useWorldStore();

  return (
    <div className="w-56 h-full flex flex-col bg-ui-panel border-l border-ui-border">
      {/* Tab header */}
      <div className="flex border-b border-ui-border">
        {(['countries', 'settings', 'disasters'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors
              ${tab === t ? 'border-b-2 border-ui-accent text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {t === 'countries' ? '🗺' : t === 'settings' ? '⚙' : '⚡'} {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden p-3">
        {tab === 'countries' && <CountryList />}

        {tab === 'settings' && (
          <div className="space-y-4">
            <HeatmapControls />

            <div className="pt-2 border-t border-ui-border space-y-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Display</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNames}
                  onChange={e => setShowNames(e.target.checked)}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-300">Show country names</span>
              </label>
            </div>

            <div className="pt-2 border-t border-ui-border space-y-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Physics</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={physicsEnabled}
                  onChange={e => setPhysics(e.target.checked)}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-300">Gravity [Space]</span>
              </label>
              <p className="text-xs text-gray-500">Countries fall and collide when enabled</p>
            </div>

            <div className="pt-2 border-t border-ui-border space-y-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Actions</p>
              <button
                onClick={generateCountry}
                className="w-full py-2 bg-purple-800 hover:bg-purple-700 text-white text-xs rounded font-bold transition-colors"
              >
                ✦ Generate Country
              </button>
              <button
                onClick={resetLayout}
                className="w-full py-2 bg-ui-bg hover:bg-ui-border text-gray-300 text-xs rounded transition-colors"
              >
                ↺ Reset Layout
              </button>
            </div>
          </div>
        )}

        {tab === 'disasters' && <DisasterControls />}
      </div>
    </div>
  );
};
