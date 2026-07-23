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

1. Stage 14 (performance) and Stage 15 (release prep) are accepted next priorities on `main`.
2. A phased feature program is planned (and approved) on the **`develop`** branch — grading screens, diverters/hoppers/chutes, ladder logic control, a stubbed PLC bridge, restyled collectors, performance, and spawner batch/state. The full plan with per-phase file touch-points lives in **`docs/DEVELOP_PROGRAM.md`** (on `develop`). **No phase is implemented yet** — the user drives which phase starts and when. Recommended order: A (conveyor legs/diverter) → B (chute/hopper) → C (grading screen) → D (control subsystem) → E (spawner batch) → F (collector restyle), with G (performance) interleaved.

## Important Files

- `src/physics/CropBodies.tsx` — world-API crop pools + InstancedMesh
- `src/simulation/cropRuntime.ts` — active-only `syncInstanceScales`
- `src/physics/PhysicsWorld.tsx` — `interpolate={false}`
- `docs/DECISIONS.md` — ADR-017

## Commands

```bash
npm ci && npm run test && npm run typecheck && npm run dev
# full pre-finish gate (matches CI):
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build
```

## Test Status

- Full gate green including `format:check` (136/136 tests). **CI is green for the first time in project history** — every one of the previous 17 runs failed on the Prettier format step because the documented local gate omitted `format:check`; the tree was reformatted (26 files) and AGENTS.md/CLAUDE.md now list the full CI gate. Production crop-spawn behaviour hand-verified against `vite preview` of `dist/`.

## Known Errors

- None outstanding from recent fixes. KI-004 narrowed to just the `F`/`?` shortcuts (drag-move itself hand-verified). KI-005 closed. KI-008 closed for real (pool reset ordering, not WASM). Remaining gap: Stage 14 FPS hand-check at 1000–2000 active crops on target hardware.

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
