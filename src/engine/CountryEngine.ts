import type { CountryObject, GeoJSONCollection, GeoJSONFeature, Vec2, AABB } from '../types';
import { lonLatToCanvas, CANVAS_WIDTH, CANVAS_HEIGHT } from './Projection';
import { computeCentroid, convexHull, flattenRings, polygonArea } from '../utils/geoUtils';
import { COUNTRY_METADATA } from '../data/countryMetadata';
import { assignCountryColors } from '../utils/colorUtils';
import { Quadtree } from './Quadtree';

const GEO_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const GEO_FALLBACK = '/countries.geojson';

let cachedCountries: CountryObject[] | null = null;

const projectRings = (coordRings: number[][][]): Vec2[][] =>
  coordRings.map(ring =>
    ring.map(([lon, lat]) => lonLatToCanvas(lon, lat))
  );

const buildCountryFromFeature = (
  feature: GeoJSONFeature,
  idx: number,
  colorMap: Record<string, string>
): CountryObject | null => {
  const props = feature.properties;
  const name = (props['NAME'] as string) ?? (props['ADMIN'] as string) ?? `Country ${idx}`;
  const iso = (props['ISO_A3'] as string) ?? (props['ADM0_A3'] as string) ?? `XX${idx}`;
  const id = iso !== '-99' ? iso : `gen_${idx}`;

  let allRings: Vec2[][] = [];

  if (feature.geometry.type === 'Polygon') {
    allRings = projectRings(feature.geometry.coordinates as number[][][]);
  } else if (feature.geometry.type === 'MultiPolygon') {
    for (const poly of feature.geometry.coordinates as number[][][][]) {
      allRings.push(...projectRings(poly));
    }
  } else {
    return null;
  }

  if (allRings.length === 0 || allRings[0].length < 3) return null;

  const centroid = computeCentroid(allRings);

  // Convert rings to local space (relative to centroid)
  const localPolygon: Vec2[][] = allRings.map(ring =>
    ring.map(p => ({ x: p.x - centroid.x, y: p.y - centroid.y }))
  );

  const allPoints = flattenRings(localPolygon);
  const hull = convexHull(allPoints);
  const area = allRings.reduce((a, r) => a + polygonArea(r), 0);

  const meta = COUNTRY_METADATA[iso];
  const color = colorMap[id] ?? '#4CAF50';
  const position: Vec2 = { x: 0, y: 0 };

  const aabb = computeAABB(centroid, position, localPolygon, 0, 1);

  return {
    id,
    name,
    iso,
    localPolygon,
    centroid: { ...centroid },
    position,
    rotation: 0,
    scale: 1,
    color,
    originalCentroid: { ...centroid },
    velocity: { x: 0, y: 0 },
    zIndex: idx,
    aabb,
    populationNorm: meta?.populationNorm ?? Math.random() * 0.5,
    climateZone: meta?.climateZone ?? Math.floor(Math.random() * 6),
    _hull: hull,
  } as CountryObject & { _hull: Vec2[] };
};

export const computeAABB = (
  centroid: Vec2,
  position: Vec2,
  localPolygon: Vec2[][],
  rotation: number,
  scl: number
): AABB => {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const px = centroid.x + position.x;
  const py = centroid.y + position.y;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of localPolygon) {
    for (const p of ring) {
      const lx = p.x * scl;
      const ly = p.y * scl;
      const wx = lx * cos - ly * sin + px;
      const wy = lx * sin + ly * cos + py;
      if (wx < minX) minX = wx;
      if (wy < minY) minY = wy;
      if (wx > maxX) maxX = wx;
      if (wy > maxY) maxY = wy;
    }
  }
  return { minX, minY, maxX, maxY };
};

export const getWorldPolygon = (country: CountryObject): Vec2[][] => {
  const cos = Math.cos(country.rotation);
  const sin = Math.sin(country.rotation);
  const px = country.centroid.x + country.position.x;
  const py = country.centroid.y + country.position.y;
  return country.localPolygon.map(ring =>
    ring.map(p => {
      const lx = p.x * country.scale;
      const ly = p.y * country.scale;
      return { x: lx * cos - ly * sin + px, y: lx * sin + ly * cos + py };
    })
  );
};

export const loadCountries = async (): Promise<CountryObject[]> => {
  if (cachedCountries) return cachedCountries;

  let data: GeoJSONCollection;
  try {
    const resp = await fetch(GEO_URL);
    if (!resp.ok) throw new Error('CDN failed');
    data = await resp.json() as GeoJSONCollection;
  } catch {
    try {
      const resp = await fetch(GEO_FALLBACK);
      data = await resp.json() as GeoJSONCollection;
    } catch {
      throw new Error('Could not load country data from CDN or fallback.');
    }
  }

  const ids = data.features.map((f, i) => {
    const props = f.properties;
    return (props['ISO_A3'] as string) ?? `gen_${i}`;
  });
  const colorMap = assignCountryColors(ids);

  const countries: CountryObject[] = [];
  data.features.forEach((feat, i) => {
    const c = buildCountryFromFeature(feat, i, colorMap);
    if (c) countries.push(c);
  });

  // Sort by area descending so large countries render first
  countries.sort((a, b) => {
    const aArea = a.localPolygon.reduce((s, r) => s + polygonArea(r), 0);
    const bArea = b.localPolygon.reduce((s, r) => s + polygonArea(r), 0);
    return bArea - aArea;
  });

  countries.forEach((c, i) => { c.zIndex = i; });

  cachedCountries = countries;
  return countries;
};

export const buildQuadtree = (countries: CountryObject[]): Quadtree => {
  const qt = new Quadtree({ minX: 0, minY: 0, maxX: CANVAS_WIDTH, maxY: CANVAS_HEIGHT });
  for (const c of countries) qt.insert({ id: c.id, aabb: c.aabb });
  return qt;
};

export const hitTestCountry = (
  pt: Vec2,
  countries: CountryObject[],
  qt: Quadtree,
  ctx: CanvasRenderingContext2D
): CountryObject | null => {
  const candidates = qt.queryPoint(pt);
  if (candidates.length === 0) return null;

  const candidateIds = new Set(candidates.map(c => c.id));
  const sorted = countries
    .filter(c => candidateIds.has(c.id))
    .sort((a, b) => b.zIndex - a.zIndex);

  for (const country of sorted) {
    const path = buildPath2D(country);
    if (ctx.isPointInPath(path, pt.x, pt.y)) return country;
  }
  return null;
};

export const buildPath2D = (country: CountryObject): Path2D => {
  const path = new Path2D();
  const cos = Math.cos(country.rotation);
  const sin = Math.sin(country.rotation);
  const px = country.centroid.x + country.position.x;
  const py = country.centroid.y + country.position.y;

  for (const ring of country.localPolygon) {
    if (ring.length < 2) continue;
    let first = true;
    for (const p of ring) {
      const lx = p.x * country.scale;
      const ly = p.y * country.scale;
      const wx = lx * cos - ly * sin + px;
      const wy = lx * sin + ly * cos + py;
      if (first) { path.moveTo(wx, wy); first = false; }
      else path.lineTo(wx, wy);
    }
    path.closePath();
  }
  return path;
};
