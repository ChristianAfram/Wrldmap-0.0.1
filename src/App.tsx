import { useState } from 'react';
import { WorldCanvas } from './components/WorldCanvas';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { ChallengeHUD } from './components/ChallengeHUD';
import { SaveLoadModal } from './components/SaveLoadModal';
import { ModeSelector } from './components/ModeSelector';
import { useWorldStore } from './store/worldStore';

export const App = () => {
  const [showSave, setShowSave] = useState(false);
  const { isLoading, loadError, countries, mode } = useWorldStore();

  return (
    <div className="w-full h-full flex flex-col bg-ui-bg text-white overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-ui-panel border-b border-ui-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌍</span>
          <h1 className="text-lg font-bold text-white tracking-tight">World Builder</h1>
          <span className="text-xs text-gray-500 bg-ui-bg px-2 py-0.5 rounded">v0.0.1</span>
        </div>

        <ModeSelector />

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{countries.length} countries</span>
          <button
            onClick={() => setShowSave(true)}
            className="px-3 py-1.5 bg-ui-accent hover:bg-ui-hover text-white text-sm rounded font-semibold transition-colors"
          >
            💾 Save / Load
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex-shrink-0 p-2 flex flex-col justify-start">
          <Toolbar />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <WorldCanvas />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-ui-bg/80 z-40">
              <div className="text-center">
                <div className="text-4xl animate-pulse mb-3">🌍</div>
                <p className="text-white font-bold text-lg">Loading World...</p>
                <p className="text-gray-400 text-sm mt-1">Fetching country data</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center bg-ui-bg/90 z-40">
              <div className="text-center max-w-sm">
                <p className="text-red-400 text-4xl mb-3">⚠</p>
                <p className="text-white font-bold">Failed to load map data</p>
                <p className="text-gray-400 text-sm mt-2">{loadError}</p>
                <p className="text-gray-500 text-xs mt-2">Check your internet connection and refresh.</p>
              </div>
            </div>
          )}

          {/* Challenge HUD */}
          <ChallengeHUD />

          {/* Keyboard shortcuts hint */}
          {!isLoading && !loadError && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center pointer-events-none">
              <p className="text-xs text-gray-600">
                Drag to move • Right-click drag to pan • Scroll to zoom • V M R S X — tool shortcuts
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <Sidebar />
      </div>

      {/* Modals */}
      {showSave && <SaveLoadModal onClose={() => setShowSave(false)} />}
    </div>
  );
};
