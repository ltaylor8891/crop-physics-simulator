# Develop Program — planned feature phases

Living plan for the feature program on the **`develop`** branch, kept isolated from `main` (which stays at Stages 1–13 + performance/release). This document is the approved, phased plan; **nothing here is implemented until the user requests a specific phase.** As each phase lands, fold its detail into the standard docs (`ROADMAP.md` stage, `DECISIONS.md` ADR, `PRODUCT_SCOPE.md`, `PHYSICS_SPECIFICATION.md`, `SAVE_FILE_FORMAT.md`, `CHANGELOG.md`) and trim it here to a pointer.

_Last updated: 2026-07-23 — Phase A implemented on `develop` (roadmap Stage 16, ADR-018). Phases B–G planned, not started._

## Context

The simulator currently models spawners → conveyors → zones with rigid-body crops on a fixed 1/60 s step. This program moves the product from "watch crop flow" toward "design and control a real handling line": size-grading, physical transfer aids, PLC-style control logic, better-looking collectors, denser simulations, and richer spawners.

### Confirmed design decisions (from user)

- **Grading screen**: carries oversized crop like a belt; undersized crop (< screen aperture) **falls through progressively along the deck, at the crop's own location** — it is not all removed the instant it touches the belt, and it does not teleport to a fixed discharge point. Fall-through is spread across the deck length with a **front-to-back bias** (more falls near the infeed, tapering toward the discharge) to mimic real screening, then the crop drops straight down at its current XZ onto whatever is placed below.
- **Diverter / hopper / chute**:
  - **Diverter** = a movable angled **high side wall** that locks to a conveyor's belt surface — positionable along the belt, length- and angle-adjustable relative to the belt. → **conveyor attachment**, not a standalone element.
  - **Hopper** = a **standalone** freestanding backstop/holding volume (open walls) that catches crop piling up at the top of an inclined conveyor and holds it; sensors monitor it to drive control logic.
  - **Chute** = a **standalone** flat, passive sloped surface placed at a conveyor's discharge; length- and angle-adjustable, **width driven by the feeding conveyor's width**; bridges gaps so crop falls naturally onto the next surface.
  - **Conveyor legs toggle**: legs on/off so conveyors can stack vertically without legs blocking crop passing underneath.
- **Ladder logic**: build the **tag/IO model + rule-based rung engine** now; **no graphical rung editor** yet (form/JSON panel). New **sensor** elements measure crop depth beneath them with adjustable depth sensitivity.
- **PLC bridge**: design the **tag/IO abstraction + a pluggable bridge interface with a no-op mock** now; defer protocol choice (Modbus/OPC-UA/MQTT) and any real relay process to a later phase + dedicated ADR.
- **Collectors**: restyle the existing collection zone as a **wooden open-top crate**.
- **Spawner**: add **batch mode** (volume + drop duration) and a **state function** so drops can be paused by a sensor / ladder logic.
- **Performance**: advisory recommendations for scaling active-crop counts without losing realism.

## The established "new element type" pattern (reuse for every element below)

Adding an element type touches this fixed set (verified in the current code):

1. **Type** — `src/types/elements.ts`: add `XProperties` interface, `ElementBase<'x', XProperties>` alias, `'x'` to `ElementType`, add to `SceneElement` union.
2. **Registry** — `src/elements/registry.ts`: add an `ELEMENT_DESCRIPTORS.x` entry (`label`, `defaultY`, `color`, `translucent`, `createDefaultProperties`), add to `ELEMENT_TYPES`, add a `getElementBounds` case.
3. **Property schema** — `src/elements/propertySchema.ts`: add `PROPERTY_FIELDS.x` field defs (dot-`path`, `min`/`max`/`unit`/`step`, `kind`). The `PropertiesPanel` renders from this table with no per-type UI code.
4. **Rendering** — `src/rendering/PlacedElements.tsx`: add an `else if (element.type === 'x')` branch selecting a new `src/rendering/elements/XMesh.tsx`; factor pure geometry math into a `src/rendering/elements/xGeometry.ts` (React/three-free, unit-tested) like `conveyorGeometry.ts`.
5. **Physics** — new `src/physics/XColliders.tsx` sibling in `src/physics/PhysicsWorld.tsx` for real colliders; or, for volume sensing, a pure `isPointInsideZone`-style test consumed inside the fixed step. Collision groups from `src/physics/collisionGroups.ts`.
6. **Simulation** — new pure `src/simulation/x.ts` (no React/Rapier) for any stateful runtime, with a `Map<ElementId, XRuntimeState>` owned by `SpawningSystem.tsx` and pruned in its `sceneStore.subscribe` diff (mirror `elevatorRuntimes`).
7. **Serialization** — `src/serialization/types.ts` (bump `CURRENT_FILE_VERSION`), `schemas/layout.schema.json` (new `oneOf` branch mirroring the property ranges), and a `migrateV3toV4`-style migration in the serialization migration chain + `migrations.test.ts` when existing element shapes gain required fields.

**Precedents to reuse rather than reinvent:** elevator transit queue (`src/simulation/elevator.ts`) for teleport-and-drop; `isPointInsideZone` (`src/simulation/zoneVolume.ts`) for volume/footprint tests; the mass-credit accumulator (`advanceSpawnAccumulator`/`cropsPerSecond` in `src/utilities/flow.ts`) for any rate-capped emission; spawner `enabled` gating in `src/simulation/spawning.ts` for programmatic on/off; per-zone-id stats in `simulationStore` for per-element live values.

---

## Phase A — Conveyor enhancements (legs toggle, diverter attachment) — ✅ DONE

Implemented on `develop` (roadmap Stage 16, ADR-018, `fileVersion` 4). Smallest, self-contained, no new simulation subsystem.

- **Legs toggle**: add `showLegs: boolean` to `ConveyorProperties`; `PROPERTY_FIELDS.conveyor` boolean field; `ConveyorMesh.tsx` skips leg geometry when false (leg math already isolated in `conveyorGeometry.ts::computeLegs`). No physics change (legs are visual). Requires a save-format migration to default `showLegs: true` on V3 files.
- **Diverter attachment**: add an optional `diverter?: { offsetAlongBelt: number; length: number; angleDeg: number }` to `ConveyorProperties` (an attachment, so it stays within the conveyor element per "locks to the belt surface"). Render an angled wall in `ConveyorMesh.tsx`; add a matching **fixed thin cuboid collider** in `ConveyorColliders.tsx` (in `MACHINE_COLLISION_GROUPS`), transformed by belt yaw/incline so it sits on the deck. Property fields for offset/length/angle. Diverter with `length = 0` (default) means "none".
- **ADR**: ADR-018 "Conveyor attachments modeled as optional sub-properties, not separate elements".
- **Files**: `src/types/elements.ts`, `src/elements/registry.ts`, `src/elements/propertySchema.ts`, `src/rendering/elements/ConveyorMesh.tsx` + `conveyorGeometry.ts`, `src/physics/ConveyorColliders.tsx`, serialization (version bump + migration), tests beside `conveyorGeometry.ts`.

## Phase B — Standalone transfer elements (chute, hopper)

Both are new standalone element types (full pattern, sections 1–7). Both are **passive static colliders** — no per-step simulation state, simpler than elevators.

- **Chute** (`type: 'chute'`): properties `length`, `angleDeg`, plus an optional `feedConveyorId` (or width taken from a `width` property defaulted to match a typical belt; simplest first cut is an explicit `width` field, with "match feeding conveyor" as a follow-on convenience). A tilted fixed cuboid/ramp collider (`MACHINE_COLLISION_GROUPS`) with a flat surface mesh. Crops land and slide by gravity + friction — no active carry.
- **Hopper** (`type: 'hopper'`): properties `footprint: AxisXZ`, `height`, `wallThickness`. Four fixed wall colliders forming an open-top box (a backstop), open on the infeed side or fully enclosed per a `backstopOnly: boolean`. Holds piling crop; no active logic. This is the volume sensors will monitor in Phase D.
- **ADR**: ADR-019 "Chute and hopper as passive static-collider elements".
- **Files**: full new-type pattern for each; new `src/rendering/elements/ChuteMesh.tsx`, `HopperMesh.tsx` (+ geometry helpers), `src/physics/ChuteColliders.tsx`, `HopperColliders.tsx`.

## Phase C — Grading screen

New standalone element that **carries like a belt** (reuse the `ConveyorColliders` contact-velocity mechanism) **and grades by size**.

- **Type** `type: 'gradingScreen'`: properties `length`, `width`, `beltHeight`, `inclineDeg`, `beltSpeed`, `apertureMm` (crops with sampled diameter < aperture are eligible to fall through), `frontBias` (−100…100; how strongly fall-through concentrates toward the infeed vs. spreads evenly), `skirts`.
- **Physics/sim**: a `GradingScreenColliders.tsx` applies belt contact velocity to crops on its deck (factor the shared belt-velocity logic out of `ConveyorColliders.tsx` into a reusable helper in `src/physics/beltVelocity.ts` — that module already exists for the maths). Each step, a new pure `src/simulation/gradingScreen.ts` scans active crops within the deck footprint. An undersized crop (sampled diameter < `apertureMm`) is **not removed on contact**; instead it is carried along by the belt and, each step it remains on the deck, has a **per-step fall-through probability** so removal is distributed along the deck length. The probability is weighted by normalized position along the belt (local +X): higher near the **infeed**, tapering toward the discharge (a tunable `frontBias`), so more small crop drops early — matching real screening. When a crop is selected to fall, it is **released from its slot and re-spawned at its own current XZ**, just below the deck plane, with a small downward velocity (drop straight through where it sat) — **not** teleported to a fixed discharge point. Oversized crop rides to the discharge normally. Undersized-through mass is tallied into statistics ("graded off").
- **Determinism note**: the fall-through draw uses a seeded/`Math.random` `RandomFn` (same injection pattern as `cropSize.ts`/`elevator.ts`) so `gradingScreen.ts` stays a pure, unit-testable function; tests assert the front-to-back distribution over many crops rather than exact per-crop outcomes.
- **Detail to resolve in implementation**: `gradingScreen.ts` needs each active crop's **sampled diameter and current world position** per slot — `cropRuntime` already tracks `contactRadii` per slot and body positions; confirm/extend `cropRuntime` to expose both read-only per active slot.
- **ADR**: ADR-020 "Grading screen: belt-carry + progressive, position-biased size-gated drop-through at crop location (no permeable collider)".
- **Files**: full new-type pattern; `src/physics/beltVelocity.ts` (extract shared helper), `src/simulation/gradingScreen.ts` (+ test), `cropRuntime.ts` (per-slot radius/position read + graded-off tally), `SpawningSystem.tsx` (hook the grading tick **after** floor/zone despawn, **before** spawners).

## Phase D — Control subsystem: tags, sensors, ladder logic, PLC bridge stub

The largest phase; establishes a new subsystem. Build in this internal order.

1. **Sensor element** (`type: 'sensor'`): properties `footprint: AxisXZ`, `depthSensitivityM` (minimum stacked crop depth beneath the sensor to read "made"), `mountHeight`. Each step a new pure `src/simulation/sensor.ts` measures, per sensor, the max crop-top Y (or count) within its XZ footprint from `cropRuntime` active positions (generalizes `isPointInsideZone` to a **read-only aggregate** — must not release crops). Result feeds the tag table.
2. **Tag/IO model** — new `src/simulation/control/tags.ts`: a stable per-element tag registry. Conveyors expose read tags (`speed`, running) and write tags (`enabled`, `speedSetpoint`); sensors expose a read tag (`detected`/`depth`); spawners expose `enabled`. Tags key off the existing stable `ElementId` — no new identity system needed. Reads pull from `sceneStore`/sensor results; writes go through the existing `useSceneStore.getState().updateElement(id, …)` path (the same path `devSeed.ts` already uses), so no new mutation API.
3. **Rung engine** — new `src/simulation/control/ladder.ts` (pure): an ordered list of rungs, each a boolean expression (AND/OR/NOT of input tag conditions) driving one output tag write. Evaluated once per fixed step **after sensors update, before spawner/conveyor ticks act**, slotted into `SpawningSystem`'s callback. Rungs are scene data (serialized), edited via a new form-based `ControlPanel.tsx` (no visual ladder rails yet).
4. **PLC bridge interface** — new `src/simulation/control/bridge.ts`: a `ControlBridge` interface (`readInputs(tags)`, `writeOutputs(tags)`) with a `MockBridge` no-op default. The ladder engine talks to the bridge each publish tick (~4 Hz). No transport, no external process yet.
5. **State stores**: publish the tag table to a throttled `controlStore` (~4 Hz, mirroring the statistics cadence) for the `ControlPanel` UI to display live values.

- **ADRs**: ADR-021 "Control tag/IO model keyed by ElementId over existing updateElement"; ADR-022 "Ladder logic evaluated in-step between sensing and actuation"; ADR-023 "PLC bridge as a pluggable interface, protocol deferred".
- **Files**: new `src/simulation/control/` dir (`tags.ts`, `ladder.ts`, `bridge.ts` + tests), `src/simulation/sensor.ts`, new element-type pattern for `sensor`, `src/components/ControlPanel.tsx`, `src/state/controlStore.ts`, `SpawningSystem.tsx` (sensor tick + ladder eval ordering), serialization for sensor elements + a `rungs` array in the layout file.

## Phase E — Spawner batch mode + state gating

- **Batch mode**: add `mode: 'continuous' | 'batch'` to `SpawnerProperties`, plus `batchVolumeM3` (or mass) and `batchDurationS`. In `src/simulation/spawning.ts::tickSpawner`, batch mode emits the configured volume spread across the duration then stops until re-triggered; continuous mode is today's behavior. Reuses the mass-credit accumulator.
- **State gating**: the spawner `enabled` field already gates spawning and is writable via `updateElement`; expose it as a control tag (Phase D) so a sensor/rung can pause a drop. Add a `triggerTag`/`startTrigger` concept for batch re-arming. Depends on Phase D for the tag wiring; the batch-emission maths can land independently first.
- **ADR**: ADR-024 "Spawner batch mode via bounded accumulator; state exposed as control tag".
- **Files**: `src/types/elements.ts`, `src/elements/propertySchema.ts`, `src/simulation/spawning.ts` (+ its test), serialization migration (default `mode: 'continuous'` on older files).

## Phase F — Collector restyle (wooden open-top crate)

Visual-only; no scope/physics change to the collection zone's sensing.

- When `element.type === 'collectionZone'`, render a wooden-crate mesh (four slatted wooden walls + base, open top, wood material/color) in place of the translucent green box, in `PlacedElements.tsx` via a new `src/rendering/elements/CollectorMesh.tsx`. The collection **volume** logic is unchanged. Optionally add thin static wall colliders so crop visibly fills the crate rather than passing through (decide during implementation — pure-visual first, colliders as a refinement).
- **Files**: `src/rendering/elements/CollectorMesh.tsx`, `PlacedElements.tsx`, `registry.ts` (color/label tweak). Likely no serialization change.

## Phase G — Performance (advisory; recommendations to choose from later)

Not an element; a menu of techniques to lift the active-crop ceiling without losing realism. To be turned into ADRs/stages when a direction is picked. Ranked by expected value:

1. **Code-split the Rapier chunk** — the production bundle is one 3.5 MB chunk (Vite warns). Dynamic-import Rapier so first paint isn't blocked; pure win, low risk.
2. **Sleeping / island tuning** — settled piles should sleep; verify Rapier sleeping is effective with the current damping and that woken islands are minimal. Biggest realism-preserving throughput lever.
3. **Adaptive crop LOD** — below a distance/size threshold, keep the physics body but drop shadow-casting / reduce instanced sphere segment count. Visual-only; no physics realism loss.
4. **Spatial/time-sliced sensing** — the per-step `isPointInsideZone` sweeps all active crops for every zone/sensor/intake. With many crops+zones this is O(crops×zones). A broad-phase grid or round-robin (sense a fraction of zones per step at 4 Hz publish) cuts cost with no visible change.
5. **Raise `maxActiveCrops` behind a measured budget** — only after 1–4; couple to an FPS governor that caps spawning when the step-time budget is exceeded (the `physicsStepMs` stat already exists).
6. **Merge static machine colliders** — many conveyors/walls = many fixed colliders; compound/merge where possible.

- **Deliverable when chosen**: a Stage-14 performance ADR + measured before/after at 1000/2000/4000 crops. Feeds the existing Stage 14 on `main`.

---

## Roadmap & docs impact (write when each phase is implemented)

- New `docs/ROADMAP.md` stages 16–22 (one per phase A–G), each with objective/deliverables/acceptance criteria in the existing format.
- New ADRs 018–024 in `docs/DECISIONS.md` as noted per phase.
- `docs/PRODUCT_SCOPE.md`: expand the element library and add a "Control logic & external I/O" scope section (currently out of scope).
- `docs/PHYSICS_SPECIFICATION.md`: grading-screen and chute/hopper behavior; sensor depth measurement.
- `docs/SAVE_FILE_FORMAT.md` + `schemas/layout.schema.json` + `fileVersion` bump(s) + migrations for each phase that changes stored shapes (A, B, C, D, E).
- `CHANGELOG.md` per phase.

## Sequencing & dependencies

A → B → C are independent of the control subsystem and can land in any order (A first as a small warm-up). **D is a prerequisite for E's state-gating** and for sensors monitoring B's hopper. F and G are independent throughout. Recommended order: **A, B, C, D, E, F**, with **G** interleaved whenever crop counts start to bite.

## Verification (per phase, matches CI gate)

For every phase, before committing on `develop`:

1. `npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build` (the full CI gate — note the required `format:check`).
2. New pure logic (`gradingScreen.ts`, `sensor.ts`, `ladder.ts`, batch accumulator, geometry helpers) gets unit tests beside it — this is where correctness is proven, per the project's testing strategy.
3. Browser hand-verify against `vite preview` of `dist/` (production, not dev — dev StrictMode masks pool bugs): place the new element, Play, and confirm the behavior (crop grades/falls/diverts/holds; sensor reads; a rung toggles a conveyor/spawner). Placement needs hover-then-click. Screenshot as proof.
4. Confirm save→load round-trips the new elements/rungs losslessly (extend `layoutRoundTrip.test.ts`) and that a V3 file still loads via the new migration.

## Out of scope for this program (explicit)

- Graphical drag-and-drop ladder editor (form-based only for now).
- A real PLC transport/relay process and protocol choice (interface + mock only).
- True permeable-mesh grading physics (progressive drop-through instead).
- Deformation/breakage or DEM-accurate crop interaction (unchanged fidelity boundary).
