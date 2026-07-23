# Agent Instructions

Instructions for any AI agent (or new human contributor) working in this repository. Tool-specific files (`CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/project-rules.mdc`) defer to this file — this is the single authoritative set of agent instructions.

## Before You Change Anything

1. Read `README.md` (project overview, commands).
2. Read `docs/PRODUCT_SCOPE.md` (authoritative functional scope).
3. Read `docs/TECHNICAL_DESIGN.md` (architecture you must work within).
4. Read `docs/DECISIONS.md` (ADRs — settled decisions and why).
5. Read `docs/AGENT_HANDOFF.md` (current state, in-progress work, next task).
6. Inspect the repository state: `git status` and `git log --oneline -15`. Trust the working tree over any doc that disagrees with it, and fix the doc.

## Hard Rules

- **Preserve the coordinate system and unit conventions**: 1 world unit = 1 metre, Y-up right-handed, element flow along local +X, yaw in radians CCW about +Y, SI internally with user units (t/h, m/min, degrees) only at the UI edge. Defined in `docs/DOMAIN_MODEL.md`.
- **Do not replace working architecture without documenting it.** Reversing or superseding any Accepted ADR requires a new ADR entry in `docs/DECISIONS.md` first, plus updates to affected docs.
- **Keep the project runnable.** `npm run dev` and `npm run build` must work at the end of every stage; `main` stays in a runnable state.
- **Verify before finishing**: run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, and `npm run build` before declaring work complete — the same steps CI runs (`.github/workflows/ci.yml`); omitting `format:check` left CI red for the project's entire early history. Report any failures honestly rather than hiding them.
- **Update documentation when behaviour changes**: the relevant `docs/*.md`, `CHANGELOG.md` for user-visible changes, `schemas/layout.schema.json` + `docs/SAVE_FILE_FORMAT.md` + a version bump + migration for save-format changes.
- **Update `docs/AGENT_HANDOFF.md` before handing over** (state, branch, next task, test status, uncommitted work).
- **Never commit secrets or machine-specific configuration** — no API keys, tokens, absolute local paths, or personal data. This app needs no environment variables; be suspicious of any change that introduces them.
- **Use focused commits** with the established style (`docs:`, `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `ci:`) rather than one large commit. Do not commit build output, `node_modules/`, or temporary agent files.
- **Report incomplete work and known limitations clearly** — in your summary to the user, in `docs/KNOWN_ISSUES.md`, and in `docs/AGENT_HANDOFF.md`. Never present unverified behaviour as verified.

## Working Conventions

- TypeScript strict; no `any` without a comment justifying it; no new plain-JS source files.
- Pure logic (conversions, serialization, calculations) goes in `src/utilities`/`src/serialization`/`src/types` with unit tests beside it; React/three/Rapier imports are forbidden in those layers.
- Zustand stores hold serialisable plain data only; per-frame data flows through refs/`useFrame`, never React state.
- Simulation logic runs on the fixed physics timestep, never on render frames.
- Follow the roadmap stages (`docs/ROADMAP.md`) in order unless the user directs otherwise; update stage statuses as you go.
