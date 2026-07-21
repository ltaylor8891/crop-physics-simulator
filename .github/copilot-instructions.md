# GitHub Copilot Instructions

All agent instructions for this repository live in [`AGENTS.md`](../AGENTS.md) — follow it; do not duplicate rules here.

Key constraints (see `AGENTS.md` and `docs/` for detail):

- 1 world unit = 1 metre, Y-up, element flow along local +X, yaw in radians; SI units internally.
- TypeScript strict; pure logic in `src/utilities`/`src/serialization` with unit tests; no React/three/Rapier imports in those layers.
- Simulation logic on the fixed physics timestep, never render frames; Zustand stores hold plain serialisable data only.
- Don't reverse ADRs in `docs/DECISIONS.md` without adding a superseding record; update `docs/AGENT_HANDOFF.md` before finishing a session.
