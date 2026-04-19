import type { CountryObject, Particle, Vec2, VolcanoMarker } from '../types';
import { randomRange } from '../utils/mathUtils';
import { computeAABB } from './CountryEngine';
import { Quadtree } from './Quadtree';

export const triggerEarthquake = (
  countries: CountryObject[],
  qt: Quadtree,
  intensity: number,
  now: number
): void => {
  for (const c of countries) {
    const jitterX = randomRange(-intensity * 15, intensity * 15);
    const jitterY = randomRange(-intensity * 8, intensity * 8);
    c.disasterState = {
      type: 'earthquake',
      startTime: now,
      duration: 1500,
      intensity,
      jitterOffset: { x: jitterX, y: jitterY },
    };
    // Apply small permanent shift
    c.position.x += jitterX * 0.1;
    c.position.y += jitterY * 0.1;
    c.aabb = computeAABB(c.centroid, c.position, c.localPolygon, c.rotation, c.scale);
    qt.update({ id: c.id, aabb: c.aabb });
  }
};

export const triggerEarthquakeOnCountry = (
  country: CountryObject,
  qt: Quadtree,
  intensity: number,
  now: number
): void => {
  const jitterX = randomRange(-intensity * 20, intensity * 20);
  const jitterY = randomRange(-intensity * 10, intensity * 10);
  country.disasterState = {
    type: 'earthquake',
    startTime: now,
    duration: 1800,
    intensity,
    jitterOffset: { x: jitterX, y: jitterY },
  };
  country.position.x += jitterX * 0.15;
  country.position.y += jitterY * 0.15;
  country.aabb = computeAABB(country.centroid, country.position, country.localPolygon, country.rotation, country.scale);
  qt.update({ id: country.id, aabb: country.aabb });
};

export const createVolcano = (pos: Vec2, intensity: number, now: number): VolcanoMarker => ({
  id: `volcano_${now}`,
  pos,
  intensity,
  startTime: now,
  particles: spawnParticles(pos, intensity),
});

const spawnParticles = (pos: Vec2, intensity: number): Particle[] => {
  const count = Math.floor(20 + intensity * 30);
  return Array.from({ length: count }, () => ({
    pos: { x: pos.x + randomRange(-5, 5), y: pos.y + randomRange(-5, 5) },
    vel: { x: randomRange(-30, 30) * intensity, y: randomRange(-80, -20) * intensity },
    life: 1,
    maxLife: randomRange(0.5, 1.5),
    color: randomRange(0, 1) > 0.5 ? '#ff4500' : '#ffa500',
    size: randomRange(2, 5) * intensity,
  }));
};

export const updateParticles = (markers: VolcanoMarker[], dt: number): VolcanoMarker[] => {
  return markers
    .map(m => ({
      ...m,
      particles: m.particles
        .map(p => ({
          ...p,
          pos: { x: p.pos.x + p.vel.x * dt, y: p.pos.y + p.vel.y * dt },
          vel: { x: p.vel.x * 0.98, y: p.vel.y + 60 * dt },
          life: p.life - dt / p.maxLife,
        }))
        .filter(p => p.life > 0),
    }))
    .filter(m => m.particles.length > 0 || Date.now() - m.startTime < 3000);
};

export const drawVolcanos = (ctx: CanvasRenderingContext2D, markers: VolcanoMarker[]): void => {
  ctx.save();
  for (const m of markers) {
    // Draw volcano cone
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(m.pos.x - 8, m.pos.y + 6);
    ctx.lineTo(m.pos.x + 8, m.pos.y + 6);
    ctx.lineTo(m.pos.x, m.pos.y - 6);
    ctx.closePath();
    ctx.fill();

    // Draw particles
    for (const p of m.particles) {
      ctx.globalAlpha = p.life * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
};

export const getDisasterJitter = (state: CountryObject['disasterState'], now: number): Vec2 => {
  if (!state || state.type !== 'earthquake') return { x: 0, y: 0 };
  const elapsed = now - state.startTime;
  if (elapsed > state.duration) return { x: 0, y: 0 };
  const progress = elapsed / state.duration;
  const decay = 1 - progress;
  const freq = 20;
  return {
    x: Math.sin(elapsed * freq * 0.001) * state.jitterOffset.x * decay * 0.5,
    y: Math.cos(elapsed * freq * 0.0013) * state.jitterOffset.y * decay * 0.5,
  };
};
