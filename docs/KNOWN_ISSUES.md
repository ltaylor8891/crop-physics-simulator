# Known Issues

Current bugs, incomplete features, limitations, and technical debt. Keep this honest — an issue listed here is better than an issue discovered by the next agent. Severities: **Critical / High / Medium / Low**.

## Open Issues

### KI-001 — Most product features not yet implemented

- **Description**: Stages 14–15 of the roadmap (performance, release) are designed but not fully built. Stages 1–13 are in place (elevators temporarily withdrawn from UI — see KI-007).
- **Severity**: High (expected at this phase, not a defect)
- **Reproduction**: Stage 14 FPS targets on mid-range hardware still need a hand-check.
- **Suspected cause**: n/a — project phase.
- **Proposed resolution**: Proceed through `docs/ROADMAP.md` Stage 14 onwards.
- **Status**: Open (by design)

### KI-007 — Bucket elevators temporarily unavailable

- **Description**: Elevators are hidden from the library, stripped from saves (`fileVersion` 3), and not simulated. Stage 11 implementation remains in the repo (`TEMPORARILY_DISABLED_ELEMENT_TYPES`).
- **Severity**: Medium (intentional product pause)
- **Proposed resolution**: Clear `TEMPORARILY_DISABLED_ELEMENT_TYPES`, restore schema elevator branch (new `fileVersion`), re-wire UI when re-enabling.
- **Status**: Open (by design)

### KI-008 — Crops never spawned in production builds (misdiagnosed as missing WASM)

- **Description**: In production builds (deployed or `vite preview`), Play showed **PHYSICS LOADING…** forever and active crops stayed 0 while UI/FPS worked. Originally diagnosed as `rapier_wasm3d_bg.wasm` missing from `dist/assets/`; that was wrong — `@dimforge/rapier3d-compat` embeds the WASM as base64 and never fetches it.
- **Severity**: High (broke taynium.com/simulation-app deploy)
- **Actual cause**: React runs child effects before parent effects. `CropTypePool` effects bound all crop bodies, then the parent `CropBodies` effect called `cropRuntime.configure()`, whose reset condition wiped every bucket. Dev never showed it because StrictMode's second effect pass re-bound into the already-configured buckets.
- **Resolution**: `configure()` resets only on a real capacity change and is called inside each pool's bind effect before binding (regression-tested in `src/simulation/cropRuntime.test.ts`). Verified live against `vite preview`: crops spawn at the configured t/h. The WASM copy step in `npm run build` is retained but believed unnecessary.
- **Status**: Closed (root cause fixed 2026-07-22)

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

### KI-004 — `F` and `?` shortcuts not implemented

- **Description**: The `F` (frame camera on selection) and `?` (shortcut overlay) shortcuts from `UI_UX_SPECIFICATION.md` are not implemented. (Drag-move itself is hand-verified — see Closed Issues.)
- **Severity**: Low
- **Proposed resolution**: Implement alongside the next UI pass.
- **Status**: Open

### KI-005 — Stage 6 belt conveyance needs interactive hand-check

- **Description**: Conveyor physics is implemented and unit-tested for velocity/orientation maths; carrying crops to discharge and responding to speed changes had not been confirmed live.
- **Severity**: Medium
- **Status**: Closed — verified 2026-07-23 by the user's own extended session (~8 hours) repeatedly repositioning conveyors and changing belt speeds with crops actively conveying, no issues observed. This is real-world use rather than the scripted ±20°-incline matrix originally proposed; re-open if incline-specific edge cases surface.

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

Closed issues are kept in place above with **Status: Closed** for their diagnostic history: KI-002 (contact surface velocity — resolved via ADR-016), KI-005 (belt conveyance — verified by extended real-world use), KI-008 (production crops never spawned — pool reset ordering, originally misdiagnosed as missing WASM).
