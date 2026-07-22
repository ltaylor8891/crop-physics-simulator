# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-22_

## Current Project State

- Stages 1–13 complete on **`main`** (merged from `feature/statistics`).
- **Production crop-spawn bug root-caused and fixed**: crops never spawned in any production build — not a WASM issue (KI-008 rewritten). `CropBodies`' parent effect reset the pools after the per-type child effects had bound them; StrictMode's dev-only second effect pass masked it. Fix: `cropRuntime.configure()` resets only on real capacity change and runs inside each pool's bind effect. Verified live against `vite preview` (crops spawn, ~40 t/h in, no PHYSICS LOADING).
- Post-Reset lag fix (ADR-017) and potato disk visual fix retained; Stage 14 pile-perf pass was reverted at user request.
- **Bucket elevators temporarily removed**: not in library; `fileVersion` 3 strips them on load; sim/mesh code kept behind `TEMPORARILY_DISABLED_ELEMENT_TYPES`.
- Toolbar: open file name, Taynium logo (`public/taynium-logo.svg`), copyright.
- Deploy fix: build copies `rapier_wasm3d_bg.wasm` into `dist/assets/` (required for crops on static hosts).
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

- Full gate passed with the crop-spawn fix (`typecheck`, `lint`, `test` 136/136 incl. 3 new regression tests, `build`). Production behaviour hand-verified in a browser against `vite preview` of `dist/`.

## Known Errors

- None from this fix. Open gaps: KI-004, KI-005; Stage 14 FPS hand-check. KI-008 closed for real (pool reset ordering, not WASM).

## Uncommitted Work

- None. The crop-spawn fix is committed to `main` (fix: code + tests, docs: changelog/KI-008/handoff). The pre-existing `initRapier()` stash was dropped at the user's request (superseded by the root-cause fix).
- `.claude/launch.json` (untracked) contains a machine-specific npm path for browser preview — do not commit.

## Architectural Constraints (do not violate)

- 1 world unit = 1 metre; Y-up; flow along local +X; yaw radians CCW about +Y.
- Fixed physics timestep 1/60 s; simulation on fixed steps only.
- Crops: per-type pools; global `maxActiveCrops` cap (ADR-005); no Rapier render interpolation with pools (ADR-017).
- Save format: versioned JSON, schema-validated; current `fileVersion` 3.

## Suggested Starting Point for the Next Agent

1. Work from `main` (already includes Stage 13 + pool/branding fixes).
2. Start Stage 14 only when requested; otherwise Stage 15 / hand-check.
