# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-22_

## Current Project State

- Stages 1–12 complete on `feature/elevators` (merge to `main` when ready).
- Elevators: intake → transit queue → rate-capped discharge; parametric mesh; **In elevator** in the status bar.
- Next major feature: **Stage 13 statistics** (rolling windows).

## Current Branch

- `feature/elevators` (based on `main` after Stage 9/10 merge).

## Last Completed Stage

- **Stage 11 — Elevators**.

## Work Currently In Progress

- Nothing after Stage 11 implementation (verify + commit pending if not done).

## Next Recommended Task

- Merge/push `feature/elevators`, then **Stage 13 — Statistics**.

## Important Files

- `src/simulation/elevator.ts` — transit, intake/discharge poses, rate cap
- `src/physics/SpawningSystem.tsx` — fixed-step elevator + spawn + despawn
- `src/rendering/elements/ElevatorMesh.tsx`
- `src/simulation/cropRuntime.ts` — `tickElevatorIntake`

## Commands

```bash
npm ci && npm run test && npm run typecheck && npm run dev
```

## Test Status

- **Passing**: 110 unit tests (typecheck, lint, build clean).
- **Failing**: none known.

## Known Errors

- None. Open gaps: KI-004, KI-005; Stage 9 FPS acceptance is interactive (Stage 14); Stage 13 will replace session-average t/h with rolling windows.

## Uncommitted Work

- Stage 11 elevator implementation on `feature/elevators` (check `git status`).

## Architectural Constraints (do not violate)

- 1 world unit = 1 metre; Y-up; flow along local +X; yaw radians CCW about +Y.
- Fixed physics timestep 1/60 s; simulation on fixed steps only.
- Crops: per-type pools; global `maxActiveCrops` cap (ADR-005).
- Save format: versioned JSON, schema-validated.

## Suggested Starting Point for the Next Agent

1. Merge `feature/elevators` → `main` and push if not already.
2. Start Stage 13 statistics per `docs/ROADMAP.md`.
