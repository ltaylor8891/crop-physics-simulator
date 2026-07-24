# Physics Specification

Intended physics behaviour, in enough detail for an agent to reproduce it without prior context. Engine: **Rapier** (WASM) via `@react-three/rapier`. Anything here that the implementation does not yet do belongs in `ROADMAP.md`/`KNOWN_ISSUES.md`, not silently changed.

> **Fidelity statement**: this simulator is an **engineering approximation** for visualisation. Crops are rigid convex bodies, not deformable granular material; elevators teleport crops rather than simulating buckets; friction/restitution values are plausible defaults, not measured properties. Do not present its output as validated engineering data. Sections marked **[approximation]** below deviate deliberately from physical reality.

## Gravity

- Uniform gravity `(0, -9.81, 0)` m/s², applied by the Rapier world. Stored in simulation settings; editable range 0–20 m/s² (non-Earth values are a sandbox feature, not realism).

## Collision Layers

Rapier interaction groups (16-bit membership/filter):

| Group     | Bit | Collides with                                        |
| --------- | --- | ---------------------------------------------------- |
| `CROP`    | 0   | `CROP`, `MACHINE`, `SENSOR`                          |
| `MACHINE` | 1   | `CROP`                                               |
| `SENSOR`  | 2   | `CROP` (intersection events only, no contact forces) |

- Machines never collide with machines — overlapping placement is allowed by design (users often intersect a conveyor discharge with an elevator intake).
- Sensors (spawner volumes, elevator intakes, collection/despawn zones, floor-contact detection) are Rapier _sensor_ colliders: they generate intersection events but exert no forces.

## Crop-to-Crop Collision

- Fully enabled: crops stack, pile, and jostle each other. This is what produces burden depth on belts and realistic piling at transfer points.
- Crop colliders are **balls or capsules only** (cheap, stable). **[approximation]** Real grain shape, deformation, and interlocking are not modelled; piles will look somewhat "bouncier" and rounder than reality.

## Variable Crop Size **[approximation]**

- Each spawner samples diameter (mm) and length percent with bipolar bias (−100…+100, 0 = uniform) within its configured ranges, clamped to fixed per-type limits in `cropTypes.ts`.
- Length percent: total length `L = (pct/100)×D`. Capsule: `halfHeight = max(0,(L−D)/2)` (sphere when `L ≤ D`, which is always for pct in 0–100). Ball crop types use diameter only.
- Mass = `densityKgPerM3 × volume` (sphere or capsule). Throughput uses a **kg-credit** accumulator so long-run t/h stays exact without iterating active bodies for mass.
- Visuals use unit instanced meshes scaled per instance to match the collider. Elevator discharge uses each type’s mid-limit diameter, 100% length, and default density (no per-elevator size UI yet).

## Crop-to-Machine Collision

- Machines use cuboid colliders. **Belt surfaces**, **skirts, casings, and the ground** are `fixed`. Belt conveyance uses per-step contact velocity injection (see §Conveyor Surface Velocity), not a moving kinematic body.
- Contact is solved with Rapier's default solver; machine colliders use the friction/restitution in the materials table below combined with the crop's values (Rapier default combine rule: average).
- Colliders must be thick enough (≥ 0.05 m) that crops at maximum supported speed (300 m/min = 5 m/s) cannot tunnel through at the fixed timestep. Continuous collision detection (CCD) is enabled on crop bodies as a backstop.

## Friction and Restitution

Default material values (plausible defaults, **not measured** — tune freely but record changes here):

| Surface / body                          | Friction | Restitution |
| --------------------------------------- | -------- | ----------- |
| Belt top surface                        | 0.9      | 0.0         |
| Machine casing / skirts                 | 0.4      | 0.1         |
| Ground plane                            | 0.6      | 0.2         |
| Wheat-clump crop (ball; size varies)    | 0.5      | 0.15        |
| Potato crop (capsule; size varies)      | 0.6      | 0.25        |
| Sugar-beet crop (ball r≈0.09 m, 0.9 kg) | 0.7      | 0.2         |

High belt friction + zero belt restitution is what makes surface-velocity conveyance behave like a real belt grip.

## Conveyor Surface Velocity

- The belt deck is a **`fixed`** cuboid collider. After every fixed physics step, dynamic bodies in contact with it have their **tangential** linear velocity set to the belt vector while the component along the belt normal is preserved (`velocityWithBeltSurface` in `src/physics/beltVelocity.ts`). This is the Rapier-compatible implementation of contact surface velocity (ADR-016 / ADR-006): the bound engine has no dedicated contact-surface-velocity or contact-modification API.
- Belt vector = local `+X * (beltSpeed_mPerMin / 60)`, pitched by incline and yawed into world space.
- Side skirts are separate **`fixed`** colliders (no surface velocity).
- Expected behaviour: a crop on a running belt travels at the labelled speed (e.g. 60 m/min → 1 m/s along the belt). When the belt is stopped, injection is skipped and crops decelerate by friction rather than instantly freezing.
- Starting a stopped belt wakes enabled sleeping dynamic bodies so settled piles resume (parked pool bodies stay disabled).

## Inclined Conveyor Behaviour

- The belt collider is pitched by `inclineDeg`; the surface-velocity vector is pitched with it, so crops are carried up/down the slope.
- Whether crops roll back on steep inclines emerges from friction vs `g·sin(θ)` — with belt friction 0.9, carriage is reliable to ~30°, which is why `inclineDeg` is clamped to ±30°. **[approximation]** Real belts use cleats/chevrons for steep inclines; we model only friction.

## Elevator Flight Interaction **[approximation]**

Buckets are not simulated. The elevator is a state machine per crop:

1. Crop centre intersects the **intake sensor** at the base → body is released to the pool (visually disappears), a record `{cropType, readyAt}` is queued as "in transit". Intake AABB = element footprint × **0.8 m** height (software volume, same pattern as collection zones).
2. Transit time = `height / transportSpeed` (default 2 m/s). `readyAt = intakeTime + transitTime`.
3. When the FIFO head is ready, a crop of the same type is re-spawned at the **discharge point**: world position at `y = height`, local +X = `footprint.x/2 + 0.2 m` (clears the head face), yawed into world. Velocity = `dischargeVelocity` along local +X, plus the same small downward component and jitter magnitudes as spawners (`SPAWN_*` constants).
4. Discharge is rate-capped at `dischargeRateCap` (t/h) using the same fractional accumulator as spawners (rate from the head crop’s mass); excess queued crops wait (the queue is unbounded and represents material inside the elevator). On pool exhaustion, discharges throttle like spawners (`applyThrottleCap`) and unmet heads are re-queued as immediately ready.
5. Status bar **In elevator** = sum of transit-queue lengths (crops hidden from the scene).

Consequence: elevators never jam or spill internally. This is a deliberate simplification; note it in any statistics interpretation.

## Grading Screen **[approximation]** (ADR-020)

The deck is a `fixed` belt collider that carries crop by contact surface velocity exactly like a conveyor (shared `physics/beltCarry.ts`). Rapier has no per-body-size collision filtering, so size grading is not a permeable collider; instead, each fixed step:

1. `cropRuntime.tickGradingScreens` scans active crops. A crop resting on the deck (within its footprint and a small band above the surface — `gradingDeckContact`) whose sampled diameter is **below `apertureMm`** is eligible to fall through; larger crop is left to ride the belt to the discharge.
2. An eligible crop drops through with per-step probability `1 − e^(−rate·dt)`, where `rate = GRADE_BASE_RATE_PER_S × weight`, and `weight` tilts linearly along the deck by `frontBias` (positive → higher near the infeed, zero at the discharge). The draw uses an injected `RandomFn`.
3. A drawn crop is **teleported straight down** to just below the deck slab at its current XZ, with a small downward velocity — it then falls under gravity onto whatever is placed below. This preserves the crop's identity/mass (chosen over release + re-spawn).
4. Fallen-through mass accumulates into the diagnostic **graded** statistic; the crop continues to exist (it is not removed by grading).

Consequence: grading is progressive and position-biased but statistical, not a true mesh sieve; the fall-through rate is a fixed base rate tunable only by `frontBias` (and which crops are eligible, via `apertureMm`). Skirts on the screen are visual-only in this phase.

## Floor-Contact Detection and Despawn

- The ground plane has a thin sensor layer just above it (or uses contact events from the floor collider).
- On a crop's **first contact** with the floor, stamp `floorContactTime` on it. It is **not** cleared if the crop bounces off the floor again — first touch starts the clock.
- When `simulationTime - floorContactTime ≥ floorDespawnSeconds` (**default 3.0 s**, saved per layout), release the crop to the pool and add its mass to the spilled statistic.
- Timers count **simulation time** (fixed steps), so pausing the simulation pauses despawn timers.
- User-placed despawn zones and collection zones despawn immediately on intersection (no 3 s grace).

## Physics Sleeping

- Rapier body sleeping stays **enabled** for crops: settled piles (e.g. inside a collection area or heaped on a stopped belt) go to sleep and cost no solver time.
- Starting a stopped belt must wake sleeping crops on it. Since a surface-velocity change generates no wake event, the belt component wakes **enabled** sleeping dynamic bodies when `beltSpeed` changes from 0 to non-zero (parked pool slots stay disabled and are skipped).
- Bodies in the pool's inactive state are disabled entirely (not merely asleep).

## Fixed Timestep

- `timeStep = 1/60 s`. The physics world steps on accumulated render time (0–N steps per frame) without render interpolation (ADR-017); max 3 catch-up steps per frame, surplus time dropped (simulation slows under heavy load rather than spiralling).
- All time-based simulation logic (spawn accumulators, despawn timers, elevator transit, statistics windows) advances in the fixed-step callback, never per render frame.

## Maximum Active Bodies

- Hard cap `maxActiveCrops` (default 2 000, saved per layout, range 100–5 000) enforced by the crop pool.
- When the pool is exhausted, spawners and elevator discharges **throttle** (skip emission, keep their accumulator capped at a small value so there is no burst on recovery) and the UI shows a "throttled" indicator. Existing crops are never evicted to make room.

## Known Browser-Physics Limitations

- **WASM required**: Rapier is WebAssembly; no WASM → no simulator (startup detects this and shows a message).
- **Determinism**: Rapier is deterministic for identical step sequences, but browser frame timing changes the number of catch-up steps taken; two runs of the same layout will diverge in detail. Statistics are rolling averages partly for this reason.
- **Tunneling**: very small/fast bodies can tunnel despite CCD; crop sizes are kept ≥ ~0.05 m radius.
- **Performance ceiling**: single-threaded WASM solver; ~2 000 dynamic bodies is the practical 30–60 FPS envelope on mid-range hardware. No SharedArrayBuffer/multithreading is assumed (keeps hosting header-free).
- **Energy behaviour**: piles of many touching rigid bodies can exhibit residual jitter; sleeping thresholds hide most of it. Tune `linearDamping` (small, e.g. 0.05) if jitter is visible.
