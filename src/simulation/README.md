# src/simulation

Fixed-timestep simulation loops (docs/ROADMAP.md, ADR-004). All logic here runs on
physics steps (or is pure and unit-tested), never on render frames.

| Module | Role |
| --- | --- |
| `CropPool.ts` | Logical slot acquire/release with hard cap (ADR-005) |
| `cropRuntime.ts` | Per-type Rapier pools, floor + zone + elevator-intake |
| `spawning.ts` | Per-spawner kg-credit accumulator, emit pose + size |
| `cropSize.ts` | Biased diameter/length sampling, volume, mass from density |
| `rollingWindow.ts` | Rolling 10 s mass windows for In/Out t/h (Stage 13) |
| `elevator.ts` | Transit queue, intake/discharge poses, rate-capped emit |
| `zoneVolume.ts` | Collection/despawn/intake AABB tests |

Wired from `src/physics/SpawningSystem.tsx` via `useAfterPhysicsStep`.
