# Roadmap

Development stages, in order. Statuses: **Not started** · **In progress** · **Blocked** · **Complete**. Update this file whenever a stage changes state; `docs/AGENT_HANDOFF.md` points at the current stage.

| #   | Stage                               | Status      |
| --- | ----------------------------------- | ----------- |
| 1   | Repository and design documentation | Complete    |
| 2   | Application shell                   | Complete    |
| 3   | 3D scene and camera                 | Complete    |
| 4   | Element placement                   | Complete    |
| 5   | Conveyor rendering                  | Complete    |
| 6   | Conveyor physics                    | Complete    |
| 7   | Properties editor                   | Complete    |
| 8   | Crop spawning                       | Not started |
| 9   | Crop physics                        | Not started |
| 10  | Floor despawning                    | Not started |
| 11  | Elevators                           | Not started |
| 12  | Saving and loading                  | Not started |
| 13  | Statistics                          | Not started |
| 14  | Performance optimisation            | Not started |
| 15  | Testing and release preparation     | Not started |

## Stage 1 — Repository and design documentation

- **Objective**: portable repository with the complete design scope committed.
- **Deliverables**: git repo, `.gitignore`, README, all `docs/*.md`, `AGENTS.md` + tool guidance files, `CHANGELOG.md`, JSON schema, sample layout, CI workflow.
- **Acceptance criteria**: fresh clone contains everything an agent needs without chat history; docs cross-reference correctly; CI defined.
- **Dependencies**: none.
- **Status**: Complete.

## Stage 2 — Application shell

- **Objective**: runnable Vite + React + TypeScript app with panel layout and quality tooling.
- **Deliverables**: scaffold with pinned deps and lock file; scripts (`dev/build/preview/typecheck/lint/test/format`); ESLint/Prettier/Vitest configured; app chrome (toolbar, library panel, properties panel, status bar) with empty states per `UI_UX_SPECIFICATION.md`.
- **Acceptance criteria**: `npm ci && npm run dev` shows the shell; `typecheck`, `lint`, `test`, `build` all pass.
- **Dependencies**: Stage 1.
- **Status**: Complete.

## Stage 3 — 3D scene and camera

- **Objective**: interactive 3D viewport.
- **Deliverables**: R3F canvas with lighting, ground plane + grid, OrbitControls with documented limits, initial camera pose, WebGL-failure fallback message.
- **Acceptance criteria**: orbit/pan/zoom work with documented mouse bindings; 60 FPS empty-scene; grid reflects 1 unit = 1 m (majors every 5 m).
- **Dependencies**: Stage 2.
- **Status**: Complete.

## Stage 4 — Element placement

- **Objective**: place, select, move, rotate, duplicate, delete elements.
- **Deliverables**: element registry/descriptors (`src/elements`), library panel wired to placement mode with ghost preview, grid snapping, selection + highlight, keyboard shortcuts (`Escape`, `Delete`, `Ctrl+D`, `R`), `sceneStore` actions.
- **Acceptance criteria**: full placement workflow of `UI_UX_SPECIFICATION.md` works with placeholder box meshes for every element type; IDs conform to `DOMAIN_MODEL.md`.
- **Dependencies**: Stage 3.
- **Status**: Complete. Placement/selection/rotation/duplication/deletion verified in-browser; drag-move implemented but verified only by code review and unit-tested helpers — re-check by hand alongside Stage 5 (noted in `KNOWN_ISSUES.md` KI-004). The `F` (frame camera) and `?` (shortcut overlay) shortcuts are deferred.

## Stage 5 — Conveyor rendering

- **Objective**: conveyors look like conveyors and reflect their properties.
- **Deliverables**: parametric conveyor mesh (belt, frame, skirts, direction chevrons) driven by length/width/beltHeight/incline; ghost + selection visuals.
- **Acceptance criteria**: property changes update geometry immediately; incline pivots about the infeed end; direction indicator matches local +X.
- **Dependencies**: Stage 4.
- **Status**: Complete. Geometry is derived reactively from properties (verified via dev-seeded property overrides and unit tests in `src/rendering/elements/conveyorGeometry.test.ts`); flat, rotated, and 15°-inclined conveyors verified visually in a headless browser. The placement ghost remains a bounding box rather than a translucent conveyor mesh (acceptable; revisit if it confuses users).

## Stage 6 — Conveyor physics

- **Objective**: physical belts that carry dynamic bodies.
- **Deliverables**: Rapier world wiring, machine colliders with collision groups per `PHYSICS_SPECIFICATION.md`, contact surface velocity along the belt (flat + inclined), a temporary debug "drop test ball" button.
- **Acceptance criteria**: test ball dropped on a running belt reaches belt speed and is carried to discharge, including on ±20° inclines; stopped belts hold the ball; ADR-006 consequences updated with the mechanism actually used.
- **Dependencies**: Stage 5.
- **Status**: Complete. Mechanism: `kinematicVelocity` belt + per-step translation pin (ADR-006 / KI-002 closed). Toolbar **Drop ball** / **Reset** enabled. Hand-verify conveyance on flat and inclined belts when next in the viewport (acceptance criterion is interactive).

## Stage 7 — Properties editor

- **Objective**: full properties panel with validation.
- **Deliverables**: type-driven property forms from element descriptors, clamped numeric inputs with inline constraint messages, name editing, duplicate/delete buttons.
- **Acceptance criteria**: all documented ranges enforced; invalid entry reverts and shows the constraint; store never holds invalid values.
- **Dependencies**: Stage 4 (usable with placeholder meshes; richer after 5–6).
- **Status**: Complete. Schema-driven fields in `src/elements/propertySchema.ts`; number/text commit on blur/Enter with revert-on-invalid; conveyor property edits update mesh and physics colliders live.

## Stage 8 — Crop spawning

- **Objective**: spawners emit crops at the configured mass rate.
- **Deliverables**: crop type presets, `CropPool` skeleton, spawn accumulator on the fixed step (`src/simulation/spawning.ts`) using `src/utilities/flow.ts`, position/velocity jitter, enable toggle.
- **Acceptance criteria**: measured long-run spawn rate within 1 % of configured t/h; spawning pauses/resumes with the play state.
- **Dependencies**: Stage 6.
- **Status**: Not started.

## Stage 9 — Crop physics

- **Objective**: crops behave per the physics spec at scale.
- **Deliverables**: instanced crop rendering (one InstancedMesh per crop type), full pool implementation with cap + throttling, CCD, sleeping, material table from `PHYSICS_SPECIFICATION.md`.
- **Acceptance criteria**: 1 000 active crops at ≥ 60 FPS mid-range / 2 000 at ≥ 30 FPS; crops don't tunnel through belts at 300 m/min; piles settle and sleep.
- **Dependencies**: Stage 8.
- **Status**: Not started.

## Stage 10 — Floor despawning

- **Objective**: spilled crops disappear after 3 s and are counted.
- **Deliverables**: floor-contact detection, per-crop despawn timers on simulation time, spilled-mass accounting, user-placed despawn zones (immediate).
- **Acceptance criteria**: floor-touching crops vanish 3.0 s (±1 step) after first contact; timers pause with the simulation; spilled mass matches despawned crop masses exactly.
- **Dependencies**: Stage 9.
- **Status**: Not started.

## Stage 11 — Elevators

- **Objective**: vertical transport per the elevator state machine.
- **Deliverables**: elevator mesh, intake sensor, transit queue with delay, rate-capped discharge with initial velocity, "in elevator" count in stats.
- **Acceptance criteria**: crops entering the intake reappear at the discharge after `height/transportSpeed` seconds, capped at `dischargeRateCap`; behaviour matches `PHYSICS_SPECIFICATION.md` §Elevator.
- **Dependencies**: Stage 9 (Stage 8 sufficient for a first pass).
- **Status**: Not started.

## Stage 12 — Saving and loading

- **Objective**: versioned JSON save/load per `SAVE_FILE_FORMAT.md`.
- **Deliverables**: `serializeLayout`/`parseLayout` with strict validation, migration scaffold, save-download and load-picker + drag-drop, error dialog, camera state round-trip; sample layout loads.
- **Acceptance criteria**: save→load round-trip is lossless for all element types; corrupt files produce readable errors and leave the scene untouched; unit tests cover round-trip + rejection cases + `examples/sample-layout.json` against the schema.
- **Dependencies**: Stage 7 (all properties exist); ideally after 11 so all types serialise.
- **Status**: Not started.

## Stage 13 — Statistics

- **Objective**: live scene statistics per `PRODUCT_SCOPE.md`.
- **Deliverables**: statistics accumulation on the fixed step, rolling 10 s throughput windows, status-bar UI at ~4 Hz, throttled indicator, reset behaviour.
- **Acceptance criteria**: with a 40 t/h spawner feeding a collection zone losslessly, "in" and "collected" both read 40 ± 2 t/h after warm-up; spill % consistent with spilled/spawned mass.
- **Dependencies**: Stages 8, 10 (11 for elevator counts).
- **Status**: Not started.

## Stage 14 — Performance optimisation

- **Objective**: hit the performance targets on mid-range hardware.
- **Deliverables**: profiling notes in `KNOWN_ISSUES.md`, tuned solver/sleeping/damping, verified single-draw-call-per-crop-type, any needed stats/render batching.
- **Acceptance criteria**: Stage 9 numbers hold in a realistic full layout (sample layout at 2 000 crops ≥ 30 FPS).
- **Dependencies**: Stages 9–13.
- **Status**: Not started.

## Stage 15 — Testing and release preparation

- **Objective**: releasable 0.x with confidence.
- **Deliverables**: unit-test sweep of all pure logic, manual test checklist executed and recorded, cross-browser pass (Chrome/Edge/Firefox/Safari), docs/CHANGELOG brought current, version tagged.
- **Acceptance criteria**: CI green; every acceptance criterion of stages 4–14 re-verified; `KNOWN_ISSUES.md` reflects reality; `CHANGELOG.md` describes the release.
- **Dependencies**: everything above.
- **Status**: Not started.
