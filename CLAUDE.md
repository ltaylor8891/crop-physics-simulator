# Claude Code Instructions

All agent instructions for this repository live in [`AGENTS.md`](AGENTS.md) — read it first and follow it fully. Do not maintain a separate version of the rules here.

Quick orientation:

- Authoritative scope: `docs/PRODUCT_SCOPE.md` · Architecture: `docs/TECHNICAL_DESIGN.md` · Settled decisions: `docs/DECISIONS.md` · Current state and next task: `docs/AGENT_HANDOFF.md`.
- Verify with `npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build` (the full CI gate) before finishing, and update `docs/AGENT_HANDOFF.md` before handing over.
