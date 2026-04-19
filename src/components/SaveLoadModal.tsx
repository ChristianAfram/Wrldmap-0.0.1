import { useState, useEffect } from 'react';
import { useWorldStore } from '../store/worldStore';

interface Props {
  onClose: () => void;
}

export const SaveLoadModal = ({ onClose }: Props) => {
  const { saveWorld, loadWorld, deleteWorld, exportWorld, importWorld, loadSavedWorlds, savedWorlds } = useWorldStore();
  const [saveName, setSaveName] = useState('');
  const [tab, setTab] = useState<'save' | 'load' | 'export'>('save');
  const [exportJson, setExportJson] = useState('');
  const [importJson, setImportJson] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadSavedWorlds();
  }, [loadSavedWorlds]);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    await saveWorld(saveName.trim());
    setStatus('Saved!');
    setSaveName('');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleExport = () => {
    setExportJson(exportWorld());
  };

  const handleImport = () => {
    importWorld(importJson);
    setStatus('Imported!');
    setTimeout(() => setStatus(''), 2000);
    onClose();
  };

  const downloadExport = () => {
    const json = exportWorld();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `world-builder-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-ui-panel border border-ui-border rounded-xl shadow-2xl w-96 p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Worlds</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          {(['save', 'load', 'export'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-sm rounded transition-colors capitalize
                ${tab === t ? 'bg-ui-accent text-white' : 'bg-ui-bg text-gray-400 hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'save' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="World name..."
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full px-3 py-2 bg-ui-bg border border-ui-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-ui-accent"
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="w-full py-2 bg-ui-accent hover:bg-ui-hover text-white rounded text-sm font-bold disabled:opacity-50 transition-colors"
            >
              Save World
            </button>
            {status && <p className="text-green-400 text-sm text-center">{status}</p>}
          </div>
        )}

        {tab === 'load' && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {savedWorlds.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No saved worlds yet</p>
            ) : savedWorlds.map(world => (
              <div
                key={world.id}
                className="flex items-center gap-2 p-2 bg-ui-bg rounded hover:bg-ui-border group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{world.name}</p>
                  <p className="text-gray-500 text-xs">{new Date(world.timestamp).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => { loadWorld(world.id); onClose(); }}
                  className="px-2 py-1 bg-ui-accent text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Load
                </button>
                <button
                  onClick={() => deleteWorld(world.id)}
                  className="px-2 py-1 bg-red-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'export' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 py-2 bg-ui-accent hover:bg-ui-hover text-white text-sm rounded font-bold transition-colors"
              >
                Generate JSON
              </button>
              <button
                onClick={downloadExport}
                className="flex-1 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded font-bold transition-colors"
              >
                Download
              </button>
            </div>
            {exportJson && (
              <textarea
                readOnly
                value={exportJson}
                className="w-full h-32 bg-ui-bg text-green-400 text-xs font-mono p-2 rounded border border-ui-border resize-none"
              />
            )}
            <div className="pt-2 border-t border-ui-border">
              <p className="text-xs text-gray-400 mb-2">Import from JSON:</p>
              <textarea
                placeholder="Paste world JSON here..."
                value={importJson}
                onChange={e => setImportJson(e.target.value)}
                className="w-full h-24 bg-ui-bg text-white text-xs font-mono p-2 rounded border border-ui-border resize-none placeholder-gray-600 focus:outline-none focus:border-ui-accent"
              />
              <button
                onClick={handleImport}
                disabled={!importJson.trim()}
                className="w-full mt-2 py-2 bg-purple-700 hover:bg-purple-600 text-white text-sm rounded disabled:opacity-50 transition-colors"
              >
                Import
              </button>
            </div>
            {status && <p className="text-green-400 text-sm text-center">{status}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
