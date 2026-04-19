import type { Vec2, AABB } from '../types';
import { add, scale, sub, len2 } from './mathUtils';

export const computeCentroid = (rings: Vec2[][]): Vec2 => {
  let totalArea = 0;
  let cx = 0;
  let cy = 0;
  for (const ring of rings) {
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      const p0 = ring[i];
      const p1 = ring[(i + 1) % n];
      const cross = p0.x * p1.y - p1.x * p0.y;
      totalArea += cross;
      cx += (p0.x + p1.x) * cross;
      cy += (p0.y + p1.y) * cross;
    }
  }
  totalArea /= 2;
  if (Math.abs(totalArea) < 1e-10) {
    // fallback: simple average
    let sx = 0, sy = 0, count = 0;
    for (const ring of rings) for (const p of ring) { sx += p.x; sy += p.y; count++; }
    return { x: sx / count, y: sy / count };
  }
  return { x: cx / (6 * totalArea), y: cy / (6 * totalArea) };
};

export const polygonArea = (ring: Vec2[]): number => {
  let area = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const p0 = ring[i];
    const p1 = ring[(i + 1) % n];
    area += p0.x * p1.y - p1.x * p0.y;
  }
  return Math.abs(area) / 2;
};

export const computeBoundsFromRings = (rings: Vec2[][]): AABB => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of rings) {
    for (const p of ring) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { minX, minY, maxX, maxY };
};

export const getTransformedAABB = (
  rings: Vec2[][],
  cx: number, cy: number,
  dx: number, dy: number,
  rotation: number,
  scl: number
): AABB => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const pivotX = cx + dx;
  const pivotY = cy + dy;
  for (const ring of rings) {
    for (const p of ring) {
      const lx = p.x * scl;
      const ly = p.y * scl;
      const wx = lx * cos - ly * sin + pivotX;
      const wy = lx * sin + ly * cos + pivotY;
      if (wx < minX) minX = wx;
      if (wy < minY) minY = wy;
      if (wx > maxX) maxX = wx;
      if (wy > maxY) maxY = wy;
    }
  }
  return { minX, minY, maxX, maxY };
};

export const convexHull = (points: Vec2[]): Vec2[] => {
  const pts = [...points].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
  const n = pts.length;
  if (n < 3) return pts;
  const hull: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], pts[i]) <= 0) hull.pop();
    hull.push(pts[i]);
  }
  const lower = hull.length;
  for (let i = n - 2; i >= 0; i--) {
    while (hull.length > lower && cross(hull[hull.length - 2], hull[hull.length - 1], pts[i]) <= 0) hull.pop();
    hull.push(pts[i]);
  }
  hull.pop();
  return hull;
};

const cross = (o: Vec2, a: Vec2, b: Vec2): number =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

export const flattenRings = (rings: Vec2[][]): Vec2[] =>
  rings.reduce<Vec2[]>((acc, r) => acc.concat(r), []);

export const simplifyRing = (ring: Vec2[], tolerance: number): Vec2[] => {
  if (ring.length <= 4) return ring;
  return rdpSimplify(ring, tolerance);
};

const rdpSimplify = (pts: Vec2[], eps: number): Vec2[] => {
  if (pts.length <= 2) return pts;
  let maxDist = 0;
  let maxIdx = 0;
  const first = pts[0];
  const last = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = pointToSegmentDist2(pts[i], first, last);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > eps * eps) {
    const left = rdpSimplify(pts.slice(0, maxIdx + 1), eps);
    const right = rdpSimplify(pts.slice(maxIdx), eps);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
};

const pointToSegmentDist2 = (p: Vec2, a: Vec2, b: Vec2): number => {
  const ab = sub(b, a);
  const l2 = len2(ab);
  if (l2 === 0) return len2(sub(p, a));
  const t = Math.max(0, Math.min(1, (((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2)));
  const proj = add(a, scale(ab, t));
  return len2(sub(p, proj));
};

export const chaikinSmooth = (pts: Vec2[], iterations = 2): Vec2[] => {
  let result = pts;
  for (let i = 0; i < iterations; i++) {
    const smoothed: Vec2[] = [];
    for (let j = 0; j < result.length; j++) {
      const p0 = result[j];
      const p1 = result[(j + 1) % result.length];
      smoothed.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y });
      smoothed.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y });
    }
    result = smoothed;
  }
  return result;
};

export const edgeMidpoints = (ring: Vec2[]): Vec2[] =>
  ring.map((p, i) => {
    const q = ring[(i + 1) % ring.length];
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  });
