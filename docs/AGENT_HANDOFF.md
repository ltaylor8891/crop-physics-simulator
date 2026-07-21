# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-21_

## Current Project State

- Repository, complete design documentation, CI, and a runnable application exist.
- The app renders the full panel layout (toolbar, element library with disabled placeholder entries, properties panel empty state, status bar) around an interactive 3D viewport (ground plane, metric grid, orbit camera).
- No physics, placement, or simulation features are implemented yet.

## Current Branch

- `main` — early single-agent development is happening directly on `main` (permitted by the branching strategy while there is a single contributor; move to feature branches for larger changes, e.g. `feature/element-placement`).

## Last Completed Stage

- **Stage 3 — 3D scene and camera** (see `docs/ROADMAP.md`). Stages 1–3 complete.

## Work Currently In Progress

- Nothing in progress; the tree is clean at the last commit.

## Next Recommended Task

- **Stage 4 — Element placement**: build the element descriptor registry in `src/elements/`, wire the library panel to placement mode with a ghost preview, implement selection + move/rotate/duplicate/delete with grid snapping, backed by `sceneStore`. Acceptance criteria in `docs/ROADMAP.md` §Stage 4; interaction detail in `docs/UI_UX_SPECIFICATION.md`.

## Important Files

- `docs/PRODUCT_SCOPE.md` — authoritative scope
- `docs/TECHNICAL_DESIGN.md` — architecture; read before writing code
- `docs/DECISIONS.md` — ADRs; do not reverse silently
- `src/types/` — domain types (elements, settings, crop presets)
- `src/state/` — Zustand stores (`sceneStore`, `uiStore`, `simulationStore`)
- `src/utilities/flow.ts` — throughput/spawn-rate conversions (unit-tested)
- `src/rendering/SceneCanvas.tsx` — R3F canvas, camera, grid
- `schemas/layout.schema.json` + `examples/sample-layout.json` — save format

## Commands

```bash
npm ci             # install from lock file
npm run dev        # dev server
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run test       # vitest run
npm run build      # typecheck + production build
npm run format:check
```

## Test Status

- **Passing**: all unit tests (`src/utilities/flow.test.ts`, `src/utilities/ids.test.ts`, `src/serialization/sampleLayout.test.ts` — sample layout vs schema).
- **Failing**: none.

## Known Errors

- None. See `docs/KNOWN_ISSUES.md` for open non-error issues (KI-001…KI-003).

## Uncommitted Work

- None — working tree clean.

## Architectural Constraints (do not violate)

- 1 world unit = 1 metre; Y-up right-handed; element flow along local +X; yaw in radians CCW about +Y (ADR-003, `docs/DOMAIN_MODEL.md`).
- Fixed physics timestep 1/60 s; simulation logic on fixed steps only, never render delta (ADR-004).
- Conveyors via contact surface velocity, not moving geometry (ADR-006).
- Crops from a fixed-size pool with hard cap + spawner throttling (ADR-005).
- Stores hold serialisable plain data only; per-frame transforms bypass React state.
- Save format changes require version bump + migration + doc/schema/sample updates (see `docs/SAVE_FILE_FORMAT.md`).

## Decisions Requiring Review Before Reversal

- All Accepted ADRs in `docs/DECISIONS.md` (ADR-001…ADR-008). Supersede with a new ADR; never edit history silently.

## Areas Requiring User Confirmation

- Crop type presets (sizes/masses in `docs/PHYSICS_SPECIFICATION.md`) are plausible defaults — confirm with the user if realism matters to them.
- Build-area size (100 m × 100 m) and default grid snap (0.5 m) are assumptions from the UI spec, not user-confirmed.

## Suggested Starting Point for the Next Agent

1. Read `AGENTS.md`, then `README.md`, `docs/PRODUCT_SCOPE.md`, `docs/TECHNICAL_DESIGN.md`, `docs/DECISIONS.md`, and this file.
2. `git status` + `git log --oneline -15` to confirm the state described here.
3. `npm ci && npm run test && npm run typecheck && npm run dev` to verify the baseline.
4. Start Stage 4 (element placement) per `docs/ROADMAP.md`.
