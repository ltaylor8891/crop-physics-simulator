# src/simulation

Fixed-timestep simulation loops (docs/ROADMAP.md, ADR-004). All logic here runs on
physics steps (or is pure and unit-tested), never on render frames.

| Module | Role |
| --- | --- |
| `CropPool.ts` | Logical slot acquire/release with hard cap (ADR-005) |
| `cropRuntime.ts` | Per-type Rapier pools, floor + zone despawn |
| `spawning.ts` | Per-spawner fractional accumulator, emit pose jitter |
| `zoneVolume.ts` | Collection/despawn AABB tests |

Wired from `src/physics/SpawningSystem.tsx` via `useAfterPhysicsStep`.
