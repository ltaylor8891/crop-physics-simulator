# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-22_

## Current Project State

- Stages 1–13 complete on `feature/statistics` (merge to `main` when ready).
- Rolling 10 s In/Out throughput, per-zone collected t/h, FPS in status bar.
- Next major feature: **Stage 14 performance**.

## Current Branch

- `feature/statistics` (or `main` after merge).

## Last Completed Stage

- **Stage 13 — Statistics**.

## Work Currently In Progress

- Verify + commit/push if pending.

## Next Recommended Task

- Merge/push Stage 13, then **Stage 14 — Performance optimisation**.

## Important Files

- `src/simulation/rollingWindow.ts` — 10 s mass windows
- `src/physics/SpawningSystem.tsx` — credits windows on the fixed step
- `src/rendering/FpsReporter.tsx` — render FPS → store
- `src/components/StatusBar.tsx`

## Commands

```bash
npm ci && npm run test && npm run typecheck && npm run dev
```

## Test Status

- Run `npm run test` (includes rolling-window rate tests).

## Known Errors

- None. Open gaps: KI-004, KI-005; Stage 14 FPS hand-check.

## Uncommitted Work

- Check `git status`.

## Architectural Constraints (do not violate)

- 1 world unit = 1 metre; Y-up; flow along local +X; yaw radians CCW about +Y.
- Fixed physics timestep 1/60 s; simulation on fixed steps only.
- Crops: per-type pools; global `maxActiveCrops` cap (ADR-005).
- Save format: versioned JSON, schema-validated; current `fileVersion` 2.

## Suggested Starting Point for the Next Agent

1. Merge `feature/statistics` → `main` if not already.
2. Start Stage 14 performance per `docs/ROADMAP.md`.
