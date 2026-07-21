# Known Issues

Current bugs, incomplete features, limitations, and technical debt. Keep this honest — an issue listed here is better than an issue discovered by the next agent. Severities: **Critical / High / Medium / Low**.

## Open Issues

### KI-001 — Most product features not yet implemented

- **Description**: Stages 4–15 of the roadmap (element placement, conveyor rendering/physics, spawning, crop physics, despawn, elevators, save/load, statistics) are designed but not built. The app currently shows the panel shell and an interactive empty 3D scene.
- **Severity**: High (expected at this phase, not a defect)
- **Reproduction**: Run the app; the element library entries are disabled placeholders.
- **Suspected cause**: n/a — project phase.
- **Proposed resolution**: Proceed through `docs/ROADMAP.md` Stage 4 onwards.
- **Status**: Open (by design)

### KI-002 — Contact surface velocity mechanism unverified in bound Rapier version

- **Description**: ADR-006 selects contact surface velocity for belts, but whether `@react-three/rapier`'s bound Rapier version exposes it directly (vs needing a per-step contact-pair workaround) has not been verified in code.
- **Severity**: Medium (blocks Stage 6 design detail, not current work)
- **Reproduction**: n/a (research task)
- **Suspected cause**: Binding library lags the raw Rapier API.
- **Proposed resolution**: At Stage 6 start, spike both approaches; record the outcome in ADR-006's consequences and `PHYSICS_SPECIFICATION.md`.
- **Status**: Open

### KI-003 — No browser-based automated tests

- **Description**: Rendering and physics behaviour are only verifiable manually; CI covers pure logic, types, lint, and build.
- **Severity**: Low (accepted trade-off, see TECHNICAL_DESIGN §Testing)
- **Proposed resolution**: Consider Playwright smoke tests around Stage 15.
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
