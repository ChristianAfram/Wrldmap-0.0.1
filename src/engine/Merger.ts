import type { CountryObject, Vec2 } from '../types';
import { getWorldPolygon, computeAABB } from './CountryEngine';
import { convexHull, flattenRings } from '../utils/geoUtils';
import { randomCountryColor } from '../utils/colorUtils';
import { COUNTRY_METADATA } from '../data/countryMetadata';

/**
 * Merge two countries into one using a simplified union approach.
 * We take the convex hull of all world-space vertices for the merged polygon.
 * For production-quality merging, replace with a full Greiner-Hodgman implementation.
 */
export const mergeCountries = (a: CountryObject, b: CountryObject): CountryObject => {
  const aWorld = getWorldPolygon(a);
  const bWorld = getWorldPolygon(b);

  const allPoints = flattenRings([...aWorld, ...bWorld]);
  const hull = convexHull(allPoints);

  // Compute centroid of hull
  let cx = 0, cy = 0;
  for (const p of hull) { cx += p.x; cy += p.y; }
  cx /= hull.length;
  cy /= hull.length;

  // Local polygon (hull relative to centroid)
  const localRing: Vec2[] = hull.map(p => ({ x: p.x - cx, y: p.y - cy }));

  const merged: CountryObject = {
    id: `${a.id}_${b.id}_merged`,
    name: `${a.name}-${b.name} Union`,
    iso: `${a.iso}${b.iso}`,
    localPolygon: [localRing],
    centroid: { x: cx, y: cy },
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: 1,
    color: randomCountryColor(),
    originalCentroid: { x: cx, y: cy },
    velocity: { x: 0, y: 0 },
    zIndex: Math.max(a.zIndex, b.zIndex) + 1,
    merged: [a.id, b.id, ...(a.merged ?? []), ...(b.merged ?? [])],
    populationNorm: Math.min(1, (a.populationNorm ?? 0) + (b.populationNorm ?? 0)),
    climateZone: Math.round(((a.climateZone ?? 2) + (b.climateZone ?? 2)) / 2),
    aabb: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  };

  merged.aabb = computeAABB(merged.centroid, merged.position, merged.localPolygon, 0, 1);
  return merged;
};

export const canMerge = (a: CountryObject, b: CountryObject): boolean => {
  // Check if AABBs overlap (simple proximity check)
  return (
    a.aabb.minX < b.aabb.maxX + 30 &&
    a.aabb.maxX > b.aabb.minX - 30 &&
    a.aabb.minY < b.aabb.maxY + 30 &&
    a.aabb.maxY > b.aabb.minY - 30
  );
};
