import type { CountryObject, HeatmapType } from '../types';
import { populationColor, climateColor } from '../utils/colorUtils';
import { buildPath2D } from './CountryEngine';

export const drawHeatmap = (
  ctx: CanvasRenderingContext2D,
  countries: CountryObject[],
  type: HeatmapType
): void => {
  if (type === 'none') return;

  ctx.save();
  for (const country of countries) {
    const path = buildPath2D(country);
    let color: string;
    if (type === 'population') {
      color = populationColor(country.populationNorm ?? 0.3);
    } else {
      color = climateColor(country.climateZone ?? 2);
    }
    ctx.fillStyle = color;
    ctx.fill(path);
  }
  ctx.restore();
};

export const drawHeatmapLegend = (
  ctx: CanvasRenderingContext2D,
  type: HeatmapType,
  x: number, y: number
): void => {
  if (type === 'none') return;
  ctx.save();
  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y, 120, type === 'climate' ? 110 : 70);

  ctx.fillStyle = '#fff';
  ctx.fillText(type === 'population' ? 'Population Density' : 'Climate Zones', x + 6, y + 14);

  if (type === 'population') {
    const grad = ctx.createLinearGradient(x + 6, y + 22, x + 114, y + 22);
    grad.addColorStop(0, populationColor(0));
    grad.addColorStop(1, populationColor(1));
    ctx.fillStyle = grad;
    ctx.fillRect(x + 6, y + 22, 108, 14);
    ctx.fillStyle = '#fff';
    ctx.fillText('Low', x + 6, y + 52);
    ctx.fillText('High', x + 90, y + 52);
  } else {
    const zones = ['Polar', 'Tundra', 'Temperate', 'Arid', 'Tropical', 'Rainforest'];
    zones.forEach((label, i) => {
      ctx.fillStyle = climateColor(i);
      ctx.fillRect(x + 6, y + 22 + i * 14, 12, 10);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 22, y + 31 + i * 14);
    });
  }
  ctx.restore();
};
