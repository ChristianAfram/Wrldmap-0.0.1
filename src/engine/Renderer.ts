import type { CountryObject, Viewport, HeatmapType, SnapResult, VolcanoMarker } from '../types';
import { buildPath2D } from './CountryEngine';
import { getHoverColor, getSelectedBorderColor, getGhostColor, hexToRgba, getSnapLineColor } from '../utils/colorUtils';
import { drawHeatmap, drawHeatmapLegend } from './HeatmapEngine';
import { drawVolcanos, getDisasterJitter } from './Disasters';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './Projection';

interface RenderState {
  countries: CountryObject[];
  selectedIds: Set<string>;
  hoveredId: string | null;
  viewport: Viewport;
  heatmapType: HeatmapType;
  physicsEnabled: boolean;
  snapIndicators: SnapResult['indicators'];
  volcanos: VolcanoMarker[];
  showGhosts: boolean;
  gameMode: string;
  showNames: boolean;
}

const drawOcean = (ctx: CanvasRenderingContext2D, vp: Viewport): void => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1a2b4a';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Grid lines
  ctx.save();
  ctx.setTransform(vp.zoom, 0, 0, vp.zoom, vp.x, vp.y);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  const gridStep = CANVAS_WIDTH / 18; // ~20deg longitude
  for (let x = 0; x <= CANVAS_WIDTH; x += gridStep) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += gridStep / 2) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
  }
  // Equator
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_HEIGHT / 2);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
};

const drawCountry = (
  ctx: CanvasRenderingContext2D,
  country: CountryObject,
  isSelected: boolean,
  isHovered: boolean,
  now: number
): void => {
  ctx.save();
  const jitter = getDisasterJitter(country.disasterState, now);

  const cos = Math.cos(country.rotation);
  const sin = Math.sin(country.rotation);
  const px = country.centroid.x + country.position.x + jitter.x;
  const py = country.centroid.y + country.position.y + jitter.y;
  ctx.setTransform(
    cos * country.scale, sin * country.scale,
    -sin * country.scale, cos * country.scale,
    px, py
  );

  // Draw polygon in local space
  const path = new Path2D();
  for (const ring of country.localPolygon) {
    if (ring.length < 2) continue;
    path.moveTo(ring[0].x, ring[0].y);
    for (let i = 1; i < ring.length; i++) path.lineTo(ring[i].x, ring[i].y);
    path.closePath();
  }

  // Shadow for dragged/selected
  if (isSelected) {
    ctx.shadowColor = getSelectedBorderColor();
    ctx.shadowBlur = 12 / country.scale;
  }

  ctx.fillStyle = isHovered
    ? getHoverColor(country.color)
    : hexToRgba(country.color, isSelected ? 1.0 : 0.85);
  ctx.fill(path);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.strokeStyle = isSelected ? getSelectedBorderColor() : 'rgba(0,0,0,0.5)';
  ctx.lineWidth = (isSelected ? 2 : 0.5) / country.scale;
  ctx.stroke(path);

  ctx.restore();
};

const drawGhost = (ctx: CanvasRenderingContext2D, country: CountryObject): void => {
  const cos = Math.cos(0);
  const sin = Math.sin(0);
  const px = country.originalCentroid.x;
  const py = country.originalCentroid.y;

  ctx.save();
  ctx.setTransform(cos, sin, -sin, cos, px, py);
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  const path = new Path2D();
  for (const ring of country.localPolygon) {
    if (ring.length < 2) continue;
    path.moveTo(ring[0].x, ring[0].y);
    for (let i = 1; i < ring.length; i++) path.lineTo(ring[i].x, ring[i].y);
    path.closePath();
  }
  ctx.stroke(path);
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();
};

const drawCountryName = (
  ctx: CanvasRenderingContext2D,
  country: CountryObject,
  vp: Viewport
): void => {
  const worldX = country.centroid.x + country.position.x;
  const worldY = country.centroid.y + country.position.y;
  const screenX = worldX * vp.zoom + vp.x;
  const screenY = worldY * vp.zoom + vp.y;

  const aabbW = (country.aabb.maxX - country.aabb.minX) * vp.zoom;
  if (aabbW < 20) return; // too small to show label

  const fontSize = Math.min(11, Math.max(7, aabbW * 0.06));
  ctx.save();
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(country.name, screenX, screenY);
  ctx.restore();
};

const drawSnapIndicators = (
  ctx: CanvasRenderingContext2D,
  indicators: SnapResult['indicators'],
  vp: Viewport
): void => {
  if (!indicators.length) return;
  ctx.save();
  ctx.strokeStyle = getSnapLineColor();
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  for (const ind of indicators) {
    const fx = ind.from.x * vp.zoom + vp.x;
    const fy = ind.from.y * vp.zoom + vp.y;
    const tx = ind.to.x * vp.zoom + vp.x;
    const ty = ind.to.y * vp.zoom + vp.y;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    // Snap dot
    ctx.fillStyle = getSnapLineColor();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(tx, ty, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.setLineDash([6, 4]);
  }
  ctx.setLineDash([]);
  ctx.restore();
};

const drawSelectionHandles = (
  ctx: CanvasRenderingContext2D,
  country: CountryObject,
  vp: Viewport
): void => {
  const { minX, minY, maxX, maxY } = country.aabb;
  const x1 = minX * vp.zoom + vp.x;
  const y1 = minY * vp.zoom + vp.y;
  const x2 = maxX * vp.zoom + vp.x;
  const y2 = maxY * vp.zoom + vp.y;
  const handleSize = 6;

  ctx.save();
  ctx.strokeStyle = getSelectedBorderColor();
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x1 - 2, y1 - 2, x2 - x1 + 4, y2 - y1 + 4);
  ctx.setLineDash([]);

  const corners = [[x1, y1], [x2, y1], [x1, y2], [x2, y2]];
  ctx.fillStyle = '#fff';
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
  }
  ctx.restore();
};

export const renderFrame = (
  ctx: CanvasRenderingContext2D,
  state: RenderState
): void => {
  const { countries, selectedIds, hoveredId, viewport: vp, heatmapType,
    snapIndicators, volcanos, showGhosts, showNames } = state;
  const now = Date.now();

  // 1. Ocean background + grid
  drawOcean(ctx, vp);

  // 2. Countries in z-order
  ctx.save();
  ctx.setTransform(vp.zoom, 0, 0, vp.zoom, vp.x, vp.y);

  // Ghost overlays for challenge mode
  if (showGhosts) {
    for (const country of countries) {
      drawGhost(ctx, country);
    }
  }

  // Countries
  for (const country of countries) {
    const isSelected = selectedIds.has(country.id);
    const isHovered = country.id === hoveredId;
    drawCountry(ctx, country, isSelected, isHovered, now);
  }

  // Heatmap overlay
  if (heatmapType !== 'none') {
    ctx.save();
    drawHeatmap(ctx, countries, heatmapType);
    ctx.restore();
  }

  // Volcano effects
  if (volcanos.length) drawVolcanos(ctx, volcanos);

  ctx.restore(); // end viewport transform

  // 3. Selection handles (screen space)
  for (const id of selectedIds) {
    const c = countries.find(x => x.id === id);
    if (c) drawSelectionHandles(ctx, c, vp);
  }

  // 4. Country names (screen space)
  if (showNames && vp.zoom > 0.3) {
    for (const country of countries) {
      drawCountryName(ctx, country, vp);
    }
  }

  // 5. Snap indicators (screen space)
  drawSnapIndicators(ctx, snapIndicators, vp);

  // 6. Heatmap legend
  if (heatmapType !== 'none') {
    drawHeatmapLegend(ctx, heatmapType, 10, ctx.canvas.height - 130);
  }
};
