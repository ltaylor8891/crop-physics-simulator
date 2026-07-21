# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-21_

## Current Project State

- Stages 1–8 complete: through crop spawning.
- Spawners emit on the fixed step at configured t/h (`CropPool` + `cropRuntime` + `SpawningSystem`). Play/pause gates spawning. **Reset** clears crops + stats.
- Belt speed uses ADR-016 contact velocity injection.
- Dev seeds: `?seed=conveyors` / `?seed=physics` / `?seed=spawn`.

## Current Branch

- `feature/crop-spawning` (Stage 8). Merge to `main` when ready.

## Last Completed Stage

- **Stage 8 — Crop spawning**.

## Work Currently In Progress

- Floor despawn is live for the ground plane; collection/despawn zones still to do.

## Next Recommended Task

- Finish Stage 10 (user-placed collection/despawn zones), or Stage 9 crop-physics polish. Hand-check `?seed=spawn`: crops should emit, THROTTLED should clear after floor spills recycle.

## Important Files

- `src/simulation/CropPool.ts`, `spawning.ts`, `cropRuntime.ts`
- `src/physics/CropBodies.tsx`, `SpawningSystem.tsx`
- `src/elements/cropTypes.ts`

## Commands

```bash
npm ci && npm run test && npm run typecheck && npm run dev
```

## Test Status

- **Passing**: 79 unit tests.
- **Failing**: none known.

## Known Errors

- None. Open verification gaps: KI-004, KI-005. Stage 8: potato capsules approximated as balls; pool mount of `maxActiveCrops` (2000) InstancedRigidBodies may be slow on first load.

## Uncommitted Work

- None after throttle/floor-despawn fix commit.

## Architectural Constraints (do not violate)

- 1 world unit = 1 metre; Y-up; flow along local +X; yaw radians CCW about +Y.
- Fixed physics timestep 1/60 s; simulation on fixed steps only.
- Conveyors: fixed deck + per-step tangential velocity injection (ADR-016).
- Crops: pooled bodies; `acquire() === null` → throttle (ADR-005).
- Zustand selectors must return stable references.
- Stores hold serialisable plain data only.

## Suggested Starting Point for the Next Agent

1. Read `AGENTS.md` and this file; confirm `git status` / recent log.
2. Interactive check `?seed=spawn`, then Stage 9 or merge Stage 8 to `main`.
