import { useState } from 'react';
import { useWorldStore } from '../store/worldStore';

export const DisasterControls = () => {
  const { triggerEarthquake, triggerVolcano, selectedIds } = useWorldStore();
  const [intensity, setIntensity] = useState(0.5);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Disasters</p>

      <div>
        <label className="text-xs text-gray-400 block mb-1">
          Intensity: {Math.round(intensity * 100)}%
        </label>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={intensity}
          onChange={e => setIntensity(Number(e.target.value))}
          className="w-full accent-orange-500"
        />
      </div>

      <button
        onClick={() => triggerEarthquake(intensity)}
        className="w-full px-3 py-2 bg-orange-700 hover:bg-orange-600 text-white text-xs rounded font-bold transition-colors flex items-center justify-center gap-2"
      >
        <span>🌍</span>
        <span>Earthquake!</span>
        {selectedIds.size > 0 && <span className="text-orange-300">(selected)</span>}
      </button>

      <button
        onClick={triggerVolcano}
        className="w-full px-3 py-2 bg-red-800 hover:bg-red-700 text-white text-xs rounded font-bold transition-colors flex items-center justify-center gap-2"
      >
        <span>🌋</span>
        <span>Volcano!</span>
      </button>

      {selectedIds.size > 0 && (
        <p className="text-xs text-gray-500">
          Earthquake will target {selectedIds.size} selected country{selectedIds.size > 1 ? 'ies' : ''}
        </p>
      )}
    </div>
  );
};
