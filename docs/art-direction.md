# AI War Room Art Direction

This project uses fully original generated assets. It does not copy PixelHQ, paid packs, open-source packs, or third-party images.

## Direction

- Theme: AI war room for adversarial multi-agent decision support.
- Mood: calm, tactical, product-grade, readable under repeated desktop use.
- Core objects: glass conference table, tactical data wall, role stations, status lights, translucent verification panels.
- Interaction mood: desktop agent workspace, local runtime evidence, compact status strips, copyable artifacts.
- Rendering rule: geometry, material, and lighting are separate. Do not bake heavy shadows or scene lighting into atlas textures.

## Prompt Language

Positive anchors:

- AI war room
- glass conference table
- calm product-grade interface
- tactical data wall
- translucent verification panel
- deterministic generated asset pack
- agent-native desktop console
- visible run evidence

Negative anchors:

- cheap pixel art
- baked messy lighting
- random cartoon
- overdecorated fantasy UI
- inconsistent asset scale
- tile seams caused by baked light
- copied app assets

## Workflow Rules

- Make a structure sketch before asset generation.
- Generate unit assets first, then compose the scene.
- Name every asset in `asset-manifest.json`.
- Keep atlas generation deterministic with a fixed seed.
- Treat AI output as candidates; the project accepts only assets that pass manifest, build, and visual checks.
