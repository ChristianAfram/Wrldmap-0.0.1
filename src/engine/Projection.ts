import type { Vec2, Viewport } from '../types';

export const CANVAS_WIDTH = 2048;
export const CANVAS_HEIGHT = 1024;

/** Equirectangular: lon[-180,180] → x[0,W], lat[90,-90] → y[0,H] */
export const lonLatToCanvas = (lon: number, lat: number): Vec2 => ({
  x: (lon + 180) / 360 * CANVAS_WIDTH,
  y: (90 - lat) / 180 * CANVAS_HEIGHT,
});

export const canvasToLonLat = (x: number, y: number): Vec2 => ({
  x: x / CANVAS_WIDTH * 360 - 180,
  y: 90 - y / CANVAS_HEIGHT * 180,
});

/** Convert canvas-space point to screen-space point given viewport */
export const canvasToScreen = (p: Vec2, vp: Viewport): Vec2 => ({
  x: p.x * vp.zoom + vp.x,
  y: p.y * vp.zoom + vp.y,
});

/** Convert screen-space point to canvas-space point given viewport */
export const screenToCanvas = (p: Vec2, vp: Viewport): Vec2 => ({
  x: (p.x - vp.x) / vp.zoom,
  y: (p.y - vp.y) / vp.zoom,
});

/** Get canvas coordinates from a DOM mouse/touch event */
export const eventToCanvas = (
  e: { clientX: number; clientY: number },
  canvasEl: HTMLCanvasElement,
  vp: Viewport
): Vec2 => {
  const rect = canvasEl.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  return screenToCanvas({ x: screenX, y: screenY }, vp);
};

/** Zoom viewport centered on a screen point */
export const zoomViewport = (vp: Viewport, delta: number, screenPt: Vec2): Viewport => {
  const factor = delta > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.1, Math.min(10, vp.zoom * factor));
  const scale = newZoom / vp.zoom;
  return {
    zoom: newZoom,
    x: screenPt.x - (screenPt.x - vp.x) * scale,
    y: screenPt.y - (screenPt.y - vp.y) * scale,
  };
};

/** Fit the full world map to a given canvas element */
export const fitViewport = (canvasEl: HTMLCanvasElement): Viewport => {
  const w = canvasEl.clientWidth || window.innerWidth;
  const h = canvasEl.clientHeight || window.innerHeight;
  const zoom = Math.min(w / CANVAS_WIDTH, h / CANVAS_HEIGHT);
  return {
    zoom,
    x: (w - CANVAS_WIDTH * zoom) / 2,
    y: (h - CANVAS_HEIGHT * zoom) / 2,
  };
};
