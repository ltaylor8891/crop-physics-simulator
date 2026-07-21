# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-21_

## Current Project State

- Stages 1–10 and 12 complete on `feature/crop-physics` (merge to `main` when ready).
- Per-type crop pools (wheat / potato capsule / sugar beet), floor + zone despawn, save/load on `main`.
- Next major feature: **Stage 11 elevators**.

## Current Branch

- `feature/crop-physics` (ahead of `main` which already has Stages 8+12).

## Last Completed Stage

- **Stage 9 — Crop physics** and **Stage 10 — Floor/zone despawning**.

## Work Currently In Progress

- Nothing after Stage 9/10 commit.

## Next Recommended Task

- Merge/push `feature/crop-physics`, then **Stage 11 — Elevators**.

## Important Files

- `src/physics/CropBodies.tsx` — per-type InstancedRigidBodies
- `src/simulation/cropRuntime.ts`, `zoneVolume.ts`
- `src/physics/SpawningSystem.tsx`

## Commands

```bash
npm ci && npm run test && npm run typecheck && npm run dev
```

## Test Status

- **Passing**: 98 unit tests.
- **Failing**: none known.

## Known Errors

- None. Open gaps: KI-004, KI-005; Stage 9 FPS acceptance is interactive (Stage 14); Stage 13 will replace session-average t/h with rolling windows.

## Uncommitted Work

- None after Stage 9/10 commit.

## Architectural Constraints (do not violate)

- 1 world unit = 1 metre; Y-up; flow along local +X; yaw radians CCW about +Y.
- Fixed physics timestep 1/60 s; simulation on fixed steps only.
- Crops: per-type pools; global `maxActiveCrops` cap (ADR-005).
- Save format: versioned JSON, schema-validated.

## Suggested Starting Point for the Next Agent

1. Merge `feature/crop-physics` → `main` and push.
2. Start Stage 11 elevators per `docs/ROADMAP.md` / `PHYSICS_SPECIFICATION.md`.
