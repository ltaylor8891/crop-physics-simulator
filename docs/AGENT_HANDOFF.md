# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-21_

## Current Project State

- Stages 1–8 complete; Stage 10 floor despawn (ground) in progress; **Stage 12 save/load complete** on `feature/save-load`.
- **New / Load / Save** in the toolbar; Ctrl+S / Ctrl+O; drag-drop `.json` onto the window; corrupt files show an error dialog and leave the scene untouched.
- Camera pose is stored in `uiStore` and round-trips through the layout file.

## Current Branch

- `feature/save-load` (includes crop-spawning history + frustum-cull fix). Merge when ready.

## Last Completed Stage

- **Stage 12 — Saving and loading**.

## Work Currently In Progress

- Nothing on this branch after Stage 12 commit.

## Next Recommended Task

- Merge `feature/save-load` (and underlying crop-spawning) to `main`, or continue Stage 9 / finish Stage 10 zones.

## Important Files

- `src/serialization/` — `serializeLayout`, `parseLayout`, `layoutActions`, migrations, validation
- `src/components/Toolbar.tsx`, `LoadErrorDialog.tsx`, `LayoutFileDropTarget.tsx`
- `src/rendering/SceneCameraControls.tsx`
- `examples/sample-layout.json`, `schemas/layout.schema.json`

## Commands

```bash
npm ci && npm run test && npm run typecheck && npm run dev
```

## Test Status

- **Passing**: 94 unit tests.
- **Failing**: none known.

## Known Errors

- None. Open gaps: KI-004, KI-005; Stage 9 instancing; Stage 10 collection/despawn zones.

## Uncommitted Work

- None after Stage 12 commit.

## Architectural Constraints (do not violate)

- 1 world unit = 1 metre; Y-up; flow along local +X; yaw radians CCW about +Y.
- Fixed physics timestep 1/60 s; simulation on fixed steps only.
- Save format: versioned JSON, schema-validated; runtime crops never saved.
- Zustand selectors must return stable references.

## Suggested Starting Point for the Next Agent

1. Read `AGENTS.md` and this file; confirm `git status`.
2. Try Save → Load with `examples/sample-layout.json`, then Stage 9 or merge.
