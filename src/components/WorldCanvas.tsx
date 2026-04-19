import { useRef, useEffect, useCallback, useState } from 'react';
import { useWorldStore } from '../store/worldStore';
import { renderFrame } from '../engine/Renderer';
import { hitTestCountry, buildPath2D, computeAABB } from '../engine/CountryEngine';
import { computeSnap } from '../engine/SnapSystem';
import { tickPhysics } from '../engine/Physics';
import { updateParticles } from '../engine/Disasters';
import { eventToCanvas, screenToCanvas, zoomViewport } from '../engine/Projection';
import type { CountryObject, Vec2 } from '../types';

type DragMode = 'move' | 'rotate' | 'scale';

interface DragState {
  active: boolean;
  country: CountryObject | null;
  mode: DragMode;
  startCanvasPos: Vec2;
  startCountryPos: Vec2;
  startRotation: number;
  startScale: number;
  startMouseAngle: number;
  startMouseDist: number;
  fromPos: Vec2;
  fromRot: number;
  fromScale: number;
}

const initDrag = (): DragState => ({
  active: false,
  country: null,
  mode: 'move',
  startCanvasPos: { x: 0, y: 0 },
  startCountryPos: { x: 0, y: 0 },
  startRotation: 0,
  startScale: 1,
  startMouseAngle: 0,
  startMouseDist: 1,
  fromPos: { x: 0, y: 0 },
  fromRot: 0,
  fromScale: 1,
});

interface PanState {
  active: boolean;
  startScreen: Vec2;
  startVp: { x: number; y: number; zoom: number };
}

export const WorldCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTime = useRef<number>(0);
  const drag = useRef<DragState>(initDrag());
  const pan = useRef<PanState>({ active: false, startScreen: { x: 0, y: 0 }, startVp: { x: 0, y: 0, zoom: 1 } });

  const store = useWorldStore();
  const storeRef = useRef(store);
  storeRef.current = store;

  // Initialize on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;

    storeRef.current.init(canvas);

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime.current) / 1000, 0.05);
      lastTime.current = time;

      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

      const s = storeRef.current;

      // Scale context for DPR
      const dpr = window.devicePixelRatio;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Physics tick
      if (s.physicsEnabled && s.quadtree && s.countries.length) {
        tickPhysics(s.countries, s.quadtree, dt);
      }

      // Volcano particle update
      if (s.volcanos.length) {
        const updated = updateParticles(s.volcanos, dt);
        if (updated.length !== s.volcanos.length) s.updateVolcanos(updated);
      }

      // Score update in challenge mode
      if (s.challenge.active && !s.challenge.completed) {
        const accuracy = computeAccuracy(s.countries);
        if (accuracy > 0.95 && s.countries.length > 0) {
          s.endChallenge();
        }
      }

      renderFrame(ctx, {
        countries: s.countries,
        selectedIds: s.selectedIds,
        hoveredId: s.hoveredId,
        viewport: s.viewport,
        heatmapType: s.heatmapType,
        physicsEnabled: s.physicsEnabled,
        snapIndicators: s.snapIndicators,
        volcanos: s.volcanos,
        showGhosts: s.showGhosts,
        gameMode: s.mode,
        showNames: s.showNames,
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const getCanvasPos = useCallback((e: React.MouseEvent | MouseEvent): Vec2 => {
    const canvas = canvasRef.current!;
    return eventToCanvas(e, canvas, storeRef.current.viewport);
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const s = storeRef.current;
    const canvasPos = getCanvasPos(e);

    // Right-click = pan
    if (e.button === 2) {
      pan.current = { active: true, startScreen: { x: e.clientX, y: e.clientY }, startVp: { ...s.viewport } };
      return;
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    // Scale context for hit test
    const dpr = window.devicePixelRatio;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const country = s.quadtree ? hitTestCountry(canvasPos, s.countries, s.quadtree, ctx) : null;

    if (!country) {
      s.setSelected([]);
      return;
    }

    // Bring to front
    const countries = storeRef.current.countries.map(c =>
      c.id === country.id ? { ...c, zIndex: 9999 } : c
    );
    // Re-sort
    countries.sort((a, b) => a.zIndex - b.zIndex);
    countries.forEach((c, i) => { c.zIndex = i; });

    if (s.tool === 'delete') {
      s.setSelected([country.id]);
      s.deleteSelected();
      return;
    }

    // Select
    if (e.shiftKey) s.toggleSelected(country.id);
    else s.setSelected([country.id]);

    const pivotX = country.centroid.x + country.position.x;
    const pivotY = country.centroid.y + country.position.y;
    const dx = canvasPos.x - pivotX;
    const dy = canvasPos.y - pivotY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.sqrt(dx * dx + dy * dy);

    const mode: DragMode =
      s.tool === 'rotate' ? 'rotate' :
      s.tool === 'scale' ? 'scale' : 'move';

    drag.current = {
      active: true,
      country: { ...country },
      mode,
      startCanvasPos: { ...canvasPos },
      startCountryPos: { ...country.position },
      startRotation: country.rotation,
      startScale: country.scale,
      startMouseAngle: angle,
      startMouseDist: dist || 1,
      fromPos: { ...country.position },
      fromRot: country.rotation,
      fromScale: country.scale,
    };
  }, [getCanvasPos]);

  const handlePointerMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    const s = storeRef.current;
    const canvasPos = getCanvasPos(e);

    // Pan
    if (pan.current.active) {
      const dx = e.clientX - pan.current.startScreen.x;
      const dy = e.clientY - pan.current.startScreen.y;
      s.setViewport({ zoom: pan.current.startVp.zoom, x: pan.current.startVp.x + dx, y: pan.current.startVp.y + dy });
      return;
    }

    // Hover detection
    if (!drag.current.active) {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      const hovered = s.quadtree ? hitTestCountry(canvasPos, s.countries, s.quadtree, ctx) : null;
      s.setHovered(hovered?.id ?? null);
      return;
    }

    const d = drag.current;
    if (!d.country) return;

    const country = s.countries.find(c => c.id === d.country!.id);
    if (!country) return;

    if (d.mode === 'move') {
      const dx = canvasPos.x - d.startCanvasPos.x;
      const dy = canvasPos.y - d.startCanvasPos.y;
      const newPos = { x: d.startCountryPos.x + dx, y: d.startCountryPos.y + dy };
      s.moveCountry(country.id, newPos);

      // Snap indicator
      const nearby = s.quadtree
        ? s.quadtree.query(country.aabb).map(item => s.countries.find(c => c.id === item.id)).filter(Boolean) as CountryObject[]
        : [];
      const updatedCountry = s.countries.find(c => c.id === country.id) ?? country;
      const snap = computeSnap({ ...updatedCountry, position: newPos }, nearby);
      s.setSnapIndicators(snap.indicators);
    } else if (d.mode === 'rotate') {
      const pivotX = country.centroid.x + country.position.x;
      const pivotY = country.centroid.y + country.position.y;
      const dx = canvasPos.x - pivotX;
      const dy = canvasPos.y - pivotY;
      const angle = Math.atan2(dy, dx);
      const deltaAngle = angle - d.startMouseAngle;
      s._setRotation(country.id, d.startRotation + deltaAngle);
    } else if (d.mode === 'scale') {
      const pivotX = country.centroid.x + country.position.x;
      const pivotY = country.centroid.y + country.position.y;
      const dx = canvasPos.x - pivotX;
      const dy = canvasPos.y - pivotY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / d.startMouseDist;
      const newScale = Math.max(0.1, Math.min(10, d.startScale * ratio));
      s._setScale(country.id, newScale);
    }
  }, [getCanvasPos]);

  const handlePointerUp = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (pan.current.active) { pan.current.active = false; return; }
    if (!drag.current.active || !drag.current.country) return;

    const d = drag.current;
    const s = storeRef.current;
    const country = s.countries.find(c => c.id === d.country!.id);

    if (country && d.mode === 'move') {
      // Check snap
      const nearby = s.quadtree
        ? s.quadtree.query(country.aabb).map(item => s.countries.find(c => c.id === item.id)).filter(Boolean) as CountryObject[]
        : [];
      const snap = computeSnap(country, nearby);
      const finalPos = snap.snapped ? snap.position : country.position;
      if (snap.snapped) s.moveCountry(country.id, finalPos);
      s.commitMove(country.id, d.fromPos, finalPos);
      s.setSnapIndicators([]);
    } else if (country && d.mode === 'rotate') {
      s.commitRotate(country.id, d.fromRot, country.rotation);
    } else if (country && d.mode === 'scale') {
      s.commitScale(country.id, d.fromScale, country.scale);
    }

    drag.current = initDrag();
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const s = storeRef.current;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const newVp = zoomViewport(s.viewport, e.deltaY, screenPt);
    s.setViewport(newVp);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseMove = (e: MouseEvent) => handlePointerMove(e);
    const onMouseUp = (e: MouseEvent) => handlePointerUp(e);
    const onKeyDown = (e: KeyboardEvent) => {
      const s = storeRef.current;
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); s.undo(); }
      if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) { e.preventDefault(); s.redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') s.deleteSelected();
      if (e.key === 'Escape') s.setSelected([]);
      if (e.key === 'v') s.setTool('select');
      if (e.key === 'm') s.setTool('move');
      if (e.key === 'r') s.setTool('rotate');
      if (e.key === 's') s.setTool('scale');
      if (e.key === 'x') s.setTool('delete');
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handlePointerMove, handlePointerUp]);

  const getCursor = () => {
    const tool = store.tool;
    if (drag.current.active) return 'grabbing';
    if (tool === 'move') return 'grab';
    if (tool === 'rotate') return 'crosshair';
    if (tool === 'scale') return 'nwse-resize';
    if (tool === 'delete') return 'not-allowed';
    return 'default';
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ cursor: getCursor() }}
      onMouseDown={handlePointerDown}
      onWheel={handleWheel}
      onContextMenu={e => e.preventDefault()}
    />
  );
};

const computeAccuracy = (countries: CountryObject[]): number => {
  if (countries.length === 0) return 0;
  let total = 0;
  for (const c of countries) {
    const dx = c.centroid.x + c.position.x - c.originalCentroid.x;
    const dy = c.centroid.y + c.position.y - c.originalCentroid.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const score = Math.max(0, 1 - dist / 50);
    total += score;
  }
  return total / countries.length;
};
