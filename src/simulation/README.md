# src/simulation

Fixed-timestep simulation loops (docs/ROADMAP.md, ADR-004). All logic here runs on
physics steps (or is pure and unit-tested), never on render frames.

| Module | Role |
| --- | --- |
| `CropPool.ts` | Logical slot acquire/release with hard cap (ADR-005) |
| `cropRuntime.ts` | Binds pool slots to Rapier bodies created by `CropBodies` |
| `spawning.ts` | Per-spawner fractional accumulator, emit pose jitter |

Wired from `src/physics/SpawningSystem.tsx` via `useAfterPhysicsStep`.
