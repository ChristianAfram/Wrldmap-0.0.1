import { useEffect, useState } from 'react';
import { useWorldStore } from '../store/worldStore';
import type { CountryObject } from '../types';

const computeScore = (countries: CountryObject[]): number => {
  if (countries.length === 0) return 0;
  let total = 0;
  for (const c of countries) {
    const dx = c.centroid.x + c.position.x - c.originalCentroid.x;
    const dy = c.centroid.y + c.position.y - c.originalCentroid.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    total += Math.max(0, 1 - dist / 100);
  }
  return Math.round((total / countries.length) * 100);
};

export const ChallengeHUD = () => {
  const { challenge, countries, endChallenge, resetLayout, setMode, setShowGhosts, showGhosts } = useWorldStore();
  const [elapsed, setElapsed] = useState(0);
  const score = computeScore(countries);

  useEffect(() => {
    if (!challenge.active || challenge.completed) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - challenge.startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [challenge.active, challenge.completed, challenge.startTime]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  if (!challenge.active && !challenge.completed) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-ui-panel border border-ui-border rounded-xl shadow-2xl px-6 py-3 flex items-center gap-6 z-50">
      {/* Timer */}
      <div className="text-center">
        <p className="text-xs text-gray-400">Time</p>
        <p className="text-xl font-mono text-white font-bold">{formatTime(elapsed)}</p>
      </div>

      <div className="w-px h-10 bg-ui-border" />

      {/* Score */}
      <div className="text-center">
        <p className="text-xs text-gray-400">Accuracy</p>
        <p className={`text-xl font-mono font-bold ${score > 70 ? 'text-green-400' : score > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
          {score}%
        </p>
      </div>

      <div className="w-px h-10 bg-ui-border" />

      {/* Progress bar */}
      <div className="w-32">
        <p className="text-xs text-gray-400 mb-1">Progress</p>
        <div className="w-full h-2 bg-ui-bg rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${score}%`,
              backgroundColor: score > 70 ? '#22c55e' : score > 40 ? '#eab308' : '#ef4444',
            }}
          />
        </div>
      </div>

      <div className="w-px h-10 bg-ui-border" />

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowGhosts(!showGhosts)}
          className={`px-2 py-1 text-xs rounded transition-colors ${showGhosts ? 'bg-blue-600 text-white' : 'bg-ui-bg text-gray-400 hover:text-white'}`}
        >
          💡 Hint
        </button>
        <button
          onClick={() => { setMode('sandbox'); resetLayout(); }}
          className="px-2 py-1 text-xs rounded bg-ui-bg text-gray-400 hover:text-white transition-colors"
        >
          Exit
        </button>
      </div>

      {challenge.completed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
          <div className="text-center">
            <p className="text-2xl">🎉</p>
            <p className="text-green-400 font-bold">Complete!</p>
            <p className="text-sm text-white">{score}% in {formatTime(elapsed)}</p>
          </div>
        </div>
      )}
    </div>
  );
};
