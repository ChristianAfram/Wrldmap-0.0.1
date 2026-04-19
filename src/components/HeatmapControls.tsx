import { useWorldStore } from '../store/worldStore';
import type { HeatmapType } from '../types';

const OPTIONS: Array<{ id: HeatmapType; label: string; icon: string }> = [
  { id: 'none', label: 'None', icon: '○' },
  { id: 'population', label: 'Population', icon: '👥' },
  { id: 'climate', label: 'Climate', icon: '🌡' },
];

export const HeatmapControls = () => {
  const { heatmapType, setHeatmap } = useWorldStore();

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Overlay</p>
      {OPTIONS.map(opt => (
        <button
          key={opt.id}
          onClick={() => setHeatmap(opt.id)}
          className={`
            w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors
            ${heatmapType === opt.id ? 'bg-ui-accent text-white' : 'hover:bg-ui-border text-gray-300'}
          `}
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
};
