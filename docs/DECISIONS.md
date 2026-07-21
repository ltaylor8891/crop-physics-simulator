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
- **Decision**: Fixed 1/60 s with accumulated stepping and render interpolation (`<Physics timeStep={1/60}>`), max 3 catch-up steps per render frame; all time-based simulation logic runs in fixed-step callbacks.
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
- **Status**: Accepted
- **Context**: Crops must ride belts realistically. Physically moving belt geometry (kinematic bodies translating and teleporting back) causes contact popping; custom force fields poorly reproduce static grip.
- **Options considered**:
  1. Contact surface velocity on a static belt collider (contacts solved as if the surface moved)
  2. Kinematic belt segments translating with wrap-around teleport
  3. Per-step impulse/force applied to bodies overlapping a belt volume
- **Decision**: Contact surface velocity (option 1). It is how belts are conventionally modelled in rigid-body engines: static geometry, friction-coupled tangential target velocity, correct behaviour for stacked crops (only the contact layer is driven directly; upper layers follow through inter-crop friction).
- **Consequences**: Belt speed changes from zero must explicitly wake sleeping bodies (no contact event fires). Exact mechanism depends on what `@react-three/rapier`'s bound Rapier version exposes; if contact-surface velocity is not directly available, implement via the contact-pair iterator applying tangential velocity targets per step, and record the final mechanism here when Stage 6 lands.

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
