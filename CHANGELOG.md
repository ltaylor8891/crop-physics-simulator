# Changelog

All notable changes to the Crop Physics Simulator. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); versions follow [Semantic Versioning](https://semver.org/) once distributable versions begin.

Sections used per release: **Added** · **Changed** · **Fixed** · **Breaking save-format changes** · **Performance**.

## [Unreleased]

### Fixed

- Crops jumping near collection zones overlapping conveyors: belt speed is applied only on top-surface contacts (not side/end hits), and despawned bodies are disabled before they are teleported out of the world.
- Crop instances vanishing at some camera angles: disable frustum culling on the pooled `InstancedMesh` (bounds are based on the mesh origin, not per-instance transforms).
- Spawning stuck on **THROTTLED**: crop body/collider binding now retries until the pool is ready (and no longer reports throttle while unbound). Floor despawn after `floorDespawnSeconds` returns crops to the pool so the cap can recover.
- Belt speed accuracy: riders now travel at the labelled m/min (converted to m/s) via per-step contact velocity injection on a fixed belt collider (ADR-016), instead of relying on friction against a pinned kinematic belt. Removed debug-ball linear damping that systematically undershot belt speed.

### Added

- Elevators (roadmap Stage 11): parametric casing/head/spout mesh; base intake AABB; transit delay `height/transportSpeed`; FIFO queue with `dischargeRateCap` fractional accumulator; discharge along local +X with spawn-style jitter; status bar **In elevator** count.
- Crop physics (roadmap Stage 9): one instanced pool per crop type (ball / capsule / ball) with preset friction, restitution, mass, CCD, and light linear damping; global active cap still `maxActiveCrops`.
- Floor and zone despawn (roadmap Stage 10): ground contact despawn after `floorDespawnSeconds`; immediate collection/despawn zone volumes with collected vs spilled mass accounting.
- Save / load layouts (roadmap Stage 12): **New**, **Load**, **Save** in the toolbar; Ctrl+S / Ctrl+O; drag-drop JSON onto the window; schema-validated parse with migration scaffold; load errors leave the scene untouched; camera pose round-trips.
- Crop spawning (roadmap Stage 8): enabled spawners emit crops on the fixed physics step at the configured t/h rate (fractional accumulator). `CropPool` + pooled Rapier bodies (`InstancedRigidBodies`); position/velocity jitter; throttle when the pool is full; **Reset** clears crops. Dev seed `?seed=spawn`. Long-run mass rate covered by unit tests within 1%.
- Properties editor (roadmap Stage 7): schema-driven fields for every element type — editable name, position, rotation, and equipment properties with range validation (invalid input reverts and shows the constraint). Conveyor edits update mesh and physics live.
- Conveyor physics (roadmap Stage 6): Rapier world with fixed 1/60 s timestep, ground collider, belt and skirt colliders with documented collision groups/materials. Belts use contact velocity injection for surface motion (ADR-016). Toolbar **Drop ball** / **Reset** for temporary test balls.
- Parametric conveyor rendering (roadmap Stage 5): belt surface, frame rails, vertical support legs that follow the belt line, optional side skirts, and amber direction chevrons pointing to the discharge end. Incline pivots about the infeed end so the infeed stays at the configured belt height.
- Dev-only debugging hooks: `window.__cropSim` store access and `?seed=conveyors` / `?seed=physics` / `?seed=spawn` demo seeding (excluded from production builds).
- Element placement (roadmap Stage 4): place belt conveyors, bucket elevators, crop spawners, collection zones, and despawn zones from the library with a ghost preview, grid snapping (0.5 m / 15°), Shift for repeated placement, and Escape/right-click to cancel.
- Selection with highlight, drag-move on the ground plane (clamped to the build area), rotation, duplication, and deletion — via mouse, properties-panel buttons, and keyboard shortcuts (`Escape`, `Delete`, `Ctrl+D`, `R`/`Shift+R`, `G`, `Space`).
- Properties panel now shows a read-only summary (name, type, position, rotation) of the selected element.

## [0.1.0] — 2026-07-21

### Added

- Complete design documentation suite in `docs/` (product scope, technical design, domain model, physics specification, UI/UX specification, save-file format, roadmap, ADRs, known issues, agent handoff).
- Agent guidance: `AGENTS.md` plus tool-specific pointers (`CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/project-rules.mdc`).
- Versioned layout save-format definition with JSON Schema (`schemas/layout.schema.json`) and validated sample layout (`examples/sample-layout.json`).
- Vite + React 19 + TypeScript (strict) application scaffold with ESLint, Prettier, and Vitest.
- Application shell: top toolbar, element library panel (placeholder entries), properties panel with empty state, status bar.
- Interactive 3D viewport: ground plane, metric grid (1 m minors / 5 m majors), orbit/pan/zoom camera with documented limits, WebGL-failure fallback.
- Domain types for scene elements and crop presets; Zustand store skeletons; unit-tested flow-rate conversion and element-ID utilities.
- GitHub Actions CI: install from lock file, typecheck, lint, format check, unit tests, production build.
