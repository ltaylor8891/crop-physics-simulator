# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-22_

## Current Project State

- Stages 1–13 complete on `feature/statistics` (merge to `main` when ready).
- Post-Reset lag fix (ADR-017) and potato disk visual fix retained; Stage 14 pile-perf pass was reverted at user request.
- **Bucket elevators temporarily removed**: not in library; `fileVersion` 3 strips them on load; sim/mesh code kept behind `TEMPORARILY_DISABLED_ELEMENT_TYPES`.
- Toolbar: open file name, Taynium logo (`public/taynium-logo.svg`), copyright.
- Next major feature: **Stage 14 performance**, or re-enable elevators when requested.

## Current Branch

- `feature/statistics`

## Last Completed Stage

- **Stage 13 — Statistics**.

## Work Currently In Progress

- None — verify + commit if not yet committed.

## Next Recommended Task

1. Commit/push pending Reset-lag + disk fixes; merge `feature/statistics` → `main`.
2. **Stage 14 — Performance optimisation** when the user wants another pass.

## Important Files

- `src/physics/CropBodies.tsx` — world-API crop pools + InstancedMesh
- `src/simulation/cropRuntime.ts` — active-only `syncInstanceScales`
- `src/physics/PhysicsWorld.tsx` — `interpolate={false}`
- `docs/DECISIONS.md` — ADR-017

## Commands

```bash
npm ci && npm run test && npm run typecheck && npm run dev
```

## Test Status

- Run full gate: `npm run typecheck && npm run lint && npm run test && npm run build`.

## Known Errors

- None from this fix. Open gaps: KI-004, KI-005; Stage 14 FPS hand-check.

## Uncommitted Work

- Check `git status`.

## Architectural Constraints (do not violate)

- 1 world unit = 1 metre; Y-up; flow along local +X; yaw radians CCW about +Y.
- Fixed physics timestep 1/60 s; simulation on fixed steps only.
- Crops: per-type pools; global `maxActiveCrops` cap (ADR-005); no Rapier render interpolation with pools (ADR-017).
- Save format: versioned JSON, schema-validated; current `fileVersion` 3.

## Suggested Starting Point for the Next Agent

1. Confirm Reset-lag + sphere visual fixes are committed.
2. Merge Stage 13 branch; start Stage 14 only when requested.
