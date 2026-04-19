import type { CountryObject, Vec2 } from '../types';
import { getWorldPolygon, computeAABB } from './CountryEngine';
import { satOverlap, aabbOverlaps } from '../utils/mathUtils';
import { flattenRings, convexHull } from '../utils/geoUtils';
import { Quadtree } from './Quadtree';
import { CANVAS_HEIGHT } from './Projection';

const GRAVITY = 120; // canvas units per second²
const FRICTION = 0.85;
const RESTITUTION = 0.2;

const getHull = (country: CountryObject): Vec2[] => {
  const rings = getWorldPolygon(country);
  return convexHull(flattenRings(rings));
};

export const tickPhysics = (
  countries: CountryObject[],
  qt: Quadtree,
  dt: number
): void => {
  const dtSec = Math.min(dt, 0.05); // cap at 50ms

  for (const c of countries) {
    // Apply gravity
    c.velocity.y += GRAVITY * dtSec;
    c.velocity.x *= FRICTION;
    c.velocity.y *= FRICTION;

    // Apply velocity
    c.position.x += c.velocity.x * dtSec;
    c.position.y += c.velocity.y * dtSec;

    // Floor collision
    const bottom = c.centroid.y + c.position.y + (c.aabb.maxY - c.aabb.minY) / 2;
    if (bottom > CANVAS_HEIGHT) {
      const overlap = bottom - CANVAS_HEIGHT;
      c.position.y -= overlap;
      c.velocity.y = -c.velocity.y * RESTITUTION;
      if (Math.abs(c.velocity.y) < 2) c.velocity.y = 0;
    }

    // Update AABB
    c.aabb = computeAABB(c.centroid, c.position, c.localPolygon, c.rotation, c.scale);
    qt.update({ id: c.id, aabb: c.aabb });
  }

  // Broad phase: check overlapping pairs
  const checked = new Set<string>();
  for (const c of countries) {
    const candidates = qt.query(c.aabb);
    for (const cand of candidates) {
      if (cand.id === c.id) continue;
      const key = [c.id, cand.id].sort().join('|');
      if (checked.has(key)) continue;
      checked.add(key);

      const other = countries.find(x => x.id === cand.id);
      if (!other) continue;
      if (!aabbOverlaps(c.aabb, other.aabb)) continue;

      const hullA = getHull(c);
      const hullB = getHull(other);
      const mtv = satOverlap(hullA, hullB);
      if (!mtv) continue;

      // Push both apart equally
      c.position.x -= mtv.x / 2;
      c.position.y -= mtv.y / 2;
      other.position.x += mtv.x / 2;
      other.position.y += mtv.y / 2;

      // Velocity response
      const relVel = { x: c.velocity.x - other.velocity.x, y: c.velocity.y - other.velocity.y };
      const mtvLen = Math.sqrt(mtv.x * mtv.x + mtv.y * mtv.y);
      const n = mtvLen > 0 ? { x: mtv.x / mtvLen, y: mtv.y / mtvLen } : { x: 0, y: 1 };
      const dvn = relVel.x * n.x + relVel.y * n.y;
      if (dvn > 0) {
        const impulse = dvn * (1 + RESTITUTION) / 2;
        c.velocity.x -= impulse * n.x;
        c.velocity.y -= impulse * n.y;
        other.velocity.x += impulse * n.x;
        other.velocity.y += impulse * n.y;
      }
    }
  }
};

export const applyImpulse = (country: CountryObject, force: Vec2): void => {
  country.velocity.x += force.x;
  country.velocity.y += force.y;
};
