# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-21_

## Current Project State

- Stages 1–7 complete: docs, shell, 3D scene, placement, conveyor rendering, conveyor physics, and a full properties editor.
- Properties panel edits name, position X/Z (and Y for spawners), rotation (degrees), and type-specific fields from `PROPERTY_FIELDS`. Invalid numbers revert with an inline range message.
- Conveyor physics uses kinematic-velocity belts; toolbar **Drop ball** / **Reset** for Stage 6 testing.
- Dev hooks: `window.__cropSim`, `?seed=conveyors` / `?seed=physics`.

## Current Branch

- `main` after merging `feature/properties-editor`. Use focused feature branches for stage-sized changes.

## Last Completed Stage

- **Stage 7 — Properties editor**. Stages 1–7 complete.

## Work Currently In Progress

- Nothing in progress; the tree is clean at the last commit.

## Next Recommended Task

- **Stage 8 — Crop spawning**: crop type presets are already in `src/elements/cropTypes.ts`; build `CropPool` skeleton and spawn accumulator on the fixed step (`src/simulation/spawning.ts`) using `src/utilities/flow.ts`. While testing, hand-verify KI-004 (drag-move) and KI-005 (ball rides belt). Acceptance criteria in `docs/ROADMAP.md` §Stage 8.

## Important Files

- `src/elements/propertySchema.ts` — editor field definitions + path get/set
- `src/components/PropertiesPanel.tsx` + `src/components/fields/` — form UI
- `src/utilities/validation.ts` — parse/constrain helpers (unit-tested)
- `src/physics/` — Rapier world, conveyor colliders, debug balls
- `src/rendering/elements/ConveyorMesh.tsx` — parametric conveyor visuals
- `docs/DECISIONS.md`, `docs/PHYSICS_SPECIFICATION.md`, `docs/AGENT_HANDOFF.md`

## Commands

```bash
npm ci && npm run test && npm run typecheck && npm run dev
```

## Test Status

- **Passing**: 61 unit tests.
- **Failing**: none.

## Known Errors

- None. Open verification gaps: KI-004, KI-005. Viewport crash from Stage 6 Zustand loop fixed (`dc809d7`).

## Uncommitted Work

- None — working tree clean.

## Architectural Constraints (do not violate)

- 1 world unit = 1 metre; Y-up; flow along local +X; yaw radians CCW about +Y.
- Fixed physics timestep 1/60 s; simulation on fixed steps only.
- Conveyors via kinematic-velocity + pinned translation (ADR-006).
- Zustand selectors must return stable references (no new arrays/objects from the selector itself).
- Stores hold serialisable plain data only.

## Suggested Starting Point for the Next Agent

1. Read `AGENTS.md` and this file; confirm `git status` / recent log.
2. `npm ci && npm run test && npm run typecheck && npm run dev`.
3. Start Stage 8 (crop spawning) per `docs/ROADMAP.md`.
