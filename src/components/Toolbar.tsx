import { useWorldStore } from '../store/worldStore';
import type { Tool } from '../types';

const TOOLS: Array<{ id: Tool; icon: string; label: string; key: string }> = [
  { id: 'select', icon: '↗', label: 'Select', key: 'V' },
  { id: 'move', icon: '✥', label: 'Move', key: 'M' },
  { id: 'rotate', icon: '↻', label: 'Rotate', key: 'R' },
  { id: 'scale', icon: '⤢', label: 'Scale', key: 'S' },
  { id: 'delete', icon: '✕', label: 'Delete', key: 'X' },
];

export const Toolbar = () => {
  const { tool, setTool, undo, redo, canUndo, canRedo, selectedIds, mergeSelected } = useWorldStore();

  return (
    <div className="flex flex-col gap-1 p-2 bg-ui-panel border border-ui-border rounded-lg shadow-xl">
      {TOOLS.map(t => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          title={`${t.label} (${t.key})`}
          className={`
            group relative w-10 h-10 rounded-md flex items-center justify-center
            text-lg font-bold transition-all duration-150
            ${tool === t.id
              ? 'bg-ui-accent text-white shadow-lg ring-2 ring-ui-hover'
              : 'bg-ui-bg text-gray-400 hover:bg-ui-border hover:text-white'}
          `}
        >
          {t.icon}
          <span className="
            absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded
            opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50
            transition-opacity duration-100
          ">
            {t.label} <span className="text-gray-400">[{t.key}]</span>
          </span>
        </button>
      ))}

      <div className="w-full h-px bg-ui-border my-1" />

      {/* Merge */}
      {selectedIds.size >= 2 && (
        <button
          onClick={mergeSelected}
          title="Merge selected countries"
          className="w-10 h-10 rounded-md flex items-center justify-center text-lg bg-purple-700 hover:bg-purple-600 text-white transition-colors"
        >
          ⊕
        </button>
      )}

      {/* Undo */}
      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="w-10 h-10 rounded-md flex items-center justify-center text-lg bg-ui-bg text-gray-400 hover:bg-ui-border hover:text-white disabled:opacity-30 transition-colors"
      >
        ↩
      </button>

      {/* Redo */}
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className="w-10 h-10 rounded-md flex items-center justify-center text-lg bg-ui-bg text-gray-400 hover:bg-ui-border hover:text-white disabled:opacity-30 transition-colors"
      >
        ↪
      </button>
    </div>
  );
};
