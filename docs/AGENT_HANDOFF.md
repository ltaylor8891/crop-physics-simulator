# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-21_

## Current Project State

- Repository, complete design documentation, CI, and a runnable application exist.
- Element placement works for all five types; conveyors render as parametric machines.
- **Conveyor physics is live**: Rapier world (fixed 1/60 s), ground + belt/skirt colliders, belt conveyance via `kinematicVelocity` + per-step translation pin (ADR-006). Toolbar **Drop ball** / **Reset** for Stage 6 testing. Other element types still have placeholder visuals and no physics yet.
- Dev hooks: `window.__cropSim` (stores including `useDebugStore`), `?seed=conveyors` / `?seed=physics`.

## Current Branch

- `main` after merging `feature/conveyor-physics`. Use focused feature branches for stage-sized changes.

## Last Completed Stage

- **Stage 6 — Conveyor physics** (see `docs/ROADMAP.md`). Stages 1–6 complete.

## Work Currently In Progress

- Nothing in progress; the tree is clean at the last commit.

## Next Recommended Task

- **Stage 7 — Properties editor**: type-driven property forms from element descriptors, clamped numeric inputs with inline constraints, name editing, duplicate/delete (buttons already exist). While in the viewport, hand-verify KI-004 (drag-move) and KI-005 (ball rides belt / stopped belt holds). Acceptance criteria in `docs/ROADMAP.md` §Stage 7.

## Important Files

- `docs/PRODUCT_SCOPE.md` — authoritative scope
- `docs/TECHNICAL_DESIGN.md` — architecture; read before writing code
- `docs/DECISIONS.md` — ADRs; do not reverse silently (ADR-006 mechanism now recorded)
- `docs/PHYSICS_SPECIFICATION.md` — physics contract
- `src/physics/` — `PhysicsWorld`, `ConveyorColliders`, `GroundCollider`, `DebugBalls`, `beltVelocity`, collision groups, materials
- `src/elements/registry.ts` — element descriptors
- `src/rendering/` — visuals (`ConveyorMesh`, placement, selection)
- `src/state/` — `sceneStore`, `uiStore`, `simulationStore`, `debugStore`
- `src/utilities/` — flow, snap, ids (unit-tested)

## Commands

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run format:check
```

## Test Status

- **Passing**: 52 unit tests across utilities, registry, conveyor geometry, belt velocity/orientation, layout schema.
- **Failing**: none.

## Known Errors

- None. Open verification gaps: KI-004, KI-005. KI-002 closed.
- Fixed on `main` (`dc809d7`): Stage 6 briefly crashed the viewport with a Zustand `getSnapshot` infinite loop in `ConveyorColliders` (misreported as “WebGL unavailable”). Refresh if you still see the old error.

## Uncommitted Work

- None — working tree clean.

## Architectural Constraints (do not violate)

- 1 world unit = 1 metre; Y-up right-handed; element flow along local +X; yaw in radians CCW about +Y (ADR-003).
- Fixed physics timestep 1/60 s; simulation logic on fixed steps only (ADR-004).
- Conveyors via kinematic-velocity surface motion with pinned translation — not moving geometry (ADR-006).
- Crops from a fixed-size pool with hard cap + spawner throttling (ADR-005) — Stage 8/9.
- Stores hold serialisable plain data only; per-frame transforms bypass React state.
- Save format changes require version bump + migration + doc/schema/sample updates.

## Decisions Requiring Review Before Reversal

- All Accepted ADRs in `docs/DECISIONS.md` (ADR-001…ADR-008).

## Areas Requiring User Confirmation

- Crop type presets and build-area / grid-snap assumptions (unchanged).

## Suggested Starting Point for the Next Agent

1. Read `AGENTS.md`, then `README.md`, `docs/PRODUCT_SCOPE.md`, `docs/TECHNICAL_DESIGN.md`, `docs/DECISIONS.md`, and this file.
2. `git status` + `git log --oneline -15`.
3. `npm ci && npm run test && npm run typecheck && npm run dev`.
4. Hand-check KI-005 (Drop ball on a running conveyor), then start Stage 7.
