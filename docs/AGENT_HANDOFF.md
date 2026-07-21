# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-21_

## Current Project State

- Repository, complete design documentation, CI, and a runnable application exist.
- The app renders the full panel layout around an interactive 3D viewport, and **element placement is functional**: all five element types can be placed via the library (ghost preview, grid snapping, Shift for repeat, Escape/right-click cancel), selected, dragged on XZ, rotated (`R`/`Shift+R`), duplicated (`Ctrl+D`/button), and deleted (`Delete`/button). Elements render as placeholder boxes until Stage 5.
- No physics or simulation features are implemented yet.

## Current Branch

- `main` (Stage 4 was developed on `feature/element-placement` and merged). Continue using focused feature branches for stage-sized changes.

## Last Completed Stage

- **Stage 4 — Element placement** (see `docs/ROADMAP.md`). Stages 1–4 complete.

## Work Currently In Progress

- Nothing in progress; the tree is clean at the last commit.

## Next Recommended Task

- **Stage 5 — Conveyor rendering**: replace the conveyor placeholder box with a parametric mesh (belt surface, frame, side skirts, direction chevrons) driven by its properties, including incline pivoting about the infeed end. Acceptance criteria in `docs/ROADMAP.md` §Stage 5. Note KI-004 in `docs/KNOWN_ISSUES.md`: hand-verify element drag-move while working in the viewport.

## Important Files

- `docs/PRODUCT_SCOPE.md` — authoritative scope
- `docs/TECHNICAL_DESIGN.md` — architecture; read before writing code
- `docs/DECISIONS.md` — ADRs; do not reverse silently
- `src/types/` — domain types (elements, settings, crop presets)
- `src/state/` — Zustand stores (`sceneStore`, `uiStore`, `simulationStore`)
- `src/elements/registry.ts` — element descriptors, defaults, bounds, factory (drives library/placement/rendering)
- `src/rendering/` — `SceneCanvas` (canvas/camera/grid), `PlacementLayer` (ghost + ground interaction), `PlacedElements` (selection/drag)
- `src/app/useKeyboardShortcuts.ts` — global shortcuts
- `src/utilities/` — `flow.ts` (throughput conversions), `snap.ts` (grid snap, build-area checks), `ids.ts` (all unit-tested)
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

- **Passing**: all unit tests — `src/utilities/flow.test.ts`, `src/utilities/ids.test.ts`, `src/utilities/snap.test.ts`, `src/elements/registry.test.ts`, `src/serialization/sampleLayout.test.ts` (37 tests).
- **Failing**: none.

## Known Errors

- None. See `docs/KNOWN_ISSUES.md` for open non-error issues (KI-001…KI-004); KI-004 flags that element drag-move needs a quick manual check.

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
4. Start Stage 5 (conveyor rendering) per `docs/ROADMAP.md`.
