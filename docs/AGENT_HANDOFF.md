# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-22_

## Current Project State

- Stages 1–13 complete on **`main`** (merged from `feature/statistics`).
- Post-Reset lag fix (ADR-017) and potato disk visual fix retained; Stage 14 pile-perf pass was reverted at user request.
- **Bucket elevators temporarily removed**: not in library; `fileVersion` 3 strips them on load; sim/mesh code kept behind `TEMPORARILY_DISABLED_ELEMENT_TYPES`.
- Toolbar: open file name, Taynium logo (`public/taynium-logo.svg`), copyright.
- Next major feature: **Stage 14 performance**, or re-enable elevators when requested.

## Current Branch

- `main`

## Last Completed Stage

- **Stage 13 — Statistics** (plus follow-up pool/visual/branding fixes).

## Work Currently In Progress

- None.

## Next Recommended Task

1. **Stage 14 — Performance optimisation** when dense piles need another pass.
2. Or Stage 15 release prep / hand-check after using the app on `main`.

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

1. Work from `main` (already includes Stage 13 + pool/branding fixes).
2. Start Stage 14 only when requested; otherwise Stage 15 / hand-check.
