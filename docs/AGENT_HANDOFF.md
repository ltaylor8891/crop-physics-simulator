# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-21_

## Current Project State

- Stages 1–7 complete: docs, shell, 3D scene, placement, conveyor rendering, conveyor physics, and a full properties editor.
- **Belt speed accuracy fix**: belts are `fixed`; after each physics step, contacting dynamics get tangential velocity = `beltSpeed_mPerMin / 60` (ADR-016). Debug balls no longer use linear damping that undershot speed.
- Properties panel edits name, position X/Z (and Y for spawners), rotation (degrees), and type-specific fields from `PROPERTY_FIELDS`.
- Toolbar **Drop ball** / **Reset** for Stage 6 testing.
- Dev hooks: `window.__cropSim`, `?seed=conveyors` / `?seed=physics`.

## Current Branch

- `main`. Use focused feature branches for stage-sized changes.

## Last Completed Stage

- **Stage 7 — Properties editor**. Stages 1–7 complete.

## Work Currently In Progress

- Nothing in progress; tree clean after belt-speed fix commit.

## Next Recommended Task

- Hand-check KI-005 with the new mechanism, then **Stage 8 — Crop spawning** per `docs/ROADMAP.md`.

## Important Files

- `src/physics/ConveyorColliders.tsx` — fixed belt + contact velocity injection
- `src/physics/beltVelocity.ts` — m/min → m/s, normal, `velocityWithBeltSurface`
- `docs/DECISIONS.md` — ADR-006 / ADR-016
- `src/elements/propertySchema.ts`, `src/components/PropertiesPanel.tsx`

## Commands

```bash
npm ci && npm run test && npm run typecheck && npm run dev
```

## Test Status

- **Passing**: 66 unit tests.
- **Failing**: none known.

## Known Errors

- None. Open verification gaps: KI-004, KI-005.

## Uncommitted Work

- None — working tree clean.

## Architectural Constraints (do not violate)

- 1 world unit = 1 metre; Y-up; flow along local +X; yaw radians CCW about +Y.
- Fixed physics timestep 1/60 s; simulation on fixed steps only.
- Conveyors: fixed deck + per-step tangential velocity injection (ADR-016).
- Zustand selectors must return stable references (no new arrays/objects from the selector itself).
- Stores hold serialisable plain data only.

## Suggested Starting Point for the Next Agent

1. Read `AGENTS.md` and this file; confirm `git status` / recent log.
2. Hand-verify belt travel time at a known m/min, then Stage 8.
