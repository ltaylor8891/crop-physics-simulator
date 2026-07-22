# Known Issues

Current bugs, incomplete features, limitations, and technical debt. Keep this honest — an issue listed here is better than an issue discovered by the next agent. Severities: **Critical / High / Medium / Low**.

## Open Issues

### KI-001 — Most product features not yet implemented

- **Description**: Stages 14–15 of the roadmap (performance, release) are designed but not fully built. Stages 1–13 are in place.
- **Severity**: High (expected at this phase, not a defect)
- **Reproduction**: Stage 14 FPS targets on mid-range hardware still need a hand-check.
- **Suspected cause**: n/a — project phase.
- **Proposed resolution**: Proceed through `docs/ROADMAP.md` Stage 14 onwards.
- **Status**: Open (by design)

### KI-002 — Contact surface velocity mechanism unverified in bound Rapier version

- **Description**: ADR-006 selects contact surface velocity for belts, but whether `@react-three/rapier`'s bound Rapier version exposes it directly (vs needing a per-step contact-pair workaround) has not been verified in code.
- **Severity**: Medium (blocks Stage 6 design detail, not current work)
- **Reproduction**: n/a (research task)
- **Suspected cause**: Binding library lags the raw Rapier API.
- **Proposed resolution**: At Stage 6 start, spike both approaches; record the outcome in ADR-006's consequences and `PHYSICS_SPECIFICATION.md`.
- **Status**: Closed — no contact-surface-velocity API; Stage 6 used kinematic-velocity + pin; revised to fixed collider + per-step contact velocity injection (ADR-016) after m/min accuracy feedback.

### KI-003 — No browser-based automated tests

- **Description**: Rendering and physics behaviour are only verifiable manually; CI covers pure logic, types, lint, and build.
- **Severity**: Low (accepted trade-off, see TECHNICAL_DESIGN §Testing)
- **Proposed resolution**: Consider Playwright smoke tests around Stage 15.
- **Status**: Open

### KI-004 — Drag-move and some shortcuts not yet hand-verified

- **Description**: Element drag-move (pointer capture, ground-ray following, build-area clamping) is implemented and its pure helpers are unit-tested, but it has not been exercised by hand in a browser; automated pointer-drag on the canvas was not possible with the available tooling. The `F` (frame camera on selection) and `?` (shortcut overlay) shortcuts from `UI_UX_SPECIFICATION.md` are not implemented yet.
- **Severity**: Low
- **Reproduction**: n/a — verification gap, not an observed defect.
- **Proposed resolution**: Manually drag elements when next running the app (expected: element follows pointer on XZ, snaps at 0.5 m, camera stays still); implement `F` and `?` with the Stage 7 UI work.
- **Status**: Open

### KI-005 — Stage 6 belt conveyance needs interactive hand-check

- **Description**: Conveyor physics is implemented and unit-tested for velocity/orientation maths, but carrying a dropped ball to discharge on flat and ±20° belts has not been confirmed live in this session (browser automation unavailable).
- **Severity**: Medium
- **Reproduction**: `npm run dev` → place/select a conveyor → Play → Drop ball; confirm the ball rides to the discharge end. Repeat with incline ±20° and with belt speed 0 (ball should stay).
- **Suspected cause**: n/a — verification gap.
- **Proposed resolution**: Hand-check while starting Stage 7; note any defects here.
- **Status**: Open

## Physics Inaccuracies (by design — see PHYSICS_SPECIFICATION)

- Crops are rigid convex bodies (balls/capsules); no deformation, breakage, or realistic grain interlocking.
- Elevators teleport crops with a delay; no internal bucket simulation, jamming, or internal spillage.
- Friction/restitution values are plausible defaults, not measured material properties.
- Runs are not reproducible in detail across machines (catch-up stepping varies with frame timing).

## Browser-Specific Issues

- None recorded yet. WebGL 2 + WASM are hard requirements (documented in README); Safari < 16 is unsupported.

## Technical Debt

- None recorded yet beyond the open issues above.

## Closed Issues

- None yet.
