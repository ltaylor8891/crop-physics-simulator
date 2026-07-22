# Product Scope

This file is the **authoritative functional scope** of the Crop Physics Simulator. If another document or the implementation disagrees with this file, this file wins until it is deliberately amended (record the change in `docs/DECISIONS.md`).

## Overall Product Objective

Provide a browser-based 3D sandbox in which a user assembles a crop-handling line from parameterised equipment (conveyors, elevators, spawners, collection zones) and observes individual crop bodies flowing through it in real time, with live throughput statistics. The goal is visual, interactive sanity-checking of layout geometry and throughput — not certified engineering analysis.

## Intended Users

- Agricultural equipment planners sketching intake/handling lines
- Farm managers evaluating conveyor/elevator arrangements
- Equipment vendors demonstrating configurations to customers
- Hobbyists and students exploring bulk material flow

Assume a desktop browser, mouse-and-keyboard interaction, and no prior 3D-software experience.

## Primary Use Cases

1. **Sketch a line** — place a spawner over a conveyor, chain conveyors and an elevator to a collection zone, and confirm crops travel end to end without spilling.
2. **Tune throughput** — set a spawner to a target tonnes-per-hour figure and check whether the configured belts keep up or overflow.
3. **Check transfer points** — visually inspect drop heights and alignment between one machine's discharge and the next machine's intake.
4. **Save and share** — save a layout as a JSON file and reopen it later or on another machine.

## Element Library Requirements

- A left-hand panel lists all placeable element types with name and icon/thumbnail.
- Initial element types: **flat belt conveyor**, **inclined belt conveyor** (same element with pitch), **bucket elevator**, **crop spawner**, **collection zone**.
- Placement: click an element in the library, then click a position on the ground plane (or on top of an existing element) to place it. Escape cancels placement.
- Every placed element gets a unique stable ID and sensible default dimensions/properties.
- Placed elements can be selected, moved, rotated (yaw), reconfigured, duplicated, and deleted.

## Conveyor Requirements

- Box-like belt geometry defined by **length**, **width**, and **belt height above ground**, plus optional **incline angle** (pitch about the belt's transverse axis, −30° to +30°).
- Configurable **belt speed** in metres per minute (0–300 m/min), applied as contact surface velocity along the belt's forward axis.
- Optional low side-skirts (visual + collider walls) to reduce side spillage; on by default.
- Belt direction is visually indicated (arrow texture or chevron markers).
- Crops resting on the belt move at belt speed; crops must not fall through the belt at any supported speed.

## Elevator Requirements

- Bucket elevator abstracted as a vertical transport column: **intake zone** at the base, **discharge point** at the top, defined by height (1–30 m) and footprint.
- Crops entering the intake volume are transported upward and re-emitted at the discharge with a configurable **discharge rate cap** (t/h) and initial horizontal velocity. Individual buckets are **not** physically simulated (see PHYSICS_SPECIFICATION).
- Elevator has a configurable transport delay derived from height and a fixed transport speed (default 2 m/s).
- Crops in transit are hidden from the scene and counted in statistics as "in elevator".

## Crop Spawning Requirements

- Spawner is a placeable box volume with a downward-facing emission face.
- Configurable: **crop type** (from a small preset list, e.g. wheat-like sphere, potato-like capsule, sugar-beet-like larger body), **throughput** in tonnes per hour (0.1–500 t/h), **enabled/disabled**, **size distribution** (diameter range + bias, length-as-%-of-diameter range + bias), and **density** (kg/m³).
- Mass throughput is realised with a kg-credit accumulator: each spawn samples size → volume → mass (`ρV`); long-run average t/h matches the target. Variable mass does not require scanning all active bodies.
- Spawned crops get small random jitter in position and velocity so they do not stack in a perfect column.
- Spawning pauses automatically when the active-body cap is reached and resumes when capacity frees up (this is recorded in statistics as "throttled").

## Crop Physics Requirements

- Each crop is an individual rigid body with sampled size, mass from density×volume, and friction/restitution from its crop type.
- Crops collide with machines and with each other.
- Crops are affected by gravity (9.81 m/s² downward).
- Crops on a moving belt travel with the belt via contact surface velocity.
- A hard cap on simultaneously active crop bodies (default 2 000) protects frame rate; bodies come from an object pool.

## Floor Despawn Behaviour

- The ground plane is a despawn surface. When a crop first contacts the floor, a 3-second timer starts; when it expires the crop is removed and returned to the pool.
- Removed-by-floor crops are counted as **spilled mass** in statistics.
- Additional user-placed despawn zones (box volumes) behave the same way but with immediate despawn.

## Scene Statistics

Displayed live in the UI:

- Active crop count (and pool cap)
- Total mass spawned (t)
- Throughput in (t/h, rolling 10 s window)
- Throughput collected (t/h, rolling window, per collection zone and total)
- Spilled mass (t) and spill percentage
- Physics step time / FPS indicator
- Spawner throttled indicator

## Save and Load Requirements

- Entire layout (elements, properties, simulation settings, camera pose) serialises to a single versioned JSON file. Format: `docs/SAVE_FILE_FORMAT.md`, schema: `schemas/layout.schema.json`.
- Save = download a `.json` file; Load = file picker (and drag-and-drop onto the window).
- Loading validates against the schema and reports human-readable errors; a failed load never corrupts the current scene.
- In-flight crops are **not** saved; loading starts with an empty crop population.

## Performance Expectations

- 60 FPS target with 1 000 active crops on a mid-range desktop (integrated GPU acceptable); graceful degradation to 30 FPS at the 2 000-crop cap.
- Physics runs on a fixed timestep decoupled from render rate.
- Crop rendering uses instanced meshes (one draw call per crop type).

## Future Expansion Ideas (not in current scope)

- Additional equipment: augers/screw conveyors, chutes, hoppers, grain pits, curved conveyors, trucks
- Crop mixing/segregation visualisation, moisture/damage modelling
- Undo/redo history
- Multi-user shared layouts, cloud storage
- Mobile/touch support
- Export of statistics to CSV

## Explicitly Excluded from the Current Version

- Any server-side component, accounts, or persistence beyond local JSON files
- Validated engineering output (structural loads, power consumption, certified capacities)
- Deformable/granular DEM simulation of crops
- Individual bucket simulation inside elevators
- Undo/redo
- Touch/mobile UI
- Localisation (English only)
