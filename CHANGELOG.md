# Changelog

All notable changes to the Crop Physics Simulator. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); versions follow [Semantic Versioning](https://semver.org/) once distributable versions begin.

Sections used per release: **Added** · **Changed** · **Fixed** · **Breaking save-format changes** · **Performance**.

## [Unreleased]

_Nothing yet._

## [0.1.0] — 2026-07-21

### Added

- Complete design documentation suite in `docs/` (product scope, technical design, domain model, physics specification, UI/UX specification, save-file format, roadmap, ADRs, known issues, agent handoff).
- Agent guidance: `AGENTS.md` plus tool-specific pointers (`CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/project-rules.mdc`).
- Versioned layout save-format definition with JSON Schema (`schemas/layout.schema.json`) and validated sample layout (`examples/sample-layout.json`).
- Vite + React 19 + TypeScript (strict) application scaffold with ESLint, Prettier, and Vitest.
- Application shell: top toolbar, element library panel (placeholder entries), properties panel with empty state, status bar.
- Interactive 3D viewport: ground plane, metric grid (1 m minors / 5 m majors), orbit/pan/zoom camera with documented limits, WebGL-failure fallback.
- Domain types for scene elements and crop presets; Zustand store skeletons; unit-tested flow-rate conversion and element-ID utilities.
- GitHub Actions CI: install from lock file, typecheck, lint, format check, unit tests, production build.
