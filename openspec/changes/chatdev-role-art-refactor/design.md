## Context

ChatDev's legacy role art uses compact chibi professionals with oversized heads, strong hair silhouettes, role-specific outfits, and clear occupational cues. The app should borrow those principles, not the actual assets. Our runtime debate roles remain Bull, Bear, Engineer, and Moderator, but their visual archetypes can map to a software-company cast.

## Goals / Non-Goals

**Goals:**

- Make each character visually distinct at stage scale.
- Use software-company archetypes: growth CEO, risk reviewer, systems programmer, and coordination lead.
- Keep sprites generated from code for easy iteration and originality.
- Preserve existing animation states: idle, queued, speaking, done, error.

**Non-Goals:**

- Do not import, trace, or package ChatDev PNG files.
- Do not change role prompts or debate semantics.
- Do not introduce external art dependencies.

## Decisions

1. Increase generated sprite frame size from 32x48 to 40x56.
   - Rationale: the current canvas is too small for hair, outfit, accessory, and expression details.
   - Alternative considered: keep 32x48 and add CSS badges. Rejected because the actual figure would still read generic.

2. Keep a single generated sprite sheet with four rows and twelve columns.
   - Rationale: the existing animation pipeline already works and tests cover frame bounds.
   - Alternative considered: one SVG per role. Rejected because it complicates the animator with no product benefit.

3. Add role art metadata to `RoleDefinition`.
   - Rationale: the visual archetype should be explicit and testable, not encoded only inside CSS or sprite code.
   - Alternative considered: derive titles in the component. Rejected because duplicated mapping would drift.

4. Use role-specific accessory pixels.
   - Rationale: ChatDev-like role art depends on recognizable profession cues, not just color.
   - Alternative considered: only change hair colors. Rejected as too shallow.

## Risks / Trade-offs

- Larger sprites may overlap speech bubbles → keep character width stable and tune viewport dimensions.
- Generated SVG can become verbose → localize sprite primitives in `generate-pixel-assets.mjs`.
- Similarity to ChatDev could become too literal → use original palettes and role mapping, avoid copying exact silhouettes or image files.
