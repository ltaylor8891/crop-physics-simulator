# Save File Format

Versioned JSON layout format. Machine-readable schema: [`schemas/layout.schema.json`](../schemas/layout.schema.json). Working example: [`examples/sample-layout.json`](../examples/sample-layout.json). Serialization code: `src/serialization/`.

**Current file version: 5**

## Principles

- One self-contained JSON document per layout; no external references.
- `fileVersion` is a monotonically increasing integer. Readers migrate old files forward one version at a time; writers always write the current version.
- Unknown top-level or per-element fields are rejected by strict validation (schema `additionalProperties: false`) — better to fail loudly than half-load.
- Runtime state (live crops, statistics) is **never** saved.

## Root Schema

```jsonc
{
  "fileVersion": 5,          // integer, required
  "meta": { ... },           // scene metadata, required
  "settings": { ... },       // simulation settings, required
  "elements": [ ... ],       // scene elements, required (may be empty)
  "camera": { ... }          // camera state, required
}
```

## Scene Metadata (`meta`)

```jsonc
{
  "name": "North intake line", // 1–64 chars
  "createdAt": "2026-07-21T19:00:00Z", // ISO 8601 UTC
  "modifiedAt": "2026-07-21T19:45:00Z", // ISO 8601 UTC
  "appVersion": "0.1.0", // writer version, informational only
}
```

## Simulation Settings (`settings`)

```jsonc
{
  "gravity": 9.81, // m/s², 0–20
  "maxActiveCrops": 2000, // 100–5000
  "floorDespawnSeconds": 3, // 0.5–30
}
```

## Element Definitions (`elements[]`)

Every element shares the common envelope; `properties` is a tagged union discriminated by `type`:

```jsonc
{
  "id": "el_4h8s0q2mzk1x",   // ^el_[a-z0-9]{12}$, unique within file
  "type": "conveyor",         // conveyor | spawner | collectionZone | despawnZone
  "name": "Intake belt",      // 1–64 chars
  "position": { "x": 0, "y": 0, "z": 0 },   // metres, world space (see below)
  "rotationYaw": 0,           // radians, CCW about +Y from above, 0 = local +X along world +X
  "properties": { ... }       // type-specific, see below
}
```

### Position Format

Object `{x, y, z}` of finite numbers, metres, world space. `y` is normally 0 (element origins sit at ground level; height above ground is a _property_ such as `beltHeight`). Origin point per element type is defined in `DOMAIN_MODEL.md`.

### Rotation Format

Single number `rotationYaw` in **radians** (not degrees), counter-clockwise about world +Y viewed from above. Conveyor pitch is stored in `properties.inclineDeg` (degrees, because it is a user-facing property), not in the rotation.

### Dimension Format

Dimensions are type-specific properties in metres: scalars (`length`, `width`, `beltHeight`, `height`) or axis objects (`emitArea: {x, z}`, `footprint: {x, z}`, `size: {x, y, z}`).

## Equipment-Specific Properties

### `type: "conveyor"`

```jsonc
{
  "length": 6, // m, 1–50
  "width": 0.8, // m, 0.3–3
  "beltHeight": 0.75, // m, 0.2–5 (top of belt above ground)
  "inclineDeg": 0, // degrees, -30–30
  "beltSpeed": 90, // m/min, 0–300
  "skirts": true,
  "showLegs": true, // support legs on/off (off lets belts stack vertically)
  "diverter": {
    // angled high-side wall on the belt surface; length 0 = none
    "offsetAlongBelt": 0, // m from the infeed end, 0–50
    "lateralOffset": 0, // m across the belt from the centreline, -1.5–1.5
    "length": 0, // m, 0–20 (0 = no diverter)
    "angleDeg": 0, // degrees in the belt plane, -80–80
  },
}
```

`showLegs` and `diverter` were added in `fileVersion` 4; `migrateV3toV4` back-fills them on older conveyors (`showLegs: true`, `diverter` length 0). `diverter.lateralOffset` was added in `fileVersion` 5; `migrateV4toV5` back-fills it to 0 (centred).

### `type: "elevator"` (removed in fileVersion 3)

Bucket elevators are temporarily unavailable. V2 (and older) layouts that contain `type: "elevator"` elements have those elements **stripped** by `migrateV2toV3`. The type is not accepted by the current schema.

### Spawner Settings (`type: "spawner"`)

```jsonc
{
  "cropType": "potato", // preset id: wheatClump | potato | sugarBeet
  "throughput": 40, // t/h, 0.1–500
  "emitArea": { "x": 0.6, "z": 0.6 }, // m, each 0.1–3
  "enabled": true,
  "diameterMinMm": 20, // mm, 20–200 (clamped to crop-type preset limits at spawn)
  "diameterMaxMm": 150,
  "diameterBias": 0, // −100…100; 0 = uniform; negative favours small
  "lengthMinPct": 0, // total length as % of diameter (0–100): L=(pct/100)×D; balls ignore for geometry
  "lengthMaxPct": 100,
  "lengthBias": 0, // −100…100
  "densityKgPerM3": 777.46, // kg/m³; mass = density × volume
}
```

Spawner `position.y` is the height of the emission face (typically above a belt), and is the one element type whose `y` is normally non-zero. `fileVersion` 1 layouts are migrated by filling size/density defaults from the crop type.

### Collection Zones (`type: "collectionZone"`) and Despawn Zones (`type: "despawnZone"`)

Both use:

```jsonc
{
  "size": { "x": 2, "y": 2, "z": 2 }, // m, each 0.5–20
}
```

## Camera State (`camera`)

```jsonc
{
  "position": { "x": 18, "y": 14, "z": 18 }, // m
  "target": { "x": 0, "y": 0, "z": 0 }, // orbit target, m
}
```

## File Version and Migration Strategy

- `fileVersion` is read **before** any other validation. Missing/non-integer → hard error.
- `fileVersion` newer than the app supports → error "This layout was saved by a newer version" (no forward compatibility).
- Older versions are migrated stepwise: `migrateV1toV2`, `migrateV2toV3`, `migrateV3toV4`, `migrateV4toV5`, … each a pure function in `src/serialization/migrations.ts`, unit-tested with a frozen fixture of each historical version.
- Schema validation runs **after** migration, against the current version's schema.
- Any addition/removal/semantic change to the format requires: bump `fileVersion`, add a migration, update this document + schema + sample layout, add a `CHANGELOG.md` entry under "Breaking save-format changes".

## Example JSON Layout

See [`examples/sample-layout.json`](../examples/sample-layout.json) — a spawner feeding flat + inclined conveyors into a collection zone. The sample is validated against the schema in unit tests, so it cannot silently drift out of date.
