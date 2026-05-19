## Why

The app now has a usable desktop prototype, but future changes still depend on ad hoc judgment. We need a repeatable iteration loop that turns product goals into OpenSpec-scoped work, compares candidate changes with measurable gates, and records why a version is accepted or rejected.

## What Changes

- Add a ChatDev-inspired role workflow for version planning, implementation, review, and acceptance.
- Add OpenSpec as the required control point for every non-trivial product iteration.
- Add OpenEvolve-compatible evaluation scaffolding for candidate UI/product changes without directly mutating the app by default.
- Add local iteration scripts for scanning status, scoring the current version, recording ledger entries, and running the acceptance gate.
- Document how to move from an idea to a candidate, score it, apply the winning change, and ship a desktop build.

## Capabilities

### New Capabilities

- `iteration-control-loop`: Defines version iteration governance, role handoffs, OpenSpec gate requirements, OpenEvolve candidate evaluation, and ledger requirements.

### Modified Capabilities

- None.

## Impact

- Adds iteration-control documentation under `iteration/`.
- Adds Node/Python helper scripts under `scripts/`.
- Adds npm scripts for scan, score, record, and gate flows.
- Adds OpenEvolve experiment scaffolding under `openevolve/`.
- Does not change the Codex OAuth bridge, debate runtime, Electron packaging behavior, or current UI functionality.
