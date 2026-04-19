import type { Vec2, AABB } from '../types';

export const vec2 = (x: number, y: number): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const len = (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y);
export const len2 = (v: Vec2): number => v.x * v.x + v.y * v.y;
export const norm = (v: Vec2): Vec2 => { const l = len(v); return l === 0 ? { x: 0, y: 0 } : scale(v, 1 / l); };
export const perp = (v: Vec2): Vec2 => ({ x: -v.y, y: v.x });
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpV = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

export const rotate = (v: Vec2, angle: number): Vec2 => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
};

export const dist = (a: Vec2, b: Vec2): number => len(sub(a, b));
export const dist2 = (a: Vec2, b: Vec2): number => len2(sub(a, b));

export const worldToLocal = (worldPt: Vec2, centroid: Vec2, position: Vec2, rotation: number, scl: number): Vec2 => {
  const translated = sub(worldPt, add(centroid, position));
  const unrotated = rotate(translated, -rotation);
  return scale(unrotated, 1 / scl);
};

export const localToWorld = (localPt: Vec2, centroid: Vec2, position: Vec2, rotation: number, scl: number): Vec2 => {
  const scaled = scale(localPt, scl);
  const rotated = rotate(scaled, rotation);
  return add(rotated, add(centroid, position));
};

export const computeAABB = (polygon: Vec2[]): AABB => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
};

export const aabbOverlaps = (a: AABB, b: AABB): boolean =>
  a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;

export const expandAABB = (a: AABB, margin: number): AABB => ({
  minX: a.minX - margin,
  minY: a.minY - margin,
  maxX: a.maxX + margin,
  maxY: a.maxY + margin,
});

export const pointInAABB = (p: Vec2, box: AABB): boolean =>
  p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY;

export const pointInPolygon = (pt: Vec2, polygon: Vec2[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

/** Separating Axis Theorem overlap test — returns MTV or null */
export const satOverlap = (polyA: Vec2[], polyB: Vec2[]): Vec2 | null => {
  const polys = [polyA, polyB];
  let minOverlap = Infinity;
  let minAxis: Vec2 = { x: 0, y: 1 };

  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length;
      const edge = sub(poly[j], poly[i]);
      const axis = norm(perp(edge));
      const [minA, maxA] = project(polyA, axis);
      const [minB, maxB] = project(polyB, axis);
      const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
      if (overlap <= 0) return null;
      if (overlap < minOverlap) {
        minOverlap = overlap;
        minAxis = axis;
      }
    }
  }

  const d = sub(centroidOf(polyB), centroidOf(polyA));
  if (dot(d, minAxis) < 0) minAxis = scale(minAxis, -1);
  return scale(minAxis, minOverlap);
};

const project = (poly: Vec2[], axis: Vec2): [number, number] => {
  let min = Infinity, max = -Infinity;
  for (const p of poly) {
    const v = dot(p, axis);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
};

const centroidOf = (poly: Vec2[]): Vec2 => {
  const sum = poly.reduce((acc, p) => add(acc, p), { x: 0, y: 0 });
  return scale(sum, 1 / poly.length);
};

export const randomRange = (min: number, max: number): number => Math.random() * (max - min) + min;

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;
