# UI / UX Specification

Screen layout, interaction workflows, and input behaviour. Dark theme by default; desktop mouse-and-keyboard only (mobile is out of scope, see `PRODUCT_SCOPE.md`).

## Overall Screen Layout

```text
┌────────────────────────────────────────────────────────────────────┐
│ TOP TOOLBAR:  [Logo] [New] [Load] [Save]   [▶ Play/⏸ Pause] [⟲ Reset]│
│               [Grid snap ✓]                    [Stats summary] [?] │
├──────────────┬────────────────────────────────────┬────────────────┤
│ ELEMENT      │                                    │ PROPERTIES     │
│ LIBRARY      │                                    │ PANEL          │
│              │           3D VIEWPORT              │                │
│ ▷ Conveyor   │      (React Three Fiber canvas)    │ (selected      │
│ ▷ Elevator   │                                    │  element's     │
│ ▷ Spawner    │                                    │  editable      │
│ ▷ Collection │                                    │  properties)   │
│ ▷ Despawn    │                                    │                │
│              │                                    │                │
├──────────────┴────────────────────────────────────┴────────────────┤
│ STATUS BAR: Active crops 812/2000 · In 42.0 t/h · Out 39.5 t/h ·   │
│             Spilled 5.9 % · 60 FPS                                  │
└────────────────────────────────────────────────────────────────────┘
```

- Left panel ~240 px, right panel ~300 px, both collapsible; viewport takes the remainder.
- Layout is a CSS grid in `src/app`; panels are plain React components (no UI framework dependency; small hand-rolled styles).

## Left-Hand Element Library

- Vertical list of placeable element types: icon/thumbnail, label.
- Clicking an entry enters **placement mode** for that type (entry shows an active highlight).
- Disabled entries (not yet implemented) render greyed with a "coming soon" tooltip rather than being hidden, so the roadmap is visible in the product.

## Properties Panel (right)

- Empty state (nothing selected): short hint text — "Select an element to edit its properties, or choose one from the library to place."
- With a selection: element name (editable text field), element type (read-only), position X/Z (numeric, metres), rotation (degrees), then type-specific fields (e.g. conveyor: length, width, belt height, incline, belt speed, skirts toggle).
- Numeric fields: commit on Enter/blur; invalid input reverts to the last valid value and flashes the field border red with the constraint as inline text (e.g. "0 – 300 m/min").
- Footer buttons: **Duplicate** and **Delete**.

## Top Toolbar

- **File group**: New (confirm if scene non-empty), Load (file picker; drag-drop onto window also works), Save (downloads `<scene-name>.json`).
- **Simulation group**: Play/Pause toggle, Reset (despawns all crops, zeroes statistics; layout untouched).
- **View group**: Grid-snap toggle (default on, 0.5 m), Help (?) opening a keyboard-shortcut overlay.

## Scene Statistics

- Status bar (always visible): active crop count vs cap, throughput in, throughput collected, spill %, FPS.
- Values update at ~4 Hz. Throughputs are rolling 10-second windows. A "THROTTLED" badge appears in amber when spawners are being limited by the crop cap.

## Selection Behaviour

- Click an element in the viewport to select it (raycast against element meshes; crops are not selectable).
- Selected element gets an emissive/outline highlight and populates the properties panel.
- Click empty ground or press Escape to deselect. Only single selection in the current version.

## Placement Workflow

1. Click a library entry → placement mode. A translucent ghost of the element follows the mouse over the ground plane (snapped if grid snap on).
2. Invalid drop positions (outside the 100 m × 100 m build area) tint the ghost red; clicking there does nothing.
3. Click to place → element is created with defaults, placement mode ends, new element becomes selected.
4. Escape or right-click cancels placement.
5. Hold Shift while clicking to place repeatedly without leaving placement mode.

## Transform Controls

- Move: drag the selected element along the ground plane (XZ). Y is derived per element type; free vertical dragging is not offered.
- Rotate: `R`/`Shift+R` rotates the selection ±15° (or ±1° with grid snap off); the properties panel accepts exact degrees.
- No 3D gizmo in the first version — dragging plus numeric entry covers the use cases; a drei `TransformControls` gizmo is a candidate enhancement.

## Grid Snapping

- Toggle in toolbar, default **on**. Position snap 0.5 m, rotation snap 15°.
- Snapping applies during placement and dragging; numeric entry in the properties panel is never snapped.

## Camera Controls

- drei `OrbitControls`: left-drag orbit, right-drag pan, wheel zoom.
- Pan/zoom limits keep the target within the build area and distance within 2–150 m; camera cannot go below y = 0.5 m.
- Initial view: from (18, 14, 18) looking at the origin. Camera pose is saved in layout files and restored on load.
- While dragging an element, camera drag is suppressed (element drag wins).

## Input Validation

- All numeric properties clamp to the documented ranges (see `PRODUCT_SCOPE.md` / `DOMAIN_MODEL.md`) at the UI edge; the store never holds out-of-range values.
- Ranges shown inline when a field is focused or rejected.
- Scene name: 1–64 characters, no validation beyond length (it becomes the default save filename, sanitised at download time).

## Error Messages

- Load failure: modal dialog "Couldn't load layout", bulleted list of problems (JSON path + message), current scene untouched, single **Close** button.
- WASM/WebGL unavailable: full-screen replacement panel stating the requirement and suggesting a modern desktop browser.
- Unexpected component crash: error boundary panel with a "Reload app" button; the other panels stay alive where possible.

## Empty States

- Fresh scene: viewport shows the grid plus a centred hint "Choose an element from the library to start building"; the hint disappears at first placement.
- Properties panel and statistics have their own empty/zero states as described above.

## Keyboard Shortcuts

| Key                    | Action                                             |
| ---------------------- | -------------------------------------------------- |
| `Space`                | Play / pause simulation                            |
| `Escape`               | Cancel placement / deselect                        |
| `Delete` / `Backspace` | Delete selected element                            |
| `Ctrl+D`               | Duplicate selected element                         |
| `R` / `Shift+R`        | Rotate selection +15° / −15°                       |
| `G`                    | Toggle grid snap                                   |
| `Ctrl+S`               | Save layout                                        |
| `Ctrl+O`               | Load layout                                        |
| `F`                    | Frame camera on selection (or whole scene if none) |
| `?`                    | Shortcut overlay                                   |

Shortcuts are suppressed while a text/number input has focus. `Ctrl+S`/`Ctrl+O` call `preventDefault` to override the browser.

## Accessibility Considerations

- All panel controls are native HTML inputs/buttons: keyboard focusable, visible focus rings, proper `label` associations.
- Toolbar buttons have `aria-label`s and tooltips; icon-only buttons never lack text alternatives.
- Colour is never the only signal (throttled badge has text, invalid fields get inline messages).
- Contrast target WCAG AA for panel text.
- The 3D viewport itself is inherently visual; the statistics bar and properties panel expose the scene state textually, which is the practical accessibility surface for this app. Full screen-reader operation of 3D editing is out of scope (recorded in `PRODUCT_SCOPE.md` exclusions).
