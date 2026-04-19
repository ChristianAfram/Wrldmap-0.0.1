import type { CountryObject, Vec2 } from '../types';
import { edgeMidpoints } from '../utils/geoUtils';
import { dist2, add } from '../utils/mathUtils';
import { getWorldPolygon } from './CountryEngine';

const SNAP_RANGE = 25; // canvas units
const SNAP_RANGE2 = SNAP_RANGE * SNAP_RANGE;

export interface SnapResult {
  snapped: boolean;
  position: Vec2;
  indicators: Array<{ from: Vec2; to: Vec2 }>;
}

export const computeSnap = (
  dragged: CountryObject,
  candidates: CountryObject[]
): SnapResult => {
  const worldRings = getWorldPolygon(dragged);
  const dragMids = worldRings.flatMap(ring => edgeMidpoints(ring));

  let bestDist2 = SNAP_RANGE2;
  let bestDelta: Vec2 = { x: 0, y: 0 };
  let bestFrom: Vec2 | null = null;
  let bestTo: Vec2 | null = null;

  for (const candidate of candidates) {
    if (candidate.id === dragged.id) continue;
    const candRings = getWorldPolygon(candidate);
    const candMids = candRings.flatMap(ring => edgeMidpoints(ring));

    for (const dm of dragMids) {
      for (const cm of candMids) {
        const d2 = dist2(dm, cm);
        if (d2 < bestDist2) {
          bestDist2 = d2;
          bestDelta = { x: cm.x - dm.x, y: cm.y - dm.y };
          bestFrom = dm;
          bestTo = cm;
        }
      }
    }
  }

  if (bestFrom && bestTo && bestDist2 < SNAP_RANGE2) {
    return {
      snapped: true,
      position: add(dragged.position, bestDelta),
      indicators: [{ from: bestFrom, to: bestTo }],
    };
  }

  return { snapped: false, position: dragged.position, indicators: [] };
};
