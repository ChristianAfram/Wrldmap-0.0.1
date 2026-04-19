# 🌍 World Builder

A browser-based indie game where you rearrange, rotate, scale, and reshape real countries on an interactive world map.

## Features

- **Drag & Drop Countries** — Move any country anywhere on the map
- **Rotate & Scale** — Resize or rotate countries with mouse or keyboard shortcuts
- **Snap System** — Countries snap to each other when edges are close
- **Undo/Redo** — Full undo/redo history (Ctrl+Z / Ctrl+Y)
- **Physics Mode** — Enable gravity and watch countries fall and collide
- **Heatmap Overlays** — Visualize population density or climate zones
- **Natural Disasters** — Trigger earthquakes and volcanoes
- **Territory Merging** — Select two countries and merge them into one
- **Procedural Generation** — Generate random new country shapes
- **Challenge Mode** — Rebuild the correct Earth layout against the clock
- **Save/Load Worlds** — Persist your custom worlds via Express backend
- **Export/Import** — Export world layouts as JSON

## Quick Start

```bash
# Install all dependencies
npm install

# Start frontend (port 5173)
npm run dev

# Start backend server (port 3001) in another terminal
npm run server

# Or start both together
npm run start
```

Open http://localhost:5173

## Controls

| Action | Control |
|--------|---------|
| Move country | Left-click drag |
| Pan map | Right-click drag |
| Zoom | Mouse wheel |
| Select tool | V |
| Move tool | M |
| Rotate tool | R |
| Scale tool | S |
| Delete tool | X |
| Undo | Ctrl+Z |
| Redo | Ctrl+Y |
| Delete selected | Delete |
| Deselect | Escape |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Rendering**: HTML5 Canvas 2D (requestAnimationFrame)
- **State**: Zustand
- **Styling**: Tailwind CSS
- **Data**: Natural Earth 110m GeoJSON (fetched from CDN)
- **Backend**: Node.js + Express (save/load worlds)

## Project Structure

```
src/
  components/    React UI (Canvas, Toolbar, Sidebar, HUD)
  engine/        Game engine (Renderer, Physics, Snap, etc.)
  store/         Zustand global state
  types/         TypeScript types
  utils/         Pure utility functions
  data/          Static country metadata
server/
  index.js       Express server
  routes/        API routes
  data/worlds/   Saved world files
```

## Architecture

- **Canvas 2D** for all rendering — direct control over GeoJSON polygon transforms
- **Quadtree** spatial index for O(log n) hit-testing with 150+ countries
- **Command pattern** undo/redo — stores only deltas, not full snapshots
- **Equirectangular projection** — lon/lat maps linearly to canvas coordinates
- Countries stored as local-space polygons relative to their centroid (enables rotate/scale around pivot)
