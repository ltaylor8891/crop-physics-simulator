# Architecture Decision Records

Significant decisions, newest last. Statuses: **Proposed**, **Accepted**, **Superseded by ADR-xxx**. Do not silently reverse an Accepted decision — add a new ADR that supersedes it and update the affected documents.

---

## ADR-001 — React Three Fiber for rendering

- **Date**: 2026-07-21
- **Status**: Accepted
- **Context**: The app needs a 3D viewport tightly integrated with a React UI (panels editing scene state that the viewport reflects immediately).
- **Options considered**:
  1. Plain three.js with an imperative scene manager and React only for panels
  2. React Three Fiber (R3F) + drei
  3. Babylon.js
  4. A game engine export (Unity/Godot WebGL)
- **Decision**: R3F + drei. Declarative scene mirrors the element store naturally; drei supplies OrbitControls/Grid/instancing helpers; `@react-three/rapier` gives first-class physics integration; huge ecosystem.
- **Consequences**: React reconciliation must be kept out of per-frame hot paths (use `useFrame` + refs, instancing for crops). Contributors need basic R3F literacy. Plain-three escape hatches remain available via refs.

## ADR-002 — Rapier for physics

- **Date**: 2026-07-21
- **Status**: Accepted
- **Context**: Need hundreds–thousands of dynamic rigid bodies with contacts, sensors, CCD and sleeping, in the browser.
- **Options considered**:
  1. Rapier (Rust→WASM, `@react-three/rapier` bindings)
  2. cannon-es (pure JS)
  3. ammo.js (Bullet→emscripten)
  4. Hand-rolled kinematics (no real contacts)
- **Decision**: Rapier. Best performance-per-body of the browser options, actively maintained, deterministic core, clean sensor/interaction-group APIs, maintained R3F bindings.
- **Consequences**: WebAssembly becomes a hard runtime requirement (documented in README + PHYSICS_SPECIFICATION). Rapier's API surface via the binding library constrains some low-level features (e.g. how contact surface velocity is exposed — see ADR-006). Single-threaded solver sets the ~2 000-body envelope.

## ADR-003 — One world unit = one metre

- **Date**: 2026-07-21
- **Status**: Accepted
- **Context**: Rendering, physics, and user-facing dimensions must agree on scale; physics engines are tuned for metre-scale bodies.
- **Options considered**: 1 unit = 1 m; 1 unit = 1 cm; arbitrary scene scale with conversion layer.
- **Decision**: 1 world unit = 1 metre everywhere; SI internally (kg, s, radians); user-friendly units (t/h, m/min, degrees) converted only at the UI edge via `src/utilities`.
- **Consequences**: No conversion layer between physics and rendering. Crop sizes (0.05–0.1 m) are near the small end of Rapier's comfortable range — mitigated with CCD and minimum sizes (see PHYSICS_SPECIFICATION). All docs and the save format state units explicitly.

## ADR-004 — Fixed physics timestep (1/60 s)

- **Date**: 2026-07-21
- **Status**: Accepted
- **Context**: Spawn rates, despawn timers, and physics stability must not depend on the user's display refresh rate (48–240 Hz in practice).
- **Options considered**: variable timestep (step by frame delta); fixed 1/60 s with accumulator + interpolation; fixed with substeps per frame.
- **Decision**: Fixed 1/60 s with accumulated stepping (`<Physics timeStep={1/60}>`), max 3 catch-up steps per render frame; all time-based simulation logic runs in fixed-step callbacks. Render interpolation was later turned off — see ADR-017.
- **Consequences**: Frame-rate-independent behaviour and stable contacts. Under sustained overload the simulation slows down rather than freezing (accepted trade-off). Simulation logic must never use render delta time.

## ADR-005 — Object pooling for crops

- **Date**: 2026-07-21
- **Status**: Accepted
- **Context**: Up to ~90 crops/s spawn rate and thousands of live bodies; creating/destroying Rapier bodies and meshes at that rate causes WASM allocation churn and GC pressure.
- **Options considered**: naive create/destroy; object pool of pre-allocated bodies + instanced-mesh slots; hybrid (pool bodies, per-crop meshes).
- **Decision**: Fixed-size pool (`maxActiveCrops`, default 2 000) of pre-created disabled bodies paired with InstancedMesh slots; spawners throttle when the pool is exhausted.
- **Consequences**: Peak memory allocated up front; cap enforcement is free; spawner code must handle `acquire() === null`. Pool size changes require world rebuild (acceptable — it's a settings change, not a runtime slider).

## ADR-006 — Conveyors use contact surface velocity, not moving geometry or force fields

- **Date**: 2026-07-21
- **Status**: Accepted (mechanism superseded by ADR-016)
- **Context**: Crops must ride belts realistically. Physically moving belt geometry (kinematic bodies translating and teleporting back) causes contact popping; custom force fields poorly reproduce static grip.
- **Options considered**:
  1. Contact surface velocity on a static belt collider (contacts solved as if the surface moved)
  2. Kinematic belt segments translating with wrap-around teleport
  3. Per-step impulse/force applied to bodies overlapping a belt volume
  4. `kinematicVelocity` rigid body with belt linvel, translation pinned each step (Rapier-compatible surface-velocity equivalent)
- **Decision**: Product decision — surface-velocity intent (not moving geometry). Stage 6 initially used option 4; **ADR-016** replaces that mechanism with per-step contact velocity injection on a fixed collider after interactive testing showed friction slip undershooting labelled m/min speeds.
- **Consequences**:
  - Belt speed changes from zero must explicitly wake sleeping bodies (implemented in `ConveyorColliders`).
  - Implementation lives in `src/physics/ConveyorColliders.tsx` + `src/physics/beltVelocity.ts` (see ADR-016).
  - Side skirts remain `fixed` (no surface velocity).
  - If a future Rapier release adds true contact surface velocity, prefer migrating to it — the product decision (surface velocity, not moving geometry) stands.

## ADR-007 — Zustand for state management

- **Date**: 2026-07-21
- **Status**: Accepted
- **Context**: Need shared state between DOM panels and the R3F scene with minimal boilerplate and selector-level subscription granularity (frequent small updates like selection and property edits).
- **Options considered**: Zustand; Redux Toolkit; Jotai; React context + reducers.
- **Decision**: Zustand. Tiny, idiomatic in the R3F ecosystem (same author family), usable outside React (fixed-step simulation code can read/write stores directly), transient-update escape hatches for per-frame data.
- **Consequences**: Less structural ceremony than Redux — discipline required: stores hold serialisable plain data only, actions defined in the store, no three/Rapier objects in state. Per-frame transforms bypass the store entirely (see TECHNICAL_DESIGN).

## ADR-008 — Vite + Vitest toolchain

- **Date**: 2026-07-21
- **Status**: Accepted
- **Context**: Need fast dev server with WASM/ESM support and a test runner sharing the same transform pipeline.
- **Options considered**: Vite + Vitest; Next.js (SSR unneeded — fully client-side app); CRA (deprecated); webpack custom.
- **Decision**: Vite 8 + Vitest 4, plain client-side SPA, no SSR.
- **Consequences**: Simple static hosting of `dist/`. Tests run in Node (jsdom where needed) — R3F/WASM rendering is explicitly out of unit-test scope (see TECHNICAL_DESIGN §Testing).

## ADR-016 — Belt surface velocity via per-step contact velocity injection

- **Date**: 2026-07-21
- **Status**: Accepted (supersedes ADR-006 mechanism)
- **Context**: The Stage 6 `kinematicVelocity` + pinned-translation belt (ADR-006 option 4) transferred motion only through friction. With Rapier's default average friction combine and any linear damping, riders systematically undershot the labelled belt speed (m/min → m/s). The product expects 60 m/min ≈ 1 m/s travel along the belt.
- **Options considered**:
  1. Keep kinematic pin; raise friction combine to Max / remove damping
  2. `kinematicPositionBased` + `setNextKinematicTranslation(home + v·dt)` then snap home
  3. Fixed belt collider; after each physics step set contacting dynamics' tangential velocity to `beltWorldVelocity`
- **Decision**: Option 3. Conversion remains `beltSpeed_mPerMin / 60`. Tangential velocity is forced; the component along the belt normal is preserved so settle/bounce still work. Stopped belts (`beltSpeed === 0`) skip injection so friction holds riders instead of snapping them to zero.
- **Consequences**:
  - Carriage speed matches the UI value regardless of friction slip.
  - Belts are `fixed` rigid bodies (skirts unchanged).
  - Still not a native Rapier contact-surface-velocity API (KI-002 remains closed with this workaround).
  - Docs: `PHYSICS_SPECIFICATION.md` §Conveyor Surface Velocity; code: `ConveyorColliders.tsx`, `beltVelocity.ts`.

## ADR-017 — No Rapier render interpolation with pooled crops

- **Date**: 2026-07-22
- **Status**: Accepted (narrows ADR-004)
- **Context**: After filling the crop pool and hitting Reset, the sim stayed laggy with zero active crops. `@react-three/rapier` with `interpolate` snapshots **every** rigid body each physics step; InstancedRigidBodies also wrote instance matrices for every parked slot every frame. With three type pools × `maxActiveCrops` that is thousands of bodies of dead work.
- **Options considered**:
  1. Keep interpolation + InstancedRigidBodies; lower default `maxActiveCrops`
  2. Disable `interpolate`; keep InstancedRigidBodies; sync only active instance matrices
  3. Disable `interpolate`; create pooled bodies via the Rapier world API; sync only active InstancedMesh slots
- **Decision**: Option 3. `<Physics interpolate={false}>`; `CropBodies` owns world-created disabled bodies + InstancedMesh; `cropRuntime.syncInstanceScales` updates active slots only; belt start wakes only enabled sleeping dynamics.
- **Consequences**:
  - Slightly less smooth motion when the render rate diverges from 60 Hz (acceptable for this tool).
  - Fixed 1/60 s stepping (ADR-004) unchanged.
  - Code: `PhysicsWorld.tsx`, `CropBodies.tsx`, `cropRuntime.ts`, `ConveyorColliders.tsx`.

## ADR-018 — Conveyor attachments modeled as optional sub-properties, not separate elements

- **Date**: 2026-07-23
- **Status**: Accepted
- **Context**: The `develop` feature program (Phase A, `docs/DEVELOP_PROGRAM.md`) adds a **diverter** — an angled high-side wall that locks to a conveyor's belt surface to deflect crop across it. A diverter has no independent existence: it is positioned along a specific belt, pitches and yaws with that belt, and moves when the belt moves. The same phase adds a **support-legs on/off** toggle so belts can stack vertically without leg posts blocking crop passing underneath.
- **Options considered**:
  1. Diverter as its own placeable element type, positioned and kept in sync with a conveyor by the user.
  2. Diverter as an optional sub-object on `ConveyorProperties`, rendered and collided within the conveyor's own component.
- **Decision**: Option 2. `ConveyorProperties` gains `showLegs: boolean` and `diverter: { offsetAlongBelt, lateralOffset, length, angleDeg }`; `length = 0` means "no diverter". (`lateralOffset`, the across-belt position, was added in `fileVersion` 5 shortly after the initial `fileVersion` 4 diverter.) The wall mesh renders in the belt-assembly inner frame (`ConveyorMesh`), and a matching `fixed` cuboid collider is placed via `diverterLocalCenter` + belt orientation composed with the diverter's own yaw (`ConveyorColliders`). Standalone freestanding transfer elements (hopper, chute — Phase B) remain their own element types; only belt-locked attachments live inside the conveyor.
- **Consequences**:
  - No cross-element sync problem: the diverter is always consistent with its belt.
  - `ConveyorProperties` grows required fields → `fileVersion` 4 with `migrateV3toV4` back-filling defaults (`showLegs: true`, diverter length 0).
  - Geometry maths (`diverterPlacement`, `diverterLocalCenter`) stays pure and unit-tested in `conveyorGeometry.ts`; the quaternion composition uses three.js in the collider component.
  - Only one attachment shape is supported for now; a second belt-locked attachment would extend the same pattern.
  - Code: `types/elements.ts`, `elements/registry.ts`, `elements/propertySchema.ts`, `rendering/elements/ConveyorMesh.tsx` + `conveyorGeometry.ts`, `physics/ConveyorColliders.tsx`, `serialization/migrations.ts`.

## ADR-019 — Chute and hopper as passive static-collider elements

- **Date**: 2026-07-24
- **Status**: Accepted
- **Context**: The `develop` program Phase B (`docs/DEVELOP_PROGRAM.md`) adds two standalone transfer aids. A **chute** is a flat sloped surface that bridges a gap so crop slides/falls onto the next surface; a **hopper** is an open-top box that holds crop piling against it (e.g. a backstop at the top of an inclined conveyor). Neither carries crop or runs any per-step logic — unlike the elevator's transit queue.
- **Options considered**:
  1. Model them as active elements with their own simulation state (like the elevator).
  2. Model them as passive `fixed` colliders with no runtime state — crop interacts by ordinary gravity/friction/contact.
- **Decision**: Option 2. Both are standalone element types built on the standard new-type pattern, but with **no `src/simulation/*` runtime** and no fixed-step hook. The chute is one pitched `fixed` cuboid slab (down-slope toward the discharge, pivoting about the infeed end like the conveyor belt slab); the hopper is one `fixed` body carrying the element's yaw with a cuboid collider per wall (back + two sides always, front wall only when fully enclosed; open top, **no floor** — crop rests on the belt/ground below). Both use `MACHINE_COLLISION_GROUPS` and `Materials.machine`.
- **Consequences**:
  - Simplest possible new elements — no determinism concerns, no runtime maps to prune.
  - Pure geometry (`chuteGeometry.ts`, `hopperGeometry.ts`) stays React/three-free and unit-tested; meshes and colliders consume the same helpers so visuals and physics stay in sync.
  - New element types are additive to the save format → `fileVersion` 6 with a no-op `migrateV5toV6` (stamps the version so files containing chute/hopper are correctly rejected by older apps).
  - The hopper is the volume Phase D sensors will monitor. "Match feeding conveyor width" for the chute is deferred (explicit `width` for now).
  - Follow-up (`fileVersion` 7): the hopper gained `mountHeight` + `angleDeg` so it can be lifted and pitched onto a belt (origin stays at ground for dragging, mirroring how `beltHeight` lifts the conveyor deck); the chute `length` range was narrowed to 0.1–1 m per user feedback. Chute locate-to-conveyor conveniences remain deferred.
  - Code: full new-type pattern for `chute` and `hopper`; `ChuteMesh`/`HopperMesh`, `ChuteColliders`/`HopperColliders`, geometry helpers, serialization V6.

## ADR-020 — Grading screen: belt-carry + progressive, size-gated drop-through at the crop location

- **Date**: 2026-07-24
- **Status**: Accepted
- **Context**: The `develop` program Phase C (`docs/DEVELOP_PROGRAM.md`) adds a grading screen that both carries crop like a belt and separates by size: undersized crop must fall through progressively along the deck (more near the infeed), at the crop's own location — not all removed on contact, and not teleported to a fixed discharge. Rapier has no per-body-size collision filtering, so a truly permeable mesh collider is not available.
- **Options considered**:
  1. A permeable collider that physically passes small bodies through gaps (no Rapier support; would need per-body collision-group toggling — a large spike).
  2. Remove undersized crop on contact and re-emit below (instant, not progressive; changes crop identity).
  3. Belt-carry the crop on a solid deck and apply a per-step, position-weighted fall-through probability; when a crop is drawn, drop it straight down at its current XZ.
- **Decision**: Option 3. The deck is a `fixed` belt collider carrying crop via the shared `applyBeltCarry` (ADR-016). Each fixed step, `cropRuntime.tickGradingScreens` scans active crops; an undersized crop (sampled diameter < `apertureMm`) resting on the deck has a fall-through probability `1 − e^(−rate·dt)` with `rate` weighted along the deck by `frontBias` (higher near the infeed). A drawn crop is **teleported** straight down to just below the deck slab at its current XZ with a small downward velocity — chosen over release+re-spawn because it preserves the crop's identity, mass, and size for the same visible result. Oversized crop rides to the discharge. Fallen-through mass is tallied as a diagnostic "graded" statistic (the crop lives on and lands on whatever is below). The draw uses an injected `RandomFn` so the geometry + probability in `gradingScreen.ts` stay pure and unit-tested; the tick is injected like `zoneVolume.isPointInsideZone`.
- **Consequences**:
  - No permeable-collider spike; behaviour matches the product intent (progressive, front-biased, at the crop's location).
  - Determinism follows the project pattern (seedable `RandomFn`); tests assert the geometry, the probability distribution, and the drop-through integration (undersized falls, oversized stays, mass tallied).
  - New element type is additive to the save format → `fileVersion` 8 with a no-op `migrateV7toV8`.
  - Skirts on the screen are visual-only in this phase (deck collider + belt-carry are the physics); a `frontBias`-only distribution and a fixed base rate are the tunables (base rate can become a property later).
  - Code: full new-type pattern for `gradingScreen`; `gradingScreen.ts` (+ test), `cropRuntime.tickGradingScreens` (+ integration test), `physics/beltCarry.ts` (extracted shared belt-carry, now used by `ConveyorColliders` too), `GradingScreenColliders`, `GradingScreenMesh`, `SpawningSystem` hook (grading after despawn, before spawners), `gradedMassKg` statistic.
