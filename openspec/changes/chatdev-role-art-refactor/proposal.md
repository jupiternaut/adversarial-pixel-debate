## Why

The current role sprites are functional but too generic: same body shape, simple recolor, weak role identity. The app needs ChatDev-like role art where each agent reads as a distinct member of a virtual software company while remaining original and aligned with the debate roles.

## What Changes

- Refactor generated role sprites into larger chibi-style professional characters with distinct hair, outfit, accessory, and badge details.
- Add role art metadata so the UI can show each role's software-company archetype.
- Update character name plates and speech bubbles to reinforce the ChatDev-like role identity.
- Keep all assets generated locally as original SVG sprites; do not copy ChatDev image files.

## Capabilities

### New Capabilities

- `chatdev-role-art`: Defines role-art requirements for ChatDev-inspired professional pixel characters.

### Modified Capabilities

- None.

## Impact

- Updates generated sprite asset dimensions and drawing logic.
- Updates role metadata in `shared/debate.ts`.
- Updates `PixelCharacter` and CSS for larger, more expressive sprites and role badges.
- Adds focused tests for role art metadata.
- No backend, OAuth, prompt, or Electron packaging behavior changes.
