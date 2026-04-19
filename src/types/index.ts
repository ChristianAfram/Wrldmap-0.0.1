export interface Vec2 {
  x: number;
  y: number;
}

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface CountryObject {
  id: string;
  name: string;
  iso: string;
  /** Polygon rings in local (projection) space, relative to centroid */
  localPolygon: Vec2[][];
  /** Centroid in world (canvas) space */
  centroid: Vec2;
  /** Translation offset from original centroid */
  position: Vec2;
  /** Rotation in radians */
  rotation: number;
  /** Uniform scale factor */
  scale: number;
  /** Fill color */
  color: string;
  /** Original centroid for challenge mode */
  originalCentroid: Vec2;
  /** Physics velocity */
  velocity: Vec2;
  /** Z-order index */
  zIndex: number;
  /** IDs of merged countries (if this is a merged result) */
  merged?: string[];
  /** True if procedurally generated */
  isGenerated?: boolean;
  /** Population (0-1 normalized) */
  populationNorm?: number;
  /** Climate zone index 0-5 */
  climateZone?: number;
  /** Bounding box in world space (updated on move) */
  aabb: AABB;
  /** Active disaster animation state */
  disasterState?: DisasterState;
}

export interface DisasterState {
  type: 'earthquake' | 'volcano';
  startTime: number;
  duration: number;
  intensity: number;
  jitterOffset: Vec2;
}

export type Tool = 'select' | 'move' | 'rotate' | 'scale' | 'delete';
export type GameMode = 'sandbox' | 'challenge';
export type HeatmapType = 'none' | 'population' | 'climate';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface WorldSnapshot {
  countries: SerializedCountry[];
  timestamp: number;
}

export interface SerializedCountry {
  id: string;
  position: Vec2;
  rotation: number;
  scale: number;
  merged?: string[];
  isGenerated?: boolean;
  localPolygon?: Vec2[][];
  color?: string;
  name?: string;
}

export interface SavedWorld {
  id: string;
  name: string;
  timestamp: number;
  snapshot: WorldSnapshot;
}

export interface ChallengeState {
  active: boolean;
  startTime: number;
  score: number;
  hintsUsed: number;
  completed: boolean;
}

export interface SnapIndicator {
  from: Vec2;
  to: Vec2;
  active: boolean;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface VolcanoMarker {
  id: string;
  pos: Vec2;
  intensity: number;
  startTime: number;
  particles: Particle[];
}

export interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface SnapResult {
  snapped: boolean;
  position: Vec2;
  indicators: Array<{ from: Vec2; to: Vec2 }>;
}
