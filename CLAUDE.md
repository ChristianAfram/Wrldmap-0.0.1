# World Builder — CLAUDE.md

## Project Overview
"World Builder" is a browser-based indie game where players rearrange, rotate, scale, and merge countries on a real GeoJSON world map. The goal is an addictive sandbox + challenge experience.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Rendering**: HTML5 Canvas 2D (requestAnimationFrame loop)
- **State**: Zustand
- **Styling**: Tailwind CSS
- **Data**: Natural Earth 110m GeoJSON (fetched from CDN at runtime)
- **Backend**: Node.js + Express (port 3001) — world save/load

## Project Structure
```
/src
  /assets         Static assets (icons, fallback data)
  /components     React UI components
  /engine         Core game engine (Canvas rendering, physics, etc.)
  /store          Zustand global state
  /types          TypeScript type definitions
  /utils          Pure utility functions
/server           Express backend for persistent world saves
```

## Key Architecture Decisions
- **Canvas 2D** over Three.js: better direct control for 2D GeoJSON polygon transforms
- **Quadtree** for spatial partitioning: O(log n) hit-test and collision for 150+ countries
- **Command pattern** for undo/redo: snapshots stored in Zustand (max 50)
- **Mercator projection**: lat/lon → canvas pixel coordinates
- Countries stored as `CountryObject` with centroid as pivot for rotate/scale

## Development Commands
```bash
# Install all dependencies (root + server)
npm install

# Start frontend dev server (port 5173)
npm run dev

# Start backend server (port 3001)
npm run server

# Start both concurrently
npm run start

# Type check
npm run type-check

# Build for production
npm run build
```

## Engine Files
| File | Purpose |
|------|---------|
| `engine/Projection.ts` | lat/lon → canvas pixel (Mercator) |
| `engine/CountryEngine.ts` | GeoJSON parsing + CountryObject initialization |
| `engine/Renderer.ts` | Canvas draw loop with all visual layers |
| `engine/Quadtree.ts` | Spatial index for hit-test + collision |
| `engine/SnapSystem.ts` | Edge-proximity snapping |
| `engine/Physics.ts` | Gravity + SAT collision resolution |
| `engine/CommandHistory.ts` | Undo/redo command stack |
| `engine/HeatmapEngine.ts` | Population/climate overlay data |
| `engine/Disasters.ts` | Earthquake + volcano effects |
| `engine/Merger.ts` | Territory merging (polygon union) |
| `engine/ProceduralGen.ts` | Random country shape generation |

## Game Modes
- **Sandbox**: Free-form rearrangement with all tools
- **Challenge**: Scrambled map, timer, score = f(accuracy, time)

## Advanced Features
1. **Heatmap overlay**: Population density or climate zones as color gradient
2. **Natural disasters**: Earthquake shakes/shifts countries; volcano pushes neighbors
3. **Territory merging**: Drag countries together → merge into one polygon
4. **Procedural generation**: Generate random new country shapes

## API Endpoints (backend)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/worlds | List saved worlds |
| GET | /api/worlds/:id | Load a world |
| POST | /api/worlds | Save a world |
| DELETE | /api/worlds/:id | Delete a world |

## Performance Notes
- Quadtree rebuilt only when countries move
- Offscreen canvas for static ocean background
- Physics runs in main thread (Web Worker upgrade path exists)
- Country polygons simplified at low zoom levels
