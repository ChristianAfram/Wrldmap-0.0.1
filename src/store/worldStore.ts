import { create } from 'zustand';
import type {
  CountryObject, Tool, GameMode, HeatmapType, Viewport,
  SavedWorld, ChallengeState, VolcanoMarker, SnapResult
} from '../types';
import { loadCountries, buildQuadtree, computeAABB } from '../engine/CountryEngine';
import { Quadtree } from '../engine/Quadtree';
import { CommandHistory } from '../engine/CommandHistory';
import { makeMoveCommand, makeRotateCommand, makeScaleCommand, makeDeleteCommand } from '../engine/CommandHistory';
import { mergeCountries, canMerge } from '../engine/Merger';
import { generateCountry } from '../engine/ProceduralGen';
import { fitViewport } from '../engine/Projection';
import {
  triggerEarthquake as doEarthquake,
  triggerEarthquakeOnCountry,
  createVolcano,
} from '../engine/Disasters';

export const history = new CommandHistory();

interface WorldStore {
  // World state
  countries: CountryObject[];
  selectedIds: Set<string>;
  hoveredId: string | null;
  viewport: Viewport;
  quadtree: Quadtree | null;

  // UI state
  tool: Tool;
  mode: GameMode;
  heatmapType: HeatmapType;
  physicsEnabled: boolean;
  showNames: boolean;
  showGhosts: boolean;
  snapIndicators: SnapResult['indicators'];
  volcanos: VolcanoMarker[];

  // Game state
  challenge: ChallengeState;
  isLoading: boolean;
  loadError: string | null;
  savedWorlds: SavedWorld[];

  // History state (triggers re-renders)
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  init: (canvasEl: HTMLCanvasElement) => Promise<void>;
  setTool: (tool: Tool) => void;
  setMode: (mode: GameMode) => void;
  setHeatmap: (type: HeatmapType) => void;
  setPhysics: (enabled: boolean) => void;
  setViewport: (vp: Viewport) => void;
  setHovered: (id: string | null) => void;
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  setSnapIndicators: (indicators: SnapResult['indicators']) => void;
  setShowNames: (v: boolean) => void;
  setShowGhosts: (v: boolean) => void;

  // Country mutations (via command history)
  moveCountry: (id: string, pos: { x: number; y: number }) => void;
  commitMove: (id: string, from: { x: number; y: number }, to: { x: number; y: number }) => void;
  commitRotate: (id: string, from: number, to: number) => void;
  commitScale: (id: string, from: number, to: number) => void;
  deleteSelected: () => void;
  mergeSelected: () => void;
  generateCountry: () => void;

  // Direct mutations (used by history undo/redo)
  _setPosition: (id: string, pos: { x: number; y: number }) => void;
  _setRotation: (id: string, rot: number) => void;
  _setScale: (id: string, scl: number) => void;
  _deleteCountry: (id: string) => void;
  _restoreCountry: (c: CountryObject) => void;
  _addCountry: (c: CountryObject) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;

  // Disasters
  triggerEarthquake: (intensity: number) => void;
  triggerVolcano: () => void;
  updateVolcanos: (volcanos: VolcanoMarker[]) => void;

  // Save/load
  saveWorld: (name: string) => Promise<void>;
  loadWorld: (id: string) => Promise<void>;
  loadSavedWorlds: () => Promise<void>;
  deleteWorld: (id: string) => Promise<void>;
  exportWorld: () => string;
  importWorld: (json: string) => void;

  // Challenge
  startChallenge: () => void;
  endChallenge: () => void;
  resetLayout: () => void;

  // Physics tick target
  tickPhysics?: () => void;
}

const updateHistory = (get: () => WorldStore, set: (s: Partial<WorldStore>) => void) => {
  set({ canUndo: history.canUndo(), canRedo: history.canRedo() });
};

history.setOnChange(() => {
  // This gets wired up after store creation via the store's subscribe
});

const API_BASE = '/api/worlds';

export const useWorldStore = create<WorldStore>((set, get) => ({
  countries: [],
  selectedIds: new Set(),
  hoveredId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  quadtree: null,
  tool: 'move',
  mode: 'sandbox',
  heatmapType: 'none',
  physicsEnabled: false,
  showNames: true,
  showGhosts: false,
  snapIndicators: [],
  volcanos: [],
  challenge: { active: false, startTime: 0, score: 0, hintsUsed: 0, completed: false },
  isLoading: false,
  loadError: null,
  savedWorlds: [],
  canUndo: false,
  canRedo: false,

  init: async (canvasEl) => {
    set({ isLoading: true, loadError: null });
    try {
      const countries = await loadCountries();
      const qt = buildQuadtree(countries);
      const viewport = fitViewport(canvasEl);
      set({ countries, quadtree: qt, viewport, isLoading: false });
    } catch (e) {
      set({ loadError: String(e), isLoading: false });
    }
  },

  setTool: (tool) => set({ tool }),
  setMode: (mode) => set({ mode }),
  setHeatmap: (heatmapType) => set({ heatmapType }),
  setPhysics: (physicsEnabled) => set({ physicsEnabled }),
  setViewport: (viewport) => set({ viewport }),
  setHovered: (hoveredId) => set({ hoveredId }),
  setShowNames: (v) => set({ showNames: v }),
  setShowGhosts: (v) => set({ showGhosts: v }),

  setSelected: (ids) => set({ selectedIds: new Set(ids) }),
  toggleSelected: (id) => {
    const { selectedIds } = get();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    set({ selectedIds: next });
  },
  setSnapIndicators: (snapIndicators) => set({ snapIndicators }),

  moveCountry: (id, pos) => {
    // Live update during drag (no history entry)
    get()._setPosition(id, pos);
  },

  _setPosition: (id, pos) => {
    const countries = get().countries.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, position: { ...pos } };
      updated.aabb = computeAABB(updated.centroid, updated.position, updated.localPolygon, updated.rotation, updated.scale);
      return updated;
    });
    const qt = get().quadtree;
    const country = countries.find(c => c.id === id);
    if (qt && country) qt.update({ id, aabb: country.aabb });
    set({ countries });
  },

  _setRotation: (id, rot) => {
    const countries = get().countries.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, rotation: rot };
      updated.aabb = computeAABB(updated.centroid, updated.position, updated.localPolygon, rot, updated.scale);
      return updated;
    });
    const qt = get().quadtree;
    const country = countries.find(c => c.id === id);
    if (qt && country) qt.update({ id, aabb: country.aabb });
    set({ countries });
  },

  _setScale: (id, scl) => {
    const countries = get().countries.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, scale: scl };
      updated.aabb = computeAABB(updated.centroid, updated.position, updated.localPolygon, updated.rotation, scl);
      return updated;
    });
    const qt = get().quadtree;
    const country = countries.find(c => c.id === id);
    if (qt && country) qt.update({ id, aabb: country.aabb });
    set({ countries });
  },

  _deleteCountry: (id) => {
    const { quadtree } = get();
    if (quadtree) quadtree.remove(id);
    set({
      countries: get().countries.filter(c => c.id !== id),
      selectedIds: new Set([...get().selectedIds].filter(s => s !== id)),
    });
  },

  _restoreCountry: (c) => {
    const { quadtree } = get();
    if (quadtree) quadtree.insert({ id: c.id, aabb: c.aabb });
    set({ countries: [...get().countries, c] });
  },

  _addCountry: (c) => {
    const { quadtree } = get();
    if (quadtree) quadtree.insert({ id: c.id, aabb: c.aabb });
    set({ countries: [...get().countries, c] });
  },

  commitMove: (id, from, to) => {
    const country = get().countries.find(c => c.id === id);
    if (!country) return;
    const cmd = makeMoveCommand(country, from, to, (cid, pos) => get()._setPosition(cid, pos));
    history.push(cmd);
    set({ canUndo: history.canUndo(), canRedo: history.canRedo() });
  },

  commitRotate: (id, from, to) => {
    const country = get().countries.find(c => c.id === id);
    if (!country) return;
    const cmd = makeRotateCommand(country, from, to, (cid, rot) => get()._setRotation(cid, rot));
    history.push(cmd);
    set({ canUndo: history.canUndo(), canRedo: history.canRedo() });
  },

  commitScale: (id, from, to) => {
    const country = get().countries.find(c => c.id === id);
    if (!country) return;
    const cmd = makeScaleCommand(country, from, to, (cid, scl) => get()._setScale(cid, scl));
    history.push(cmd);
    set({ canUndo: history.canUndo(), canRedo: history.canRedo() });
  },

  deleteSelected: () => {
    const { selectedIds, countries } = get();
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      const c = countries.find(x => x.id === id);
      if (!c) continue;
      const cmd = makeDeleteCommand(c, (cid) => get()._deleteCountry(cid), (rc) => get()._restoreCountry(rc));
      history.push(cmd);
    }
    set({ selectedIds: new Set(), canUndo: history.canUndo(), canRedo: history.canRedo() });
  },

  mergeSelected: () => {
    const { selectedIds, countries } = get();
    if (selectedIds.size < 2) return;
    const [idA, idB] = [...selectedIds];
    const a = countries.find(c => c.id === idA);
    const b = countries.find(c => c.id === idB);
    if (!a || !b) return;
    if (!canMerge(a, b)) return;

    const merged = mergeCountries(a, b);
    get()._deleteCountry(a.id);
    get()._deleteCountry(b.id);
    get()._addCountry(merged);
    set({ selectedIds: new Set([merged.id]) });
  },

  generateCountry: () => {
    const { countries, quadtree } = get();
    const c = generateCountry(undefined, undefined, countries);
    if (quadtree) quadtree.insert({ id: c.id, aabb: c.aabb });
    set({ countries: [...countries, c] });
  },

  undo: () => { history.undo(); set({ canUndo: history.canUndo(), canRedo: history.canRedo() }); },
  redo: () => { history.redo(); set({ canUndo: history.canUndo(), canRedo: history.canRedo() }); },

  triggerEarthquake: (intensity) => {
    const { countries, quadtree } = get();
    if (!quadtree) return;
    const { selectedIds } = get();
    if (selectedIds.size > 0) {
      for (const id of selectedIds) {
        const c = countries.find(x => x.id === id);
        if (c) triggerEarthquakeOnCountry(c, quadtree, intensity, Date.now());
      }
    } else {
      doEarthquake(countries, quadtree, intensity, Date.now());
    }
    set({ countries: [...countries] });
  },

  triggerVolcano: () => {
    const { countries } = get();
    if (countries.length === 0) return;
    const target = countries[Math.floor(Math.random() * countries.length)];
    const cx = target.centroid.x + target.position.x;
    const cy = target.centroid.y + target.position.y;
    const marker = createVolcano({ x: cx, y: cy }, 1.0, Date.now());
    set({ volcanos: [...get().volcanos, marker] });
  },

  updateVolcanos: (volcanos) => set({ volcanos }),

  saveWorld: async (name) => {
    const { countries } = get();
    const snapshot = {
      countries: countries.map(c => ({
        id: c.id,
        position: c.position,
        rotation: c.rotation,
        scale: c.scale,
        merged: c.merged,
        isGenerated: c.isGenerated,
        localPolygon: c.isGenerated ? c.localPolygon : undefined,
        color: c.isGenerated ? c.color : undefined,
        name: c.isGenerated ? c.name : undefined,
      })),
      timestamp: Date.now(),
    };
    try {
      await fetch(`${API_BASE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, snapshot }),
      });
      await get().loadSavedWorlds();
    } catch {
      // fallback: localStorage
      const saves = JSON.parse(localStorage.getItem('wb_saves') || '[]') as SavedWorld[];
      const id = `ls_${Date.now()}`;
      saves.push({ id, name, timestamp: Date.now(), snapshot });
      localStorage.setItem('wb_saves', JSON.stringify(saves));
      set({ savedWorlds: saves });
    }
  },

  loadWorld: async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/${id}`);
      const world = await resp.json() as SavedWorld;
      applySnapshot(world.snapshot, get, set);
    } catch {
      const saves = JSON.parse(localStorage.getItem('wb_saves') || '[]') as SavedWorld[];
      const world = saves.find(s => s.id === id);
      if (world) applySnapshot(world.snapshot, get, set);
    }
  },

  loadSavedWorlds: async () => {
    try {
      const resp = await fetch(API_BASE);
      const worlds = await resp.json() as SavedWorld[];
      set({ savedWorlds: worlds });
    } catch {
      const saves = JSON.parse(localStorage.getItem('wb_saves') || '[]') as SavedWorld[];
      set({ savedWorlds: saves });
    }
  },

  deleteWorld: async (id) => {
    try {
      await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    } catch {
      const saves = JSON.parse(localStorage.getItem('wb_saves') || '[]') as SavedWorld[];
      localStorage.setItem('wb_saves', JSON.stringify(saves.filter(s => s.id !== id)));
    }
    await get().loadSavedWorlds();
  },

  exportWorld: () => {
    const { countries } = get();
    return JSON.stringify({ version: 1, countries: countries.map(c => ({
      id: c.id, name: c.name, position: c.position, rotation: c.rotation, scale: c.scale,
      isGenerated: c.isGenerated, localPolygon: c.isGenerated ? c.localPolygon : undefined,
    }))}, null, 2);
  },

  importWorld: (json) => {
    try {
      const data = JSON.parse(json) as { countries: Array<{ id: string; position: { x: number; y: number }; rotation: number; scale: number }> };
      const { countries } = get();
      const lookup = new Map(countries.map(c => [c.id, c]));
      for (const entry of data.countries) {
        const c = lookup.get(entry.id);
        if (c) {
          get()._setPosition(entry.id, entry.position);
          get()._setRotation(entry.id, entry.rotation);
          get()._setScale(entry.id, entry.scale);
        }
      }
    } catch { /* malformed import */ }
  },

  startChallenge: () => {
    const { countries } = get();
    // Scramble all countries
    const scrambled = countries.map(c => ({
      ...c,
      position: {
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 200,
      },
      rotation: (Math.random() - 0.5) * Math.PI,
    }));
    scrambled.forEach(c => {
      c.aabb = computeAABB(c.centroid, c.position, c.localPolygon, c.rotation, c.scale);
    });
    const qt = buildQuadtree(scrambled);
    set({
      countries: scrambled,
      quadtree: qt,
      mode: 'challenge',
      challenge: { active: true, startTime: Date.now(), score: 0, hintsUsed: 0, completed: false },
    });
  },

  endChallenge: () => {
    set({ challenge: { ...get().challenge, active: false, completed: true } });
  },

  resetLayout: () => {
    const { countries } = get();
    const reset = countries.map(c => ({
      ...c,
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: 1,
    }));
    reset.forEach(c => {
      c.aabb = computeAABB(c.centroid, c.position, c.localPolygon, 0, 1);
    });
    const qt = buildQuadtree(reset);
    set({ countries: reset, quadtree: qt, selectedIds: new Set() });
    history.clear();
  },
}));

const applySnapshot = (
  snapshot: { countries: Array<{ id: string; position: { x: number; y: number }; rotation: number; scale: number }> },
  get: () => WorldStore,
  set: (s: Partial<WorldStore>) => void
) => {
  const { countries } = get();
  const lookup = new Map(countries.map(c => [c.id, c]));
  for (const entry of snapshot.countries) {
    const c = lookup.get(entry.id);
    if (!c) continue;
    get()._setPosition(entry.id, entry.position);
    get()._setRotation(entry.id, entry.rotation);
    get()._setScale(entry.id, entry.scale);
  }
};
