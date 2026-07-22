# Agent Handoff

The continuity document for any agent (or human) picking this project up. **Update this file before ending any substantial development session.** Keep it short and current — history belongs in git, design in the other docs.

_Last updated: 2026-07-22_

## Current Project State

- Stages 1–12 complete on `main`.
- Per-spawner crop size + density (`fileVersion` 2) implemented; kg-credit spawning.
- Next major feature: **Stage 13 statistics** (rolling windows).

## Current Branch

- Check `git status` — size/density work may be on a feature branch or uncommitted on `main`.

## Last Completed Stage

- **Stage 11 — Elevators** (on `main`). Follow-up: spawner size/density distributions.

## Work Currently In Progress

- Nothing after size/density implementation (commit if pending).

## Next Recommended Task

- **Stage 13 — Statistics**.

## Important Files

- `src/simulation/cropSize.ts` — bias sample, volume, mass
- `src/simulation/spawning.ts` — kg-credit accumulator
- `src/elements/cropTypes.ts` — size limits + default density
- `src/serialization/migrations.ts` — V1→V2 spawner defaults

## Commands

```bash
npm ci && npm run test && npm run typecheck && npm run dev
```

## Test Status

- Run `npm run test` after changes (expect size/migration tests included).

## Known Errors

- None. Open gaps: KI-004, KI-005; Stage 13–15 remaining.

## Uncommitted Work

- Check `git status`.

## Architectural Constraints (do not violate)

- 1 world unit = 1 metre; Y-up; flow along local +X; yaw radians CCW about +Y.
- Fixed physics timestep 1/60 s; simulation on fixed steps only.
- Crops: per-type pools; global `maxActiveCrops` cap (ADR-005).
- Save format: versioned JSON, schema-validated; current `fileVersion` 2.

## Suggested Starting Point for the Next Agent

1. Commit/push size-density work if still local.
2. Start Stage 13 statistics per `docs/ROADMAP.md`.
