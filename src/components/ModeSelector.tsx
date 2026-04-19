import { useWorldStore } from '../store/worldStore';

export const ModeSelector = () => {
  const { mode, startChallenge, setMode, resetLayout } = useWorldStore();

  return (
    <div className="flex gap-1 p-1 bg-ui-bg rounded-lg border border-ui-border">
      <button
        onClick={() => { setMode('sandbox'); resetLayout(); }}
        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
          mode === 'sandbox' ? 'bg-ui-accent text-white' : 'text-gray-400 hover:text-white'
        }`}
      >
        🌍 Sandbox
      </button>
      <button
        onClick={startChallenge}
        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
          mode === 'challenge' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'
        }`}
      >
        🏆 Challenge
      </button>
    </div>
  );
};
