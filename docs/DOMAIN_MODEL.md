# Domain Model

Core concepts and terminology. Use these terms consistently in code, documentation, commits, and UI copy.

## Scene Elements

A **scene element** is any user-placed object in the layout. All elements share:

| Field         | Type                 | Meaning                                                                      |
| ------------- | -------------------- | ---------------------------------------------------------------------------- |
| `id`          | `ElementId` (string) | Unique, stable identifier (see below)                                        |
| `type`        | string enum          | `"conveyor" \| "elevator" \| "spawner" \| "collectionZone" \| "despawnZone"` |
| `name`        | string               | User-editable label (defaults to e.g. "Conveyor 1")                          |
| `position`    | `{x, y, z}` metres   | Element origin in world space                                                |
| `rotationYaw` | number, radians      | Rotation about world +Y (see conventions below)                              |

Type-specific properties are nested under a `properties` object per element. Crops are **not** scene elements — they are runtime-only bodies and are never saved.

### Conveyor

A belt conveyor carrying crops along its local +X axis.

- **Origin**: centre of the belt footprint at ground level (y = 0 under the belt's midpoint).
- Properties: `length` (m, along local X), `width` (m), `beltHeight` (m, top of belt surface above ground), `inclineDeg` (degrees, −30…30, pitch about local Z; positive raises the discharge end), `beltSpeed` (m/min, ≥ 0), `skirts` (boolean side walls).
- The **infeed end** is the local −X end; the **discharge end** is local +X.

### Elevator

A bucket elevator abstracted as a vertical transport column (buckets are not simulated).

- **Origin**: centre of footprint at ground level.
- Properties: `height` (m, discharge height), `footprint` `{x, z}` (m), `transportSpeed` (m/s, default 2), `dischargeRateCap` (t/h), `dischargeVelocity` (m/s, horizontal, along local +X at the top).
- **Intake**: sensor volume at the base (footprint × 0.8 m height). **Discharge point**: top of the column, offset local +X past the face by `footprint.x/2 + 0.2 m`.

### Crop Spawner

An emitter volume that creates crop bodies.

- **Origin**: centre of the emission face (bottom face of the spawner box).
- Properties: `cropType` (preset id), `throughput` (t/h), `emitArea` `{x, z}` (m), `enabled` (boolean).

### Crop (runtime object)

An individual rigid body representing one piece/clump of crop. Defined by a **crop type preset**: `id`, `label`, collider shape (ball/capsule) and size (m), `mass` (kg), `friction`, `restitution`, display colour. Presets live in code (`src/elements/cropTypes.ts`), not in save files; save files reference presets by id.

### Collection Zone

A sensor box representing "successfully delivered". Crops entering it are despawned immediately and their mass is credited to the zone's collected statistics.

- **Origin**: centre of the box footprint at its base.
- Properties: `size` `{x, y, z}` (m).

### Despawn Zone

Same geometry as a collection zone, but despawned crops count as **spilled/discarded**, not collected. The ground plane acts as an implicit despawn surface with a 3-second grace timer (see `PHYSICS_SPECIFICATION.md`).

## Simulation Settings

Scene-wide, saved with the layout: `gravity` (m/s², default 9.81), `maxActiveCrops` (default 2000), `floorDespawnSeconds` (default 3).

## Layout File

The saved JSON document containing scene metadata, simulation settings, all elements, and camera state — the unit of save/load and sharing. Format: `SAVE_FILE_FORMAT.md`.

## Element IDs

- Format: `el_` + 12 lowercase base-36 characters from a cryptographically random source, e.g. `el_4h8s0q2mzk1x`.
- Generated once at placement (`src/utilities/ids.ts`), never re-generated on load, rename, move, or save — IDs are stable for the lifetime of the element and are the key used by rendering, physics, selection, and statistics.
- Duplication assigns a fresh ID to the copy.

## Coordinate and Rotation Conventions

- Right-handed, **Y-up** (three.js default). Ground plane is XZ at y = 0.
- 1 world unit = 1 metre.
- An element's **flow direction is its local +X**.
- `rotationYaw` is the only stored rotation for elements: radians, counter-clockwise about +Y when viewed from above (standard mathematical direction), 0 = flow along world +X. Conveyor incline is a _property_ (`inclineDeg`), not part of the stored rotation.
- Internally angles are radians; the UI displays and accepts degrees.

## Dimensions and Units

| Quantity           | Unit stored       | Unit displayed                  |
| ------------------ | ----------------- | ------------------------------- |
| Length/position    | metres (m)        | m                               |
| Mass               | kilograms (kg)    | kg (crops), tonnes (aggregates) |
| Time               | seconds (s)       | s                               |
| Angle              | radians           | degrees                         |
| Belt speed         | metres per minute | m/min                           |
| Throughput         | tonnes per hour   | t/h                             |
| Velocity (physics) | metres per second | —                               |

All conversions go through `src/utilities/flow.ts` / `src/utilities/units.ts`.

## Material-Flow Terminology

The units below are related but **not interchangeable**. Definitions, with conversions as implemented in `src/utilities/flow.ts`:

| Term                                 | Symbol/unit | Meaning                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tonnes per hour**                  | t/h         | User-facing _mass_ throughput of a spawner, elevator cap, or statistic. 1 t/h = 1000 kg / 3600 s.                                                                                                                                                                                                   |
| **Kilograms per second**             | kg/s        | The same mass flow in SI base units, used internally: `kgPerS = tPerH * 1000 / 3600` ≈ `tPerH × 0.2778`.                                                                                                                                                                                            |
| **Crops per second**                 | crops/s     | _Count_ rate at which discrete crop bodies must be spawned to realise a mass flow: `cropsPerS = kgPerS / cropMassKg`. Depends on the crop type's mass — 10 t/h of 0.5 kg potatoes is ~5.6 crops/s, but 10 t/h of 0.03 kg wheat clumps is ~92.6 crops/s.                                             |
| **Metres per minute**                | m/min       | User-facing _belt speed_ unit (industry convention). Converted for physics: `mPerS = mPerMin / 60`.                                                                                                                                                                                                 |
| **Belt velocity** (surface velocity) | m/s vector  | The velocity assigned to a conveyor's top-surface **contact**, world-space, along the belt's rotated local +X (and up the incline for pitched belts). The belt mesh itself is static; only contacting bodies are dragged. Magnitude = belt speed converted to m/s.                                  |
| **Initial crop velocity**            | m/s vector  | The velocity a crop body is given at the moment it spawns (small downward value + random jitter) or when re-emitted at an elevator discharge (`dischargeVelocity` horizontally). Distinct from belt velocity: it applies once at emission, whereas belt velocity acts continuously through contact. |

**Key distinction**: t/h, kg/s and crops/s describe _how much material_ moves; m/min, belt velocity and initial crop velocity describe _how fast surfaces or bodies_ move. A belt's speed does not by itself determine throughput — throughput also depends on how much material is on the belt (burden depth), which in this simulator emerges from the spawner rate and the physics rather than being prescribed.
