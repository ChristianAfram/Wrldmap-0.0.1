import type { CountryObject, Vec2 } from '../types';
import { chaikinSmooth } from '../utils/geoUtils';
import { randomRange } from '../utils/mathUtils';
import { randomCountryColor } from '../utils/colorUtils';
import { computeAABB } from './CountryEngine';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './Projection';
import { PROCEDURAL_NAMES } from '../data/countryMetadata';

let _genId = 0;
let _nameIdx = 0;

/** Generate a random organic polygon using polar coordinates + Chaikin smoothing */
export const generateRandomPolygon = (
  cx: number,
  cy: number,
  radius: number,
  vertexCount = 10,
  roughness = 0.5
): Vec2[] => {
  const pts: Vec2[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * Math.PI * 2;
    const r = radius * (1 + randomRange(-roughness, roughness));
    pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return chaikinSmooth(pts, 2);
};

export const generateCountry = (
  canvasX?: number,
  canvasY?: number,
  existingCountries?: CountryObject[]
): CountryObject => {
  const id = `proc_${++_genId}`;
  const name = PROCEDURAL_NAMES[(_nameIdx++) % PROCEDURAL_NAMES.length] ?? `Land ${_genId}`;

  // Place in center of canvas if not specified
  let cx = canvasX ?? CANVAS_WIDTH / 2 + randomRange(-200, 200);
  let cy = canvasY ?? CANVAS_HEIGHT / 2 + randomRange(-100, 100);

  // Try to avoid overlapping existing countries
  if (existingCountries) {
    let attempts = 0;
    while (attempts < 20) {
      const hasOverlap = existingCountries.some(c => {
        const dx = c.centroid.x + c.position.x - cx;
        const dy = c.centroid.y + c.position.y - cy;
        return Math.sqrt(dx * dx + dy * dy) < 80;
      });
      if (!hasOverlap) break;
      cx = randomRange(100, CANVAS_WIDTH - 100);
      cy = randomRange(50, CANVAS_HEIGHT - 50);
      attempts++;
    }
  }

  const radius = randomRange(30, 80);
  const vertexCount = Math.floor(randomRange(7, 14));
  const localRing = generateRandomPolygon(0, 0, radius, vertexCount, 0.4);

  const country: CountryObject = {
    id,
    name,
    iso: `P${_genId.toString().padStart(2, '0')}`,
    localPolygon: [localRing],
    centroid: { x: cx, y: cy },
    position: { x: 0, y: 0 },
    rotation: randomRange(0, Math.PI * 2),
    scale: 1,
    color: randomCountryColor(),
    originalCentroid: { x: cx, y: cy },
    velocity: { x: 0, y: 0 },
    zIndex: 999 + _genId,
    isGenerated: true,
    populationNorm: Math.random() * 0.8,
    climateZone: Math.floor(Math.random() * 6),
    aabb: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  };

  country.aabb = computeAABB(country.centroid, country.position, country.localPolygon, country.rotation, country.scale);
  return country;
};

export const generateCountriesOnContinent = (
  count: number,
  cx: number,
  cy: number,
  spread: number
): CountryObject[] => {
  const result: CountryObject[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + randomRange(-0.3, 0.3);
    const r = randomRange(spread * 0.3, spread);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    result.push(generateCountry(x, y, result));
  }
  return result;
};
