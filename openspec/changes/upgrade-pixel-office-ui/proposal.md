## Why

The current desktop UI proves the Codex OAuth workflow, but it does not meet the visual density, spatial believability, and interaction polish implied by the PixelHQ reference. The app needs a production-grade interface that combines an original pixel-office scene with modern enterprise UI standards from Microsoft Fluent, Google Material, and ByteDance design practices.

## What Changes

- Replace the simple grid/table scene with an original pixel-office environment: wall band, tiled floor, workstations, monitors, whiteboards, shelving, plants, lounge area, and role-specific desks.
- Rework the application shell into a polished three-pane productivity layout with a compact left control rail, a large inspectable pixel stage, and a readable right debate log.
- Add visual state hierarchy for AI activity: queued, speaking, done, error, elapsed time, output density, and status badges.
- Improve spacing, typography, contrast, focus states, scroll behavior, and responsive behavior to align with modern desktop UI heuristics.
- Preserve the existing Codex OAuth backend and debate orchestration; this change is UI/UX only.

## Capabilities

### New Capabilities
- `pixel-office-interface`: Original pixel-office stage and desktop shell quality requirements for the debate app.

### Modified Capabilities

## Impact

- Affected frontend files: `src/App.tsx`, `src/components/PixelCharacter.tsx`, `src/components/TranscriptPanel.tsx`, `src/styles/app.css`.
- Affected desktop packaging only through rebuild output; Electron backend behavior should remain unchanged.
- No API, auth, or Codex OAuth behavior changes.
