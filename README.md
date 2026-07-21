# Crop Physics Simulator

A browser-based 3D simulator for agricultural crop-handling equipment. Users place conveyors, elevators, and crop spawners in a 3D scene, configure throughput (tonnes per hour, belt speed, incline), and watch individual crop bodies flow through the machinery under real-time physics.

## Purpose

The simulator lets equipment planners and enthusiasts sketch a crop-handling line (intake → conveyors → elevators → collection) and visually sanity-check geometry, belt speeds, transfer points, and throughput before anything is built. It is an **engineering approximation for visualisation and rough validation**, not a certified discrete-element-method (DEM) simulation. See [docs/PHYSICS_SPECIFICATION.md](docs/PHYSICS_SPECIFICATION.md) for the exact fidelity boundaries.

## Current Development Status

**Stage 5 of 15 complete** — repository/design documentation, application shell, the 3D scene with camera controls, element placement (place/select/move/rotate/duplicate/delete with grid snapping), and parametric conveyor rendering are in place. Conveyor physics is next. See [docs/ROADMAP.md](docs/ROADMAP.md) for the full stage list and [docs/AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md) for the precise current state.

## Main Features

Planned feature set (see [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md) for the authoritative scope):

- Element library: flat/inclined belt conveyors, bucket elevators, crop spawners, collection zones
- Real-time rigid-body crop physics (Rapier, WebAssembly)
- Conveyor motion via contact surface velocity (belts stay static; contacts are driven)
- Crop spawning driven by throughput settings (t/h → kg/s → crops/s)
- Floor despawn: crops touching the floor are removed after 3 seconds
- Scene statistics: active crops, throughput in/out, spilled mass
- Versioned JSON save/load of layouts ([docs/SAVE_FILE_FORMAT.md](docs/SAVE_FILE_FORMAT.md))

## Technology Stack

| Concern          | Choice                                                                     |
| ---------------- | -------------------------------------------------------------------------- |
| Language         | TypeScript (strict)                                                        |
| UI framework     | React 19                                                                   |
| Build tool       | Vite 8                                                                     |
| 3D rendering     | three.js via React Three Fiber (`@react-three/fiber`, `@react-three/drei`) |
| Physics          | Rapier (WASM) via `@react-three/rapier`                                    |
| State management | Zustand                                                                    |
| Testing          | Vitest                                                                     |
| Lint/format      | ESLint (flat config) + Prettier                                            |

Rationale for each choice is recorded in [docs/DECISIONS.md](docs/DECISIONS.md).

## Prerequisites

- **Node.js 24 LTS** (a `.nvmrc` / `.node-version` file is provided; Node ≥ 20.19 will work)
- **npm 10+** (the repository pins `packageManager` in `package.json`; the lock file is authoritative)
- A modern desktop browser with **WebGL 2** and **WebAssembly** support (Chrome, Edge, Firefox, Safari 16+)
- No external services, API keys, or environment variables are required

## Installation

```bash
git clone <repository-url>
cd crop-physics-simulator
npm ci        # install exactly from package-lock.json (or: npm install)
```

## Development Commands

```bash
npm run dev           # start the Vite dev server (http://localhost:5173)
npm run build         # type-check and produce a production build in dist/
npm run preview       # serve the production build locally
npm run typecheck     # TypeScript type checking only (no emit)
npm run lint          # ESLint
npm run test          # Vitest unit tests (single run)
npm run test:watch    # Vitest in watch mode
npm run format        # Prettier write
npm run format:check  # Prettier check only (used by CI)
```

## Build

`npm run build` runs `tsc --noEmit` followed by `vite build`. Output goes to `dist/` (git-ignored). Serve `dist/` with any static file server; there is no server-side component.

## Tests

`npm run test` runs Vitest against `src/**/*.test.ts(x)`. Pure logic (unit conversions, spawn-rate calculations, serialization) is unit-tested; rendering and physics behaviour are verified manually per the acceptance criteria in [docs/ROADMAP.md](docs/ROADMAP.md).

## Repository Structure

```text
├─ .github/workflows/ci.yml   # CI: install, typecheck, lint, test, build
├─ .cursor/rules/             # Cursor-specific agent guidance (points at AGENTS.md)
├─ docs/                      # Authoritative design documentation (see below)
├─ schemas/layout.schema.json # JSON Schema for the save-file format
├─ examples/                  # Sample layout files
├─ public/                    # Static assets served as-is
├─ src/
│  ├─ app/                    # App root, layout chrome
│  ├─ components/             # React UI components (panels, toolbar)
│  ├─ elements/               # Scene-element definitions and factories
│  ├─ physics/                # Physics configuration, colliders, conveyor motion
│  ├─ rendering/              # Three.js scene, camera, lighting, meshes
│  ├─ simulation/             # Spawning, despawning, statistics loops
│  ├─ state/                  # Zustand stores
│  ├─ serialization/          # Save/load, versioning, migration
│  ├─ types/                  # Domain types shared across layers
│  ├─ utilities/              # Pure helpers (unit conversions, ids, math)
│  └─ tests/                  # Cross-cutting test helpers/fixtures
├─ AGENTS.md                  # Instructions for AI agents working on this repo
├─ CHANGELOG.md
└─ README.md
```

## Basic Usage

1. `npm run dev` and open the printed URL.
2. The main viewport shows a ground plane with a grid. Orbit with left-drag, pan with right-drag, zoom with the scroll wheel.
3. Click an element type in the left-hand library, then click the ground to place it (ghost preview shows the drop position; Shift-click places repeatedly; Escape or right-click cancels).
4. Click a placed element to select it: drag to move, `R`/`Shift+R` to rotate, `Ctrl+D` to duplicate, `Delete` to remove. The right-hand panel shows its details.
5. (From Stage 8 onwards) press **Play** in the toolbar to start the simulation.

## Known Limitations

- Conveyors render as proper machines; other element types are placeholder boxes. Nothing simulates yet: physics, spawning, and save/load are stages 6–15 of the roadmap.
- Physics is an approximation: crops are simple convex bodies, not deformable grains. See [docs/PHYSICS_SPECIFICATION.md](docs/PHYSICS_SPECIFICATION.md).
- Current issues are tracked in [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md).

## Design Documents

| Document                                                       | Contents                                  |
| -------------------------------------------------------------- | ----------------------------------------- |
| [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md)                 | Authoritative functional scope            |
| [docs/TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md)           | Architecture, rendering, physics, state   |
| [docs/DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md)                   | Domain terminology and unit definitions   |
| [docs/PHYSICS_SPECIFICATION.md](docs/PHYSICS_SPECIFICATION.md) | Intended physics behaviour in detail      |
| [docs/UI_UX_SPECIFICATION.md](docs/UI_UX_SPECIFICATION.md)     | Screen layout, workflows, shortcuts       |
| [docs/SAVE_FILE_FORMAT.md](docs/SAVE_FILE_FORMAT.md)           | Versioned JSON layout format              |
| [docs/ROADMAP.md](docs/ROADMAP.md)                             | Development stages and status             |
| [docs/DECISIONS.md](docs/DECISIONS.md)                         | Architecture Decision Records             |
| [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)                   | Bugs, debt, limitations                   |
| [docs/AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md)                 | Current state and next task for any agent |
