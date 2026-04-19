const COUNTRY_PALETTE = [
  '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
  '#00BCD4', '#FFEB3B', '#795548', '#607D8B', '#E91E63',
  '#3F51B5', '#009688', '#FF5722', '#8BC34A', '#FFC107',
  '#673AB7', '#03A9F4', '#4DB6AC', '#FF7043', '#66BB6A',
  '#42A5F5', '#AB47BC', '#EC407A', '#26C6DA', '#D4E157',
  '#7E57C2', '#29B6F6', '#26A69A', '#FFA726', '#EF5350',
];

export const assignCountryColors = (ids: string[]): Record<string, string> => {
  const map: Record<string, string> = {};
  ids.forEach((id, i) => {
    map[id] = COUNTRY_PALETTE[i % COUNTRY_PALETTE.length];
  });
  return map;
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const lightenColor = (hex: string, amount: number): string => {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export const populationColor = (norm: number): string => {
  // Blue (low) → Orange → Red (high)
  const r = Math.round(norm * 220);
  const g = Math.round(60 + (1 - norm) * 100);
  const b = Math.round(255 * (1 - norm));
  return `rgba(${r},${g},${b},0.65)`;
};

export const climateColor = (zone: number): string => {
  const palette = [
    'rgba(74, 144, 226, 0.6)',   // 0 - polar ice
    'rgba(144, 202, 249, 0.6)',  // 1 - tundra
    'rgba(168, 200, 168, 0.6)',  // 2 - temperate
    'rgba(240, 200, 80, 0.6)',   // 3 - arid/desert
    'rgba(104, 195, 104, 0.6)',  // 4 - tropical
    'rgba(56, 142, 60, 0.6)',    // 5 - tropical rainforest
  ];
  return palette[Math.max(0, Math.min(5, zone))] ?? palette[2];
};

export const randomCountryColor = (): string =>
  COUNTRY_PALETTE[Math.floor(Math.random() * COUNTRY_PALETTE.length)];

export const getSnapLineColor = (): string => 'rgba(96, 165, 250, 0.8)';
export const getSelectionColor = (): string => 'rgba(59, 130, 246, 0.4)';
export const getHoverColor = (base: string): string => hexToRgba(base, 0.9);
export const getSelectedBorderColor = (): string => '#60a5fa';
export const getGhostColor = (): string => 'rgba(255,255,255,0.15)';
